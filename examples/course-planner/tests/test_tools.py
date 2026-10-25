"""Tool tests. They read the real data/ files and need no LLM or network."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools import build_schedule, check_prerequisites, normalize_code, search_catalog  # noqa: E402


def test_normalize_code_accepts_loose_spacing_and_case():
    assert normalize_code("cse340") == "CSE 340"
    assert normalize_code(" CSE  340 ") == "CSE 340"


def test_search_by_code_returns_every_section():
    result = search_catalog.invoke({"query": "CSE 340"})
    assert {s["section_id"] for s in result["sections"]} == {"CSE340-01", "CSE340-02"}


def test_search_earliest_start_drops_early_sections():
    result = search_catalog.invoke({"query": "CSE 340", "earliest_start": "10:00"})
    assert [s["section_id"] for s in result["sections"]] == ["CSE340-01"]


def test_search_by_tag_and_days():
    result = search_catalog.invoke({"query": "ai", "days": ["Tue", "Thu"]})
    assert {s["code"] for s in result["sections"]} == {"CSE 471", "CSE 475"}


def test_search_with_no_matches_returns_error_result():
    result = search_catalog.invoke({"query": "underwater basket weaving"})
    assert result["sections"] == []
    assert "error" in result


def test_prerequisites_met():
    assert check_prerequisites.invoke({"course_code": "CSE 340"}) == {
        "course_code": "CSE 340", "met": True, "missing": [],
    }


def test_prerequisites_missing():
    result = check_prerequisites.invoke({"course_code": "cse434"})
    assert result["met"] is False
    assert result["missing"] == ["CSE 365", "CSE 414"]


def test_prerequisites_unknown_course():
    result = check_prerequisites.invoke({"course_code": "CSE 999"})
    assert result["met"] is False
    assert "error" in result


def test_build_schedule_success():
    result = build_schedule.invoke({"section_ids": ["CSE340-01", "CSE365-01", "CSE471-02"]})
    assert result["ok"] is True
    assert result["total_credits"] == 9
    assert result["week"]["Tue"] == ["10:30-11:45 CSE 340 (CSE340-01)", "13:30-14:45 CSE 471 (CSE471-02)"]


def test_build_schedule_reports_overlap():
    result = build_schedule.invoke({"section_ids": ["CSE340-01", "CSE412-01"]})
    assert result["ok"] is False
    assert "overlaps" in result["conflicts"][0]
    assert "Tue, Thu" in result["conflicts"][0]


def test_build_schedule_back_to_back_is_not_a_conflict():
    # CSE355-01 ends 13:15 and CSE365-01 starts 13:30 on the same days.
    assert build_schedule.invoke({"section_ids": ["CSE355-01", "CSE365-01"]})["ok"] is True


def test_build_schedule_credit_limit():
    sections = ["CSE340-01", "CSE355-01", "CSE365-02", "CSE408-01", "CSE414-01",
                "CSE445-01", "CSE460-01"]
    result = build_schedule.invoke({"section_ids": sections})
    assert result["ok"] is False
    assert any("exceed" in problem for problem in result["conflicts"])


def test_build_schedule_unknown_section():
    result = build_schedule.invoke({"section_ids": ["CSE340-99"]})
    assert result["ok"] is False
    assert "CSE340-99" in result["error"]

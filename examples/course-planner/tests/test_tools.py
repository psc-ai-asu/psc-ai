"""Tool tests. They read the real data/ files and need no LLM or network."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools import build_schedule, check_prerequisites, normalize_code, search_catalog  # noqa: E402


def test_normalize_code_accepts_loose_spacing_and_case():
    assert normalize_code("cs336") == "CS 336"
    assert normalize_code(" MATH  263 ") == "MATH 263"


def test_search_by_code_returns_every_section():
    result = search_catalog.invoke({"query": "CS 336"})
    assert {s["section_id"] for s in result["sections"]} == {"CS336-01", "CS336-02"}


def test_search_earliest_start_drops_early_sections():
    result = search_catalog.invoke({"query": "CS 336", "earliest_start": "10:00"})
    assert [s["section_id"] for s in result["sections"]] == ["CS336-01"]


def test_search_by_tag_and_days():
    result = search_catalog.invoke({"query": "elective", "days": ["Tue", "Thu"]})
    assert {s["code"] for s in result["sections"]} == {"CS 284", "CS 418", "MATH 341"}


def test_search_with_no_matches_returns_error_result():
    result = search_catalog.invoke({"query": "underwater basket weaving"})
    assert result["sections"] == []
    assert "error" in result


def test_prerequisites_met():
    assert check_prerequisites.invoke({"course_code": "CS 336"}) == {
        "course_code": "CS 336", "met": True, "missing": [],
    }


def test_prerequisites_missing():
    result = check_prerequisites.invoke({"course_code": "math452"})
    assert result["met"] is False
    assert result["missing"] == ["MATH 263", "MATH 341"]


def test_prerequisites_unknown_course():
    result = check_prerequisites.invoke({"course_code": "CS 999"})
    assert result["met"] is False
    assert "error" in result


def test_build_schedule_success():
    result = build_schedule.invoke({"section_ids": ["CS336-01", "CS284-01", "CS418-02"]})
    assert result["ok"] is True
    assert result["total_credits"] == 9
    assert result["week"]["Tue"] == ["10:30-11:45 CS 336 (CS336-01)", "16:30-17:45 CS 418 (CS418-02)"]


def test_build_schedule_reports_overlap():
    result = build_schedule.invoke({"section_ids": ["CS336-02", "MATH263-01"]})
    assert result["ok"] is False
    assert "overlaps" in result["conflicts"][0]
    assert "Mon, Wed" in result["conflicts"][0]


def test_build_schedule_back_to_back_is_not_a_conflict():
    # MATH307-01 ends 13:15 and CS418-01 starts 13:30 on the same days.
    assert build_schedule.invoke({"section_ids": ["MATH307-01", "CS418-01"]})["ok"] is True


def test_build_schedule_credit_limit():
    sections = ["CS229-01", "CS284-01", "CS336-01", "CS418-01", "MATH263-02",
                "MATH341-01", "MATH452-01"]
    result = build_schedule.invoke({"section_ids": sections})
    assert result["ok"] is False
    assert any("exceed" in problem for problem in result["conflicts"])


def test_build_schedule_unknown_section():
    result = build_schedule.invoke({"section_ids": ["CS336-99"]})
    assert result["ok"] is False
    assert "CS336-99" in result["error"]

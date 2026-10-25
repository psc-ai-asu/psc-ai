"""The course planner's three tools.

Each tool reads the local JSON in data/ and returns a small dict. Problems the
model can recover from (no matches, missing prerequisites, conflicts) come back
as results with an "error" or "met": false rather than exceptions, so the
agent can react and the tool span still shows what happened.
"""

import json
from functools import cache
from pathlib import Path

from langchain_core.tools import tool

DATA_DIR = Path(__file__).parent / "data"
DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"]
MAX_SEARCH_RESULTS = 6


@cache
def load_catalog():
    return json.loads((DATA_DIR / "catalog.json").read_text())


@cache
def load_student():
    return json.loads((DATA_DIR / "student.json").read_text())


def normalize_code(code):
    # "cse340", "CSE 340" and " cse  340 " all become "CSE 340"
    compact = "".join(code.split()).upper()
    letters = compact.rstrip("0123456789")
    return f"{letters} {compact[len(letters):]}"


def to_minutes(hhmm):
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def section_summary(section):
    return {key: section[key] for key in ("section_id", "code", "title", "credits", "days", "start", "end")}


@tool
def search_catalog(query: str, earliest_start: str | None = None, days: list[str] | None = None) -> dict:
    """Search the course catalog for sections. Use this to find sections of a
    specific course (query is a course code like "CSE 340") or to discover
    courses by keyword or tag (e.g. "elective", "security", "ai").

    earliest_start filters out sections starting before a 24-hour "HH:MM" time
    (e.g. "10:00"). days keeps only sections that meet exclusively on those days
    (e.g. ["Mon", "Wed"]).
    """
    needle = query.strip().lower()
    code_query = normalize_code(query)
    matches = []

    for section in load_catalog():
        haystack = [section["code"].lower(), section["title"].lower(), *section["tags"]]
        if section["code"] != code_query and not any(needle in text for text in haystack):
            continue
        if earliest_start and to_minutes(section["start"]) < to_minutes(earliest_start):
            continue
        if days and not set(section["days"]) <= set(days):
            continue
        matches.append(section_summary(section))

    if not matches:
        return {"sections": [], "error": f"No sections match '{query}' with those filters."}

    return {
        "sections": matches[:MAX_SEARCH_RESULTS],
        "total_matches": len(matches),
    }


@tool
def check_prerequisites(course_code: str) -> dict:
    """Check whether the student has completed every prerequisite for a course.
    Use this before adding any course to a schedule. Returns met: true/false and
    the list of missing prerequisite course codes.
    """
    code = normalize_code(course_code)
    section = next((s for s in load_catalog() if s["code"] == code), None)

    if section is None:
        return {"course_code": code, "met": False, "error": f"Unknown course code '{course_code}'."}

    completed = set(load_student()["completed"])
    missing = [prereq for prereq in section["prerequisites"] if prereq not in completed]

    return {"course_code": code, "met": not missing, "missing": missing}


@tool
def build_schedule(section_ids: list[str]) -> dict:
    """Build a weekly schedule from a list of section IDs (e.g. ["CSE340-01",
    "CSE365-01"]). Use this once you have chosen sections, and again after
    changing them. Returns the schedule by day with total credits, or the time
    conflicts and credit-limit problems that prevent it.
    """
    by_id = {s["section_id"]: s for s in load_catalog()}
    unknown = [sid for sid in section_ids if sid not in by_id]

    if unknown:
        return {"ok": False, "error": f"Unknown section IDs: {', '.join(unknown)}."}

    sections = [by_id[sid] for sid in section_ids]
    problems = []

    seen_codes = set()
    for section in sections:
        if section["code"] in seen_codes:
            problems.append(f"{section['code']} is included more than once.")
        seen_codes.add(section["code"])

    for i, first in enumerate(sections):
        for second in sections[i + 1:]:
            shared_days = sorted(set(first["days"]) & set(second["days"]), key=DAY_ORDER.index)
            overlaps = (
                to_minutes(first["start"]) < to_minutes(second["end"])
                and to_minutes(second["start"]) < to_minutes(first["end"])
            )
            if shared_days and overlaps:
                problems.append(
                    f"{first['section_id']} ({first['start']}-{first['end']}) overlaps "
                    f"{second['section_id']} ({second['start']}-{second['end']}) on {', '.join(shared_days)}."
                )

    total_credits = sum(s["credits"] for s in sections)
    max_credits = load_student()["max_credits"]
    if total_credits > max_credits:
        problems.append(f"Total credits {total_credits} exceed the {max_credits}-credit limit.")

    if problems:
        return {"ok": False, "conflicts": problems}

    week = {day: [] for day in DAY_ORDER}
    for section in sorted(sections, key=lambda s: to_minutes(s["start"])):
        for day in section["days"]:
            week[day].append(f"{section['start']}-{section['end']} {section['code']} ({section['section_id']})")

    return {
        "ok": True,
        "total_credits": total_credits,
        "sections": [section_summary(s) for s in sections],
        "week": {day: classes for day, classes in week.items() if classes},
    }


TOOLS = [search_catalog, check_prerequisites, build_schedule]

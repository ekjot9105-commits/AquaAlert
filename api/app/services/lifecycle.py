"""
Report lifecycle state machine.
Valid statuses: New → Under Review → Verified → Assigned → Action Taken → Resolved
                                  → Rejected
                                  → Needs Field Check → Under Review (loop)
Every transition writes a CaseEvent with actor, role, and note.
"""
from typing import Optional, Tuple, List
from datetime import datetime, timezone

VALID_TRANSITIONS = {
    "New":              ["Under Review"],
    "Under Review":     ["Verified", "Rejected", "Needs Field Check"],
    "Verified":         ["Assigned"],
    "Assigned":         ["Action Taken"],
    "Action Taken":     ["Resolved"],
    "Needs Field Check":["Under Review"],
    # Terminal states have no outbound
    "Rejected":         [],
    "Resolved":         [],
}

# XP awards for lifecycle events
XP_AWARDS = {
    "report_submitted":    50,
    "report_verified":     20,   # awarded to reporter
    "report_resolved":     30,   # awarded to reporter
    "verification_done":   25,   # awarded to reviewer
    "action_recorded":     15,   # awarded to authority
    "case_resolved":       25,   # awarded to authority
}

ROLE_PERMISSIONS = {
    "citizen":    set(),  # Citizens cannot change status
    "reviewer":   {"Under Review", "Verified", "Rejected", "Needs Field Check"},
    "authority":  {"Under Review", "Verified", "Rejected", "Needs Field Check",
                   "Assigned", "Action Taken", "Resolved"},
    "researcher": set(),  # read-only
}


def validate_transition(current_status: str, new_status: str, actor_role: str) -> Tuple[bool, str]:
    """Check if this transition is valid. Returns (ok, error_message)."""
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        return False, f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {allowed}"
    
    role_allowed = ROLE_PERMISSIONS.get(actor_role, set())
    if new_status not in role_allowed:
        return False, f"Role '{actor_role}' cannot set status to '{new_status}'"
    
    return True, ""


def get_xp_for_transition(new_status: str) -> List[Tuple[str, int, str]]:
    """
    Returns list of (target_key, xp_amount, reason) for a transition.
    target_key is 'reporter' or 'actor'.
    """
    awards = []
    if new_status == "Verified":
        awards.append(("reporter", XP_AWARDS["report_verified"], "Report verified by reviewer"))
        awards.append(("actor", XP_AWARDS["verification_done"], "Completed verification"))
    elif new_status == "Resolved":
        awards.append(("reporter", XP_AWARDS["report_resolved"], "Report resolved"))
        awards.append(("actor", XP_AWARDS["case_resolved"], "Resolved a case"))
    elif new_status == "Action Taken":
        awards.append(("actor", XP_AWARDS["action_recorded"], "Recorded field action"))
    return awards


def should_create_alert(new_status: str, priority: str) -> bool:
    """Create an environmental alert when a high-priority case is verified."""
    return new_status == "Verified" and priority == "High"

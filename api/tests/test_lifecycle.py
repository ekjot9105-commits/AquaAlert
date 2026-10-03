from app.services.lifecycle import validate_transition


def test_valid_authority_lifecycle_transitions():
    assert validate_transition("New", "Under Review", "authority")[0]
    assert validate_transition("Under Review", "Verified", "authority")[0]
    assert validate_transition("Verified", "Assigned", "authority")[0]
    assert validate_transition("Assigned", "Action Taken", "authority")[0]
    assert validate_transition("Action Taken", "Resolved", "authority")[0]


def test_invalid_transitions_and_roles_are_rejected():
    assert not validate_transition("New", "Verified", "authority")[0]
    assert not validate_transition("Under Review", "Resolved", "reviewer")[0]
    assert not validate_transition("Resolved", "Under Review", "authority")[0]
    assert not validate_transition("Under Review", "Verified", "citizen")[0]

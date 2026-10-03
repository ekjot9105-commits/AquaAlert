"""Pure, conservative rules for Water Guardians progression."""
from datetime import datetime, timezone

LEVELS = (
    (0, "Ripple"),
    (200, "Stream Scout"),
    (500, "River Ranger"),
    (900, "Watershed Warden"),
    (1400, "Aqua Guardian"),
    (2200, "Water Steward"),
    (3200, "Blue Planet Keeper"),
)

DAILY_XP_CAP = 100


def level_for_xp(xp: int) -> dict:
    current = LEVELS[0]
    next_level = None
    for index, tier in enumerate(LEVELS):
        if xp >= tier[0]:
            current = tier
            next_level = LEVELS[index + 1] if index + 1 < len(LEVELS) else None
    return {
        "level": LEVELS.index(current) + 1,
        "name": current[1],
        "xp": xp,
        "current_threshold": current[0],
        "next_threshold": next_level[0] if next_level else current[0] + 1000,
        "next_name": next_level[1] if next_level else "Master Water Guardian",
    }


def quality_xp(action: str, has_photo: bool = False, has_location: bool = True) -> int:
    if action == "daily_check":
        return 10
    if action == "report":
        return 45 if has_photo and has_location else 20 if has_location else 5
    if action == "neighbor_confirmation":
        return 15
    return 0


def is_same_day(left: datetime, right: datetime | None = None) -> bool:
    right = right or datetime.now(timezone.utc)
    return left.astimezone(timezone.utc).date() == right.astimezone(timezone.utc).date()

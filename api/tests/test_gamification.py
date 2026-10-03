from app.services.gamification import level_for_xp, quality_xp


def test_level_names_progress():
    assert level_for_xp(0)["name"] == "Ripple"
    assert level_for_xp(500)["name"] == "River Ranger"
    assert level_for_xp(1400)["name"] == "Aqua Guardian"


def test_quality_rewards_prefer_complete_reports():
    assert quality_xp("report", has_photo=True, has_location=True) > quality_xp("report", has_location=True)
    assert quality_xp("report", has_location=False) < quality_xp("daily_check")


def test_daily_check_has_bounded_value():
    assert quality_xp("daily_check") == 10

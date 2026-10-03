import pytest
from app.services.rules import calculate_priority, get_distance_meters

def test_distance_calculation():
    # Roughly NY to somewhere slightly north
    dist = get_distance_meters(40.0, -73.0, 40.001, -73.0)
    assert 110 <= dist <= 112 # ~111 meters per 0.001 degree lat

def test_default_pass_through():
    priority, rules, needs_verif = calculate_priority("Low", 0.9, ["visible_waste"], 3.0, 0, 1000)
    assert priority == "Low"
    assert len(rules) == 0
    assert not needs_verif

def test_high_impact_category_raises_priority():
    priority, rules, needs_verif = calculate_priority("Low", 0.9, ["algae_like_growth"], 3.0, 0, 1000)
    assert priority == "Medium"
    assert "High-impact issue category detected" in rules

def test_clustering_raises_priority():
    priority, rules, needs_verif = calculate_priority("Low", 0.9, ["visible_waste"], 3.0, 3, 1000)
    assert priority == "Medium"
    assert "Cluster: 3 recent reports within 300m" in rules

def test_sensitive_area_raises_priority():
    priority, rules, needs_verif = calculate_priority("Low", 0.9, ["visible_waste"], 3.0, 0, 400)
    assert priority == "Medium"
    assert "Proximity to sensitive area (400m)" in rules

def test_high_priority_forces_verification():
    priority, rules, needs_verif = calculate_priority("High", 0.9, ["visible_waste"], 3.0, 0, 1000)
    assert priority == "High"
    assert needs_verif
    assert "High priority cases require field verification" in rules

def test_low_confidence_forces_verification():
    priority, rules, needs_verif = calculate_priority("Low", 0.5, ["visible_waste"], 3.0, 0, 1000)
    assert priority == "Low"
    assert needs_verif
    assert "Low AI confidence requires human verification" in rules

def test_low_trust_reduces_priority():
    priority, rules, needs_verif = calculate_priority("Medium", 0.9, ["visible_waste"], 1.5, 0, 1000)
    assert priority == "Low"
    assert "Low trust reporter adjustment" in rules

def test_high_trust_rule_triggered():
    priority, rules, needs_verif = calculate_priority("Low", 0.9, ["visible_waste"], 4.5, 0, 1000)
    assert priority == "Low"
    assert "High trust reporter" in rules

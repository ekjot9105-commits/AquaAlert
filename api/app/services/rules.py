import math
from typing import Dict, Any, List, Tuple

def get_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine formula
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_priority(
    ai_suggestion: str,
    ai_confidence: float,
    categories: List[str],
    reporter_trust_score: float,
    recent_reports_nearby: int,
    distance_to_sensitive_area_meters: float
) -> Tuple[str, List[str], bool]:
    """
    Adjust AI priority based on rules.
    Returns: (final_priority, rules_triggered, needs_verification)
    """
    rules_triggered = []
    
    # Base priority mapping
    priority_score = {"Low": 1, "Medium": 2, "High": 3}.get(ai_suggestion, 1)
    
    # Rule 1: High weight categories
    high_weight = {"algae_like_growth", "aquatic_distress", "foam_or_oil_sheen"}
    if any(c in high_weight for c in categories):
        priority_score += 1
        rules_triggered.append("High-impact issue category detected")
        
    # Rule 2: Clustering
    if recent_reports_nearby >= 3:
        priority_score += 1
        rules_triggered.append(f"Cluster: {recent_reports_nearby} recent reports within 300m")
        
    # Rule 3: Sensitive Area
    if distance_to_sensitive_area_meters <= 500:
        priority_score += 1
        rules_triggered.append(f"Proximity to sensitive area ({int(distance_to_sensitive_area_meters)}m)")
        
    # Rule 4: Trust Score
    if reporter_trust_score >= 4.0:
        # Trust score boost doesn't necessarily raise priority, but adds credibility
        rules_triggered.append("High trust reporter")
    elif reporter_trust_score < 2.0:
        priority_score = max(1, priority_score - 1)
        rules_triggered.append("Low trust reporter adjustment")
        
    # Final clamping
    if priority_score >= 3:
        final_priority = "High"
    elif priority_score == 2:
        final_priority = "Medium"
    else:
        final_priority = "Low"
        
    # Needs verification rule
    needs_verification = False
    if final_priority == "High":
        needs_verification = True
        rules_triggered.append("High priority cases require field verification")
    elif ai_confidence < 0.6:
        needs_verification = True
        rules_triggered.append("Low AI confidence requires human verification")
        
    return final_priority, rules_triggered, needs_verification

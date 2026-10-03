import json
import hashlib
import time
import os
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ValidationError
import logging

class CategoryResult(BaseModel):
    label: str
    confidence: float
    evidence_note: str

class AIAssessmentResult(BaseModel):
    categories: List[CategoryResult]
    overall_confidence: float
    priority_suggestion: str
    visible_indicators: List[str]
    uncertainty_notes: str
    needs_field_verification: bool

class AIProvider:
    def assess(self, image_b64: str, text: str, context: Dict[str, Any]) -> AIAssessmentResult:
        raise NotImplementedError

class MockAIProvider(AIProvider):
    def assess(self, image_b64: str, text: str, context: Dict[str, Any]) -> AIAssessmentResult:
        time.sleep(2.0) # Simulate latency
        
        # Deterministic based on text and image length
        h = hashlib.md5(f"{len(image_b64)}_{text}".encode()).hexdigest()
        val = int(h[:4], 16)
        
        is_clean = "fine" in text.lower() or val % 4 == 0
        if is_clean:
            return AIAssessmentResult(
                categories=[CategoryResult(label="no_issue_visible", confidence=0.92, evidence_note="Water appears clear with no visible pollutants.")],
                overall_confidence=0.92,
                priority_suggestion="Low",
                visible_indicators=[],
                uncertainty_notes="Assessment based on limited visual context; appears normal.",
                needs_field_verification=False
            )
        
        labels = ["visible_waste", "discoloration", "algae_like_growth", "aquatic_distress", "foam_or_oil_sheen", "other"]
        label = labels[val % len(labels)]
        conf = 0.6 + (val % 30) / 100.0 # 0.60 to 0.89
        
        return AIAssessmentResult(
            categories=[CategoryResult(label=label, confidence=conf, evidence_note=f"Potential {label.replace('_', ' ')} detected. Visual assessment only.")],
            overall_confidence=conf,
            priority_suggestion="High" if conf > 0.8 else "Medium",
            visible_indicators=[label.replace('_', ' ')],
            uncertainty_notes="Visual assessment only, not a laboratory test.",
            needs_field_verification=conf < 0.75
        )

class RealVisionProvider(AIProvider):
    def assess(self, image_b64: str, text: str, context: Dict[str, Any]) -> AIAssessmentResult:
        api_key = os.getenv("API_KEY")
        if not api_key:
            logging.warning("API_KEY not set. Real provider requires a key. Aborting to mock.")
            raise ValueError("No API_KEY")

        prompt = f"""
You are an AI assistant analyzing an image of an urban water ecosystem.
Safety Rules:
- Use terms like "potential" and "possible". Never claim toxicity, pathogens, or human-health harm from an image.
- State that it is a visual assessment, not a laboratory test.

Taxonomy allowed: visible_waste, discoloration, algae_like_growth, aquatic_distress, foam_or_oil_sheen, odor_report, other, no_issue_visible.

User text: {text}

Analyze the image and return a JSON object exactly matching this schema:
{{
  "categories": [
    {{"label": "...", "confidence": 0.0, "evidence_note": "..."}}
  ],
  "overall_confidence": 0.0,
  "priority_suggestion": "Low/Medium/High",
  "visible_indicators": ["..."],
  "uncertainty_notes": "...",
  "needs_field_verification": true/false
}}
"""
        
        # We simulate the HTTP call using httpx, retrying once on JSON error
        for attempt in range(2):
            try:
                # Using OpenAI compatible endpoint structure as an example
                # If this fails (e.g. timeout or invalid key), we will catch it in the API router and fallback
                with httpx.Client(timeout=12.0) as client:
                    resp = client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}"},
                        json={
                            "model": "gpt-4-vision-preview",
                            "messages": [
                                {"role": "user", "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                                ]}
                            ],
                            "response_format": {"type": "json_object"}
                        }
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return AIAssessmentResult(**parsed)
            except (ValidationError, json.JSONDecodeError) as e:
                logging.error(f"JSON Parsing failed on attempt {attempt+1}: {e}")
                if attempt == 1:
                    raise
            except Exception as e:
                logging.error(f"HTTP Provider error: {e}")
                raise

def get_ai_provider() -> AIProvider:
    provider = os.getenv("AI_PROVIDER", "mock")
    if provider.lower() == "vision":
        return RealVisionProvider()
    return MockAIProvider()

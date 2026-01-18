import base64
import json
import logging

import requests

from bizbot_shared.core.config import Settings


_SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "required": ["score"],
    "additionalProperties": False,
}

logger = logging.getLogger("bizbot_gemini")

_PROMPT = (
    "You are a photo quality rater for an event robot camera system.\n"
    "\n"
    "You MUST evaluate only technical photo quality:\n"
    "- sharpness / motion blur\n"
    "- exposure / lighting\n"
    "- framing / subject cut-off\n"
    "- clutter / distracting elements\n"
    "- resolution / compression artifacts\n"
    "\n"
    "You MUST NOT evaluate: attractiveness, identity, demographics, or emotions.\n"
    "\n"
    "Return ONLY JSON matching the schema.\n"
    "Return: { \"score\": float 0.0 to 1.0 }\n"
    "If uncertain, return around 0.5."
)


class GeminiScorer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def score_image(self, image_bytes: bytes, content_type: str) -> float:
        if not self._settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required")

        encoded = base64.b64encode(image_bytes).decode("utf-8")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._settings.gemini_model}:generateContent"
            f"?key={self._settings.gemini_api_key}"
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": _PROMPT},
                        {"inline_data": {"mime_type": content_type, "data": encoded}},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ],
        }
        logger.info("Gemini request model=%s bytes=%d", self._settings.gemini_model, len(image_bytes))
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code >= 400:
            logger.error("Gemini API error %s: %s", response.status_code, response.text)
            raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

        data = response.json()
        if "error" in data:
            raise RuntimeError(str(data["error"]))

        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as exc:
            logger.error("Gemini response missing content: %s", data)
            raise RuntimeError("Gemini response missing content") from exc

        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error("Gemini response was not valid JSON: %s", text)
            raise RuntimeError("Gemini response was not valid JSON") from exc

        if "score" not in payload:
            logger.error("Gemini response missing score: %s", payload)
            raise RuntimeError("Gemini response missing score")

        score = float(payload["score"])
        if score < 0.0 or score > 1.0:
            raise RuntimeError("Gemini score out of range")

        return score

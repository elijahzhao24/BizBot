import base64
import json
import logging
import re

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
    "If uncertain, return around 0.70.\n"
    "Be very generous on the judging and only mark lower than 0.70 if there are very clear technical photo issues, The photos are supposed to be candid/B-roll\n"
)


class GeminiScorer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _extract_json(self, text: str) -> dict:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
            cleaned = re.sub(r"```\s*$", "", cleaned).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                raise
            return json.loads(match.group(0))

    def _extract_score(self, text: str) -> float:
        try:
            payload = self._extract_json(text)
            if "score" in payload:
                return float(payload["score"])
        except json.JSONDecodeError:
            pass

        match = re.search(r"\"score\"\s*:\s*([0-9]+(?:\.[0-9]+)?)", text)
        if match:
            return float(match.group(1))

        raise RuntimeError("Gemini response missing score")

    def score_image(self, image_bytes: bytes, content_type: str) -> float:
        if not self._settings.gemini_api_key:
            logger.error("GEMINI_API_KEY is not set")
            raise RuntimeError("GEMINI_API_KEY is required")

        encoded = base64.b64encode(image_bytes).decode("utf-8")
        
        model = "gemini-2.0-flash"
        
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent"
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
        logger.info("Gemini request model=%s bytes=%d", model, len(image_bytes))
        try:
            response = requests.post(url, json=payload, timeout=30)
        except requests.exceptions.RequestException as exc:
            logger.error("Gemini request failed: %s", exc)
            raise RuntimeError(f"Gemini request failed: {exc}") from exc
        
        if response.status_code >= 400:
            logger.error("Gemini API error %s: %s", response.status_code, response.text)
            logger.error("Available models can be checked at: https://ai.google.dev/gemini-api/docs/models/gemini")
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
            score = self._extract_score(text)
        except Exception as exc:
            logger.error("Gemini score parse failed: %s", text)
            raise RuntimeError("Gemini response missing score") from exc

        logger.info("Gemini score parsed: %s", score)
        if score < 0.0 or score > 1.0:
            raise RuntimeError("Gemini score out of range")

        return score

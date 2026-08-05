import json


def parse_json(response: str):
    cleaned = response.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)
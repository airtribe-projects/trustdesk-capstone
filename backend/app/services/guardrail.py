UNSAFE_PATTERNS = [

    "ignore previous",

    "ignore all",

    "system prompt",

    "hidden prompt",

    "api key",

    "secret",

    "reveal prompt",

    "developer prompt",

    "admin password",

    "give me coupon",

    "100% discount",

    "free money",

    "override policy"

]


def check_guardrails(text: str):

    lower_text = text.lower()

    for pattern in UNSAFE_PATTERNS:

        if pattern in lower_text:

            return False, pattern

    return True, None
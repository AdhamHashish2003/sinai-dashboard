"""Groq Llama 3.3 70B post generator — loads prompt files, calls Groq."""

from pathlib import Path
from groq import AsyncGroq

MODEL = "llama-3.3-70b-versatile"

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(post_type: str) -> str:
    """Load a .md prompt for the given post_type."""
    path = PROMPTS_DIR / f"{post_type}.md"
    return path.read_text(encoding="utf-8")


async def generate_post_body(
    client: AsyncGroq,
    product: dict,
    post_type: str,
    topic: dict,
    pdf_reference: str | None = None,
) -> str:
    """
    Generate a proof post body. topic is a dict with city info
    (for city_report/adu_case_study) or a list of cities (for fee_comparison).
    """
    template = load_prompt(post_type)

    fmt_vars = {
        "product_name": product.get("name") or "the product",
        "value_prop": product.get("valueProp") or "(not set)",
        "icp": product.get("icp") or "(not set)",
        "free_tier_hook": product.get("freeTierHook") or "(none)",
        "prod_url": product.get("prodUrl") or "(not set)",
        "city_name": topic.get("name", ""),
        "state": topic.get("state", "CA"),
        "cities_list": topic.get("cities_list", ""),
        "pdf_reference": (
            f"A real PermitAI PDF report is attached ({pdf_reference}). "
            "Reference the fact that you have a full 7-section structured report to back the claims."
            if pdf_reference
            else ""
        ),
    }

    system = template.format_map(_Defaulting(fmt_vars))

    resp = await client.chat.completions.create(
        model=MODEL,
        max_tokens=800,
        temperature=0.7,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Generate the {post_type} proof post now. Output ONLY the post body text.",
            },
        ],
    )

    text = (resp.choices[0].message.content or "").strip()

    # Strip accidental wrapping quotes / fences / preambles
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if "\n" in text:
                first_line, rest = text.split("\n", 1)
                if first_line.strip() in ("markdown", "text", "md", "reddit"):
                    text = rest
        text = text.strip()
    for preamble in (
        "Here's a draft:",
        "Here is a draft:",
        "Here's the post:",
        "Draft:",
        "Post:",
    ):
        if text.lower().startswith(preamble.lower()):
            text = text[len(preamble):].strip()

    return text


class _Defaulting(dict):
    """str.format_map helper that returns empty string for missing keys."""

    def __missing__(self, key):
        return ""

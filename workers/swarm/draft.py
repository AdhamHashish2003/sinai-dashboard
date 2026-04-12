"""Claude Sonnet 4.6 reply drafter."""

import os
from pathlib import Path
import anthropic

PROMPTS_DIR = Path(__file__).parent / "prompts"

_prompt_cache: dict[str, str] = {}


def load_prompt(name: str) -> str:
    """Load a .md prompt from workers/swarm/prompts/, cached."""
    if name not in _prompt_cache:
        path = PROMPTS_DIR / name
        _prompt_cache[name] = path.read_text(encoding="utf-8")
    return _prompt_cache[name]


async def generate_draft(
    client: anthropic.AsyncAnthropic,
    signal: dict,
    product: dict,
    regenerate_note: str | None = None,
) -> str:
    """Call Claude Sonnet 4.6 to draft a reply. Returns cleaned draft text."""
    prompt_template = load_prompt("reddit_reply.md")

    system = prompt_template.format(
        product_name=product.get("name") or "the product",
        value_prop=product.get("valueProp") or "(not set)",
        icp=product.get("icp") or "(not set)",
        free_tier_hook=product.get("freeTierHook") or "(none)",
        prod_url=product.get("prodUrl") or "(not set)",
    )

    user_msg_parts = [
        f"Subreddit/source: {signal.get('source', 'reddit')}",
        f"Post author: {signal.get('author', 'unknown')}",
        f"",
        f"POST TITLE:",
        signal.get("title") or "(no title)",
        "",
        "POST BODY:",
        signal.get("body") or "(no body — this is likely a link-only post, reply to the title)",
    ]

    if regenerate_note:
        user_msg_parts.extend(
            [
                "",
                "REGENERATE INSTRUCTION: Your previous draft was rejected. "
                f"Try a different angle this time. Hint: {regenerate_note}",
            ]
        )

    user_msg = "\n".join(user_msg_parts)

    resp = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )

    text = resp.content[0].text.strip()

    # Strip accidental wrapping quotes, code fences, or "Here's a draft:" preambles
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.startswith(("markdown", "text", "reddit")):
                text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.strip()

    # Remove common AI preambles
    for preamble in (
        "Here's a draft:",
        "Here is a draft:",
        "Here's my draft:",
        "Draft:",
        "Reply:",
    ):
        if text.lower().startswith(preamble.lower()):
            text = text[len(preamble):].strip()

    return text

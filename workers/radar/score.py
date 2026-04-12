"""Groq Llama intent scorer for the Radar worker."""

import json
import os
from groq import AsyncGroq

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You score social media posts 1-10 for purchase intent for {product_name}.

Product: {value_prop}
ICP: {icp}

Return ONLY valid JSON: {{"score": <int 1-10>, "reason": "<one line>"}}

Scoring rubric:
10 = user is actively shopping RIGHT NOW for this exact solution
9 = user is comparing tools/vendors in this exact category
8 = user explicitly describes the pain this product solves and is asking for help
7 = user has the problem and is frustrated, open to solutions
6 = user works in the ICP and mentions a related workflow
5 = user discusses the problem space generally
4 = tangentially related industry discussion
3 = vaguely related topic
2 = same industry but irrelevant topic
1 = completely irrelevant"""


async def score_posts(product: dict, posts: list[dict]) -> list[dict]:
    """Score each post with Groq Llama. Returns posts with score + reason added."""
    api_key = product.get("groqKey") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("  [score] no GROQ_API_KEY — skipping scoring")
        return []

    client = AsyncGroq(api_key=api_key)
    system = SYSTEM_PROMPT.format(
        product_name=product["name"],
        value_prop=product.get("valueProp") or "N/A",
        icp=product.get("icp") or "N/A",
    )

    scored: list[dict] = []
    for i, post in enumerate(posts):
        user_msg = f"Title: {post['title']}\n\nBody: {post['body'][:2000]}"
        if not user_msg.strip() or (not post["title"] and not post["body"]):
            continue

        try:
            resp = await client.chat.completions.create(
                model=MODEL,
                max_tokens=100,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
            )

            text = (resp.choices[0].message.content or "").strip()

            # JSON mode should produce clean JSON, but strip fences just in case
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            result = json.loads(text)
            score = int(result.get("score", 0))
            reason = str(result.get("reason", ""))

            post_with_score = {**post, "score": score, "reason": reason}
            scored.append(post_with_score)

            if score >= 7:
                print(f"  [score] {score}/10 — {post['title'][:60]}... → {reason[:80]}")
            elif (i + 1) % 10 == 0:
                print(f"  [score] processed {i + 1}/{len(posts)} posts...")

        except json.JSONDecodeError as e:
            print(f"  [score] bad JSON from Llama: {e}")
        except Exception as e:
            print(f"  [score] error scoring post: {e}")

    return scored

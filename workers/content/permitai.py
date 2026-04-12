"""
PermitAI API client.

Public endpoints (no auth):
  GET /api/cities?state=CA&limit=N
  GET /api/stats
  GET /api/states-coverage

Authenticated endpoints (require PERMITAI_AUTH_TOKEN env var):
  POST /api/analyze      — generate city analysis (JSON sections)
  POST /api/report/pdf   — generate branded PDF from analysis text

When PERMITAI_AUTH_TOKEN is not set, authenticated calls return None and
the content worker falls back to text-only proof posts without PDF assets.
Once you grab a token via /api/auth/login, paste it into Railway env vars
and full PDF generation activates with no code changes.
"""

import os
import httpx

PERMITAI_BASE_URL = os.environ.get(
    "PERMITAI_BASE_URL",
    "https://permit-agent-production-1731.up.railway.app",
).rstrip("/")


def _auth_headers() -> dict[str, str] | None:
    """Return auth headers if a PermitAI token is configured, else None."""
    token = os.environ.get("PERMITAI_AUTH_TOKEN")
    if not token:
        return None
    return {"Authorization": f"Bearer {token}"}


# ── Public endpoints ─────────────────────────────────────────────────────────


async def list_cities(
    http: httpx.AsyncClient,
    state: str = "CA",
    limit: int = 500,
) -> list[dict]:
    """Fetch cities from PermitAI. Returns [{id, name, state, display}, ...]."""
    try:
        resp = await http.get(
            f"{PERMITAI_BASE_URL}/api/cities",
            params={"state": state, "limit": limit},
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  [permitai] list_cities failed: {e}")
        return []


# ── Authenticated endpoints (feature-flagged) ────────────────────────────────


async def analyze_city(
    http: httpx.AsyncClient,
    city_id: str,
    project_type: str = "adu",
) -> dict | None:
    """
    Generate a full city analysis. Requires PERMITAI_AUTH_TOKEN.
    Returns None if no token or endpoint fails (worker falls back to text-only).
    """
    headers = _auth_headers()
    if not headers:
        return None

    try:
        resp = await http.post(
            f"{PERMITAI_BASE_URL}/api/analyze",
            headers={**headers, "Content-Type": "application/json"},
            json={"city_id": city_id, "project_type": project_type},
            timeout=120,  # analyze can take a while
        )
        if resp.status_code != 200:
            print(f"  [permitai] analyze {city_id} → {resp.status_code}: {resp.text[:200]}")
            return None
        return resp.json()
    except Exception as e:
        print(f"  [permitai] analyze {city_id} error: {e}")
        return None


async def generate_pdf_report(
    http: httpx.AsyncClient,
    analysis_text: str,
    city_name: str,
) -> str | None:
    """
    Generate a branded PDF from analysis text. Requires PERMITAI_AUTH_TOKEN.
    Returns a URL or path string, or None on failure.
    """
    headers = _auth_headers()
    if not headers:
        return None

    try:
        resp = await http.post(
            f"{PERMITAI_BASE_URL}/api/report/pdf",
            headers={**headers, "Content-Type": "application/json"},
            json={"analysis": analysis_text, "title": f"{city_name} Permit Report"},
            timeout=60,
        )
        if resp.status_code != 200:
            print(f"  [permitai] report/pdf → {resp.status_code}: {resp.text[:200]}")
            return None
        data = resp.json()
        # Response shape unknown without auth — likely {pdf_url: "..."} or {url: "..."}
        return data.get("pdf_url") or data.get("url") or data.get("path")
    except Exception as e:
        print(f"  [permitai] report/pdf error: {e}")
        return None

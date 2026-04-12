"""
GhostCrew Scout HTTP client.

This is a thin wrapper around GhostCrew's /api/v1/scout API. It can be used
programmatically by other workers (e.g., enrichment jobs that trigger a scout
for a specific product) or invoked as a CLI for manual testing:

    python scout_client.py permit-ai cslb_adu_builders CA 100

Env:
    GHOSTCREW_API_URL  — e.g. https://ghostcrew-production.up.railway.app
    GHOSTCREW_API_KEY  — bearer token via X-API-Key header
"""

import asyncio
import json
import os
import sys
from typing import Literal, TypedDict

import httpx

DEFAULT_TIMEOUT = 15.0
POLL_INTERVAL_SEC = 5.0
MAX_POLL_SECONDS = 600  # 10 minutes safety cap


TargetType = Literal["cslb_adu_builders", "permit_expediters", "small_gcs"]


class ScoutLead(TypedDict, total=False):
    source: str
    source_url: str
    name: str
    company: str
    license_number: str
    phone: str
    mailing_address: str
    city: str
    state: str
    classification: str
    issue_date: str
    expiration_date: str
    status: str
    email: str
    role: str


class ScoutJobStatus(TypedDict):
    job_id: str
    status: Literal["queued", "running", "done", "failed"]
    results: list[ScoutLead]
    error: str | None


def _config() -> tuple[str, str]:
    url = os.environ.get("GHOSTCREW_API_URL")
    key = os.environ.get("GHOSTCREW_API_KEY")
    if not url or not key:
        raise RuntimeError(
            "GHOSTCREW_API_URL and GHOSTCREW_API_KEY must be set in env"
        )
    return url.rstrip("/"), key


async def run_scout(
    client: httpx.AsyncClient,
    product_slug: str,
    target_type: TargetType,
    state: str = "CA",
    city: str | None = None,
    limit: int = 100,
) -> str:
    """Submit a Scout job to GhostCrew. Returns job_id."""
    url, key = _config()
    resp = await client.post(
        f"{url}/api/v1/scout/run",
        headers={"X-API-Key": key, "Content-Type": "application/json"},
        json={
            "product_slug": product_slug,
            "target_type": target_type,
            "state": state,
            "city": city,
            "limit": limit,
        },
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["job_id"]


async def get_job(client: httpx.AsyncClient, job_id: str) -> ScoutJobStatus:
    """Fetch current status + (if done) results for a scout job."""
    url, key = _config()
    resp = await client.get(
        f"{url}/api/v1/scout/jobs/{job_id}",
        headers={"X-API-Key": key},
        timeout=DEFAULT_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


async def poll_until_done(
    client: httpx.AsyncClient,
    job_id: str,
    on_progress=None,
) -> ScoutJobStatus:
    """Poll a scout job until it reaches done/failed, or timeout."""
    elapsed = 0.0
    while elapsed < MAX_POLL_SECONDS:
        job = await get_job(client, job_id)
        if on_progress:
            on_progress(job)
        if job["status"] in ("done", "failed"):
            return job
        await asyncio.sleep(POLL_INTERVAL_SEC)
        elapsed += POLL_INTERVAL_SEC

    return {
        "job_id": job_id,
        "status": "failed",
        "results": [],
        "error": f"polling timeout after {MAX_POLL_SECONDS}s",
    }


# ── CLI test harness ──────────────────────────────────────────────────────────


async def _cli() -> None:
    if len(sys.argv) < 4:
        print("Usage: python scout_client.py <product_slug> <target_type> <state> [limit]")
        print("Example: python scout_client.py permit-ai cslb_adu_builders CA 50")
        sys.exit(1)

    product_slug = sys.argv[1]
    target_type = sys.argv[2]
    state = sys.argv[3]
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else 50

    async with httpx.AsyncClient() as client:
        print(f"[scout] submitting: {product_slug} {target_type} {state} limit={limit}")
        job_id = await run_scout(client, product_slug, target_type, state=state, limit=limit)  # type: ignore[arg-type]
        print(f"[scout] job_id: {job_id}")

        def on_progress(job: ScoutJobStatus) -> None:
            print(f"  [scout] status={job['status']}")

        result = await poll_until_done(client, job_id, on_progress=on_progress)

        print(f"[scout] final status: {result['status']}")
        if result["status"] == "done":
            print(f"[scout] {len(result['results'])} leads:")
            print(json.dumps(result["results"][:5], indent=2))
        elif result.get("error"):
            print(f"[scout] error: {result['error']}")


if __name__ == "__main__":
    asyncio.run(_cli())

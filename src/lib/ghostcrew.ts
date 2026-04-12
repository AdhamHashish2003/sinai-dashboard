/**
 * Thin client for GhostCrew's Scout HTTP API.
 *
 * Env vars:
 *  - GHOSTCREW_API_URL  (e.g. https://ghostcrew-production.up.railway.app)
 *  - GHOSTCREW_API_KEY  (bearer-style via X-API-Key header)
 */

export interface ScoutRunPayload {
  product_slug: string;
  target_type: "cslb_adu_builders" | "permit_expediters" | "small_gcs";
  state: string;
  city: string | null;
  limit: number;
}

export interface ScoutRunResponse {
  job_id: string;
  status: string;
}

export interface ScoutResultLead {
  source: string;
  source_url: string;
  name: string;
  company?: string;
  license_number?: string;
  phone?: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  classification?: string;
  issue_date?: string;
  expiration_date?: string;
  status?: string;
  email?: string;
  role?: string;
}

export interface ScoutJobStatus {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  results: ScoutResultLead[];
  error: string | null;
}

function getConfig(): { url: string; key: string } {
  const url = process.env.GHOSTCREW_API_URL;
  const key = process.env.GHOSTCREW_API_KEY;
  if (!url || !key) {
    throw new Error("GHOSTCREW_API_URL or GHOSTCREW_API_KEY not set");
  }
  return { url: url.replace(/\/$/, ""), key };
}

export async function runScout(payload: ScoutRunPayload): Promise<ScoutRunResponse> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/scout/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify(payload),
    // GhostCrew responds 202 with {job_id, status} — should be fast
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GhostCrew run failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getScoutJob(jobId: string): Promise<ScoutJobStatus> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/scout/jobs/${jobId}`, {
    method: "GET",
    headers: { "X-API-Key": key },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GhostCrew job fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

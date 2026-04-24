import { normalizeCaliforniaCity } from "@/lib/california-cities";

const GOOGLE_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

const WEBSITE_FETCH_TIMEOUT_MS = 10_000;
const SOCIAL_FETCH_TIMEOUT_MS = 8_000;

export interface DentalScoutLead {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  googleMapsUrl: string;
  rating: number | null;
  businessStatus: string;
  city: string;
  state: string;
  emails: string[];
  instagram: string[];
  tiktok: string[];
  hasSocialMedia: boolean;
  goodSocialMedia: boolean | null;
  maxVideoViews: number | null;
  socialScanStatus: "none" | "scanned" | "blocked" | "unknown";
  foundingDate: string | null;
  foundingYear: number | null;
  foundingEvidence: string | null;
  isFranchise: boolean;
  franchiseReason: string;
  searchQuery: string;
}

interface RunDentalScoutInput {
  city: string;
  state: string;
  limit: number;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
}

interface GooglePlacesResponse {
  status: string;
  results?: GooglePlace[];
  error_message?: string;
}

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  business_status?: string;
  url?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: GooglePlaceDetails;
  error_message?: string;
}

interface WebsiteEnrichment {
  emails: string[];
  instagram: string[];
  tiktok: string[];
  foundingDate: string | null;
  foundingYear: number | null;
  foundingEvidence: string | null;
  isFranchise: boolean;
  franchiseReason: string;
}

interface SocialScan {
  goodSocialMedia: boolean | null;
  maxVideoViews: number | null;
  status: "none" | "scanned" | "blocked" | "unknown";
}

const KNOWN_DENTAL_FRANCHISES = [
  "aspen dental",
  "western dental",
  "gentle dental",
  "bright now dental",
  "dentalworks",
  "clearchoice",
  "affordable dentures",
  "great expressions",
  "sage dental",
  "ideal dental",
  "smile direct club",
  "kids dental brands",
  "coast dental",
  "pacific dental services",
];

const HTML_HEADERS = {
  "User-Agent":
    "ClinicScout/1.0 (+https://github.com/AdhamHashish2003/sinai-dashboard; dental CRM enrichment)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export function normalizeState(input: string): string {
  const value = input.trim();
  if (!value) return "California";
  if (value.toUpperCase() === "CA") return "California";
  return value;
}

export async function runDentalScout({
  city,
  state,
  limit,
}: RunDentalScoutInput): Promise<{
  leads: DentalScoutLead[];
  googleStatus: string;
  googleErrorMessage?: string;
  searchQueries: string[];
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not set");

  const cleanCity = normalizeCaliforniaCity(city);
  if (!cleanCity) throw new Error("Invalid California city");
  const cleanState = normalizeState(state);
  if (cleanState !== "California") throw new Error("Only California is supported right now");
  const searchQueries = [
    `dental clinic in ${cleanCity}, ${cleanState}`,
    `dentist in ${cleanCity}, ${cleanState}`,
  ];

  const placesById = new Map<string, { place: GooglePlace; searchQuery: string }>();
  let lastStatus = "OK";
  let lastError: string | undefined;

  for (const searchQuery of searchQueries) {
    const url = new URL(GOOGLE_TEXT_SEARCH_URL);
    url.searchParams.set("query", searchQuery);
    url.searchParams.set("type", "dentist");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url);
    const data = (await res.json()) as GooglePlacesResponse;
    lastStatus = data.status;
    lastError = data.error_message;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      break;
    }

    for (const place of data.results ?? []) {
      if (!placesById.has(place.place_id)) {
        placesById.set(place.place_id, { place, searchQuery });
      }
      if (placesById.size >= limit) break;
    }
    if (placesById.size >= limit) break;
  }

  if (placesById.size === 0) {
    return {
      leads: [],
      googleStatus: lastStatus,
      googleErrorMessage: lastError,
      searchQueries,
    };
  }

  const leads: DentalScoutLead[] = [];

  for (const { place, searchQuery } of Array.from(placesById.values()).slice(0, limit)) {
    const detail = await fetchPlaceDetails(place.place_id, apiKey);
    const website = detail.website ?? "";
    const websiteEnrichment = website
      ? await enrichWebsite(website, detail.name ?? place.name)
      : emptyWebsiteEnrichment(detail.name ?? place.name);
    const socialLinks = [...websiteEnrichment.instagram, ...websiteEnrichment.tiktok];
    const socialScan = await scanSocialMedia(socialLinks);

    leads.push({
      placeId: place.place_id,
      name: detail.name ?? place.name,
      address: detail.formatted_address ?? place.formatted_address ?? "",
      phone: detail.formatted_phone_number ?? detail.international_phone_number ?? "",
      website,
      googleMapsUrl: detail.url ?? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      rating: detail.rating ?? place.rating ?? null,
      businessStatus: detail.business_status ?? "",
      city: cleanCity,
      state: cleanState,
      emails: websiteEnrichment.emails,
      instagram: websiteEnrichment.instagram,
      tiktok: websiteEnrichment.tiktok,
      hasSocialMedia: socialLinks.length > 0,
      goodSocialMedia: socialScan.goodSocialMedia,
      maxVideoViews: socialScan.maxVideoViews,
      socialScanStatus: socialScan.status,
      foundingDate: websiteEnrichment.foundingDate,
      foundingYear: websiteEnrichment.foundingYear,
      foundingEvidence: websiteEnrichment.foundingEvidence,
      isFranchise: websiteEnrichment.isFranchise,
      franchiseReason: websiteEnrichment.franchiseReason,
      searchQuery,
    });
  }

  return { leads, googleStatus: "OK", searchQueries };
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails> {
  const url = new URL(GOOGLE_DETAILS_URL);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "rating",
      "business_status",
      "url",
    ].join(",")
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const data = (await res.json()) as GooglePlaceDetailsResponse;
  return data.result ?? {};
}

async function enrichWebsite(rawWebsite: string, businessName: string): Promise<WebsiteEnrichment> {
  const homeUrl = normalizeHttpUrl(rawWebsite);
  if (!homeUrl || !isSafeHttpUrl(homeUrl)) return emptyWebsiteEnrichment(businessName);

  const pages: Array<{ url: string; html: string }> = [];
  const homeHtml = await fetchHtml(homeUrl, WEBSITE_FETCH_TIMEOUT_MS);
  if (homeHtml) {
    pages.push({ url: homeUrl, html: homeHtml });
  }

  const candidateLinks = homeHtml
    ? extractInternalLinks(homeUrl, homeHtml).filter((url) =>
        /contact|about|team|location|office|practice/i.test(url)
      )
    : [];

  for (const url of unique(candidateLinks).slice(0, 3)) {
    const html = await fetchHtml(url, WEBSITE_FETCH_TIMEOUT_MS);
    if (html) pages.push({ url, html });
  }

  const combinedHtml = pages.map((p) => p.html).join("\n");
  const combinedText = htmlToText(combinedHtml);
  const founding = findFoundingDate(combinedText);
  const franchise = detectFranchise(businessName, combinedText);

  return {
    emails: extractEmails(combinedHtml),
    instagram: extractInstagramLinks(combinedHtml),
    tiktok: extractTikTokLinks(combinedHtml),
    foundingDate: founding.date,
    foundingYear: founding.year,
    foundingEvidence: founding.evidence,
    isFranchise: franchise.isFranchise,
    franchiseReason: franchise.reason,
  };
}

function emptyWebsiteEnrichment(businessName: string): WebsiteEnrichment {
  const franchise = detectFranchise(businessName, "");
  return {
    emails: [],
    instagram: [],
    tiktok: [],
    foundingDate: null,
    foundingYear: null,
    foundingEvidence: null,
    isFranchise: franchise.isFranchise,
    franchiseReason: franchise.reason,
  };
}

async function scanSocialMedia(urls: string[]): Promise<SocialScan> {
  if (urls.length === 0) {
    return { goodSocialMedia: null, maxVideoViews: null, status: "none" };
  }

  let maxVideoViews: number | null = null;
  let blocked = false;
  let scanned = false;

  for (const url of urls.slice(0, 4)) {
    if (!isSafeHttpUrl(url)) continue;
    const html = await fetchHtml(url, SOCIAL_FETCH_TIMEOUT_MS);
    if (!html) {
      blocked = true;
      continue;
    }
    scanned = true;
    const views = extractMaxViews(html);
    if (views !== null) {
      maxVideoViews = Math.max(maxVideoViews ?? 0, views);
    }
  }

  if (maxVideoViews !== null) {
    return {
      goodSocialMedia: maxVideoViews >= 10_000,
      maxVideoViews,
      status: "scanned",
    };
  }

  return {
    goodSocialMedia: null,
    maxVideoViews: null,
    status: scanned ? "unknown" : blocked ? "blocked" : "unknown",
  };
}

async function fetchHtml(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HTML_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return null;
  }
}

function extractInternalLinks(baseUrl: string, html: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];
  const regex = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try {
      const url = new URL(match[1], base);
      if (url.hostname === base.hostname && isSafeHttpUrl(url.toString())) {
        links.push(url.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  }
  return links;
}

function extractEmails(html: string): string[] {
  const mailto = Array.from(html.matchAll(/mailto:([^"'?\s>]+)/gi)).map((m) =>
    decodeURIComponent(m[1])
  );
  const plain = Array.from(
    html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)
  ).map((m) => m[0]);

  return unique([...mailto, ...plain])
    .map((email) => email.trim().replace(/^mailto:/i, ""))
    .filter((email) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(email))
    .filter((email) => !/(example|domain)\./i.test(email))
    .slice(0, 8);
}

function extractInstagramLinks(html: string): string[] {
  return unique(
    Array.from(
      html.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)\/?/gi)
    )
      .filter((m) => !["p", "reel", "reels", "stories", "explore"].includes(m[1].toLowerCase()))
      .map((m) => `https://www.instagram.com/${m[1]}/`)
  ).slice(0, 4);
}

function extractTikTokLinks(html: string): string[] {
  return unique(
    Array.from(html.matchAll(/https?:\/\/(?:www\.)?tiktok\.com\/(@[A-Za-z0-9_.-]+)/gi)).map(
      (m) => `https://www.tiktok.com/${m[1]}`
    )
  ).slice(0, 4);
}

function extractMaxViews(html: string): number | null {
  const values: number[] = [];
  const jsonPatterns = [
    /"(?:playCount|play_count|videoViewCount|viewCount)"\s*:\s*"?([0-9]+)"?/gi,
    /"(?:views|view_count)"\s*:\s*"?([0-9]+)"?/gi,
  ];
  for (const pattern of jsonPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html))) {
      values.push(Number(match[1]));
    }
  }

  let visibleMatch: RegExpExecArray | null;
  const visiblePattern = /([0-9][0-9,]*(?:\.[0-9]+)?\s*[KkMm]?)\s+(?:views|plays)/g;
  while ((visibleMatch = visiblePattern.exec(html))) {
    const value = parseAbbreviatedNumber(visibleMatch[1]);
    if (value !== null) values.push(value);
  }

  if (values.length === 0) return null;
  return Math.max(...values.filter((value) => Number.isFinite(value)));
}

function parseAbbreviatedNumber(raw: string): number | null {
  const compact = raw.replace(/,/g, "").trim();
  const match = compact.match(/^([0-9]+(?:\.[0-9]+)?)([KkMm])?$/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") return Math.round(base * 1_000);
  if (suffix === "m") return Math.round(base * 1_000_000);
  return Math.round(base);
}

function findFoundingDate(text: string): {
  date: string | null;
  year: number | null;
  evidence: string | null;
} {
  const patterns = [
    /\b(?:founded|established|started|opened)\s+(?:in\s+)?((?:18|19|20)\d{2})\b/i,
    /\b(?:since)\s+((?:18|19|20)\d{2})\b/i,
    /\bserving[^.]{0,80}\bsince\s+((?:18|19|20)\d{2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = Number(match[1]);
      return {
        date: String(year),
        year,
        evidence: text.slice(Math.max(0, match.index ?? 0), (match.index ?? 0) + 180).trim(),
      };
    }
  }

  return { date: null, year: null, evidence: null };
}

function detectFranchise(
  businessName: string,
  websiteText: string
): { isFranchise: boolean; reason: string } {
  const haystack = `${businessName}\n${websiteText}`.toLowerCase();
  const known = KNOWN_DENTAL_FRANCHISES.find((name) => haystack.includes(name));
  if (known) {
    return { isFranchise: true, reason: `Matched known dental group: ${known}` };
  }
  if (/franchise opportunit|own a franchise|become a franchisee/i.test(websiteText)) {
    return { isFranchise: true, reason: "Website mentions franchise opportunities" };
  }
  if (/locations nationwide|find a location|over \d+ locations/i.test(websiteText)) {
    return { isFranchise: true, reason: "Website language suggests a multi-location chain" };
  }
  return { isFranchise: false, reason: "No franchise signals found" };
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function isSafeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (
      /^(127|10|0)\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host === "::1"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

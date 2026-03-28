/**
 * Google Search Console API integration stub.
 *
 * Required env: GSC_SITE_URL, GOOGLE_SERVICE_ACCOUNT_KEY (shared with GA4)
 * Docs: https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

export interface GSCKeywordData {
  keyword: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  url: string;
}

export interface GSCSiteSummary {
  totalClicks: number;
  totalImpressions: number;
  averagePosition: number;
  averageCtr: number;
}

/**
 * Fetch top keyword rankings from Search Console.
 * TODO: Replace with real GSC API call.
 * Endpoint: POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 */
export async function fetchKeywordRankings(_days: number): Promise<GSCKeywordData[]> {
  // TODO: Implement using GSC_SITE_URL + service account credentials
  return [];
}

/**
 * Fetch site-level search performance summary.
 * TODO: Replace with real API call.
 */
export async function fetchSiteSummary(_days: number): Promise<GSCSiteSummary> {
  // TODO: Implement real API call
  return { totalClicks: 0, totalImpressions: 0, averagePosition: 0, averageCtr: 0 };
}

/**
 * Google Analytics 4 Data API integration stub.
 *
 * Required env: GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_KEY
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

export interface GA4PageViewsReport {
  date: string;
  totalViews: number;
  uniqueVisitors: number;
}

export interface GA4TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
}

/**
 * Fetch daily page views report.
 * TODO: Replace with real GA4 Data API call.
 * Method: properties/{propertyId}:runReport
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchPageViews(_days: number): Promise<GA4PageViewsReport[]> {
  // TODO: Implement using GA4_PROPERTY_ID + service account credentials
  return [];
}

/**
 * Fetch traffic source breakdown.
 * TODO: Replace with real API call.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchTrafficSources(_days: number): Promise<GA4TrafficSource[]> {
  // TODO: Implement real API call
  return [];
}

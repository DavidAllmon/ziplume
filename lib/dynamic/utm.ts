export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

const KEYS = ["source", "medium", "campaign", "term", "content"] as const;

/** Adds utm_* parameters to a URL (replacing existing ones) for Google Analytics attribution. */
export function withUtm(url: string, params: UtmParams): string {
  const parsed = new URL(url);
  for (const key of KEYS) {
    const value = params[key]?.trim();
    if (value) parsed.searchParams.set(`utm_${key}`, value);
    else parsed.searchParams.delete(`utm_${key}`);
  }
  return parsed.toString();
}

export function readUtm(url: string): UtmParams {
  try {
    const params = new URL(url).searchParams;
    return {
      source: params.get("utm_source") ?? "",
      medium: params.get("utm_medium") ?? "",
      campaign: params.get("utm_campaign") ?? "",
      term: params.get("utm_term") ?? "",
      content: params.get("utm_content") ?? "",
    };
  } catch {
    return { source: "", medium: "", campaign: "", term: "", content: "" };
  }
}

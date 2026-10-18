import "server-only";

// Transactional email through Brevo's HTTP API. The key is a server-only secret entered in
// Coolify (BREVO_API_KEY); without it, nothing is sent and callers fall back to links.

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_FROM = "no-reply@techitdave.com";
const TIMEOUT_MS = 10_000;

type Env = Record<string, string | undefined>;

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
  /** Extra mail headers, such as List-Unsubscribe. */
  headers?: Record<string, string>;
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** True when this server can send email (BREVO_API_KEY is set). */
export function emailConfigured(env: Env = process.env): boolean {
  return Boolean(env.BREVO_API_KEY?.trim());
}

/** Sends one email. Never throws; a refusal or network problem comes back as an error code. */
export async function sendEmail(
  message: OutgoingEmail,
  { env = process.env, fetcher = fetch }: { env?: Env; fetcher?: typeof fetch } = {},
): Promise<SendResult> {
  const key = env.BREVO_API_KEY?.trim();
  if (!key) return { ok: false, error: "not-configured" };
  const from = env.INVITE_FROM_EMAIL?.trim() || DEFAULT_FROM;
  try {
    const response = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Ziplume", email: from },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? { ok: true } : { ok: false, error: `brevo-${response.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
}

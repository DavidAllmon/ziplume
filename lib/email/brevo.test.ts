// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { emailConfigured, sendEmail } from "./brevo";

const message = { to: "sam@cafe.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };
const ok = () => vi.fn<typeof fetch>(async () => new Response("{}", { status: 201 }));

describe("Brevo email", () => {
  it("is off without an API key, and sends nothing", async () => {
    const fetcher = ok();
    expect(emailConfigured({})).toBe(false);
    expect(emailConfigured({ BREVO_API_KEY: "  " })).toBe(false);
    expect(await sendEmail(message, { env: {}, fetcher })).toEqual({
      ok: false,
      error: "not-configured",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts the message from the QuickQReate sender", async () => {
    const fetcher = ok();
    const result = await sendEmail(
      { ...message, replyTo: { email: "david@example.com", name: "David" } },
      { env: { BREVO_API_KEY: "key-123" }, fetcher },
    );
    expect(result).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "api-key": "key-123" });
    expect(JSON.parse(String(init?.body))).toEqual({
      sender: { name: "QuickQReate", email: "no-reply@techitdave.com" },
      to: [{ email: "sam@cafe.com" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      textContent: "Hi",
      replyTo: { email: "david@example.com", name: "David" },
    });
  });

  it("uses INVITE_FROM_EMAIL as the sender when set", async () => {
    const fetcher = ok();
    await sendEmail(message, {
      env: { BREVO_API_KEY: "k", INVITE_FROM_EMAIL: "team@example.com" },
      fetcher,
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).sender.email).toBe(
      "team@example.com",
    );
  });

  it("reports refusals and network failures without throwing", async () => {
    const refused = vi.fn<typeof fetch>(async () => new Response("{}", { status: 401 }));
    expect(await sendEmail(message, { env: { BREVO_API_KEY: "k" }, fetcher: refused })).toEqual({
      ok: false,
      error: "brevo-401",
    });
    const down = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await sendEmail(message, { env: { BREVO_API_KEY: "k" }, fetcher: down })).toEqual({
      ok: false,
      error: "network",
    });
  });
});

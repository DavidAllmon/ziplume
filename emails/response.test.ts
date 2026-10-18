import { describe, expect, it } from "vitest";

import { responseEmail, responseLines, type ResponseEmailInput } from "./response";

const base: ResponseEmailInput = {
  kind: "rsvp",
  codeName: "Summer party",
  details: { name: "Ana", email: "ana@example.com", guests: 3, note: "Vegan" },
  receivedAt: "2030-01-02T12:30:00Z",
  codeUrl: "https://ziplume.example/codes/c1",
  offUrl: "https://ziplume.example/email/responses-off?c=c1&t=abc",
};

describe("responseEmail", () => {
  it("names only the code in the subject, never what a visitor typed", () => {
    expect(responseEmail(base).subject).toBe("New RSVP for “Summer party”");
    expect(
      responseEmail({ ...base, kind: "share", details: { name: "Click evil.example" } }).subject,
    ).toBe("New shared details on “Summer party”");
    expect(responseEmail({ ...base, kind: "feedback", details: {} }).subject).toBe(
      "New feedback on “Summer party”",
    );
    const odd = responseEmail({
      ...base,
      codeName: `Line one\r\nBcc: x@example.com ${"x".repeat(300)}`,
    });
    expect(odd.subject).not.toMatch(/[\r\n]/);
    expect(odd.subject.length).toBeLessThanOrEqual(200);
    expect(responseEmail({ ...base, codeName: "  " }).subject).toBe("New RSVP for “your code”");
  });

  it("shows what was sent, escaped in the HTML and plain in the text", () => {
    const { html, text } = responseEmail({
      ...base,
      details: { ...base.details, note: '<img src=x onerror="alert(1)">\nSecond line' },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    for (const part of ["Ana", "ana@example.com", "3", "Jan 2, 2030"]) {
      expect(html).toContain(part);
      expect(text).toContain(part);
    }
    expect(text).toContain('Note: <img src=x onerror="alert(1)">\nSecond line');
  });

  it("links to the code's page and to turning the emails off, in both versions", () => {
    const { html, text } = responseEmail(base);
    expect(html).toContain('href="https://ziplume.example/codes/c1"');
    expect(html).toContain('href="https://ziplume.example/email/responses-off?c=c1&amp;t=abc"');
    expect(text).toContain("See all responses: https://ziplume.example/codes/c1");
    expect(text).toContain("Turn them off: https://ziplume.example/email/responses-off?c=c1&t=abc");
  });
});

describe("responseLines", () => {
  it("lists each kind's details, leaving out what's empty", () => {
    expect(
      responseLines("feedback", {
        rating: 5,
        answers: [
          { question: "Food?", style: "stars", value: 5 },
          { question: "Back?", style: "thumbs", value: 1 },
        ],
        comment: "Lovely",
        contact: null,
      }),
    ).toEqual([
      ["Food?", "5 out of 5 stars"],
      ["Back?", "Thumbs up"],
      ["Comment", "Lovely"],
    ]);
    // From the older one-rating form.
    expect(responseLines("feedback", { rating: 4, answers: null, comment: null })).toEqual([
      ["Rating", "4 out of 5 stars"],
    ]);
    expect(
      responseLines("share", { name: "Ben", phone: "+1 555 0100", email: null, note: " " }),
    ).toEqual([
      ["Name", "Ben"],
      ["Phone", "+1 555 0100"],
    ]);
    expect(responseLines("rsvp", base.details)).toEqual([
      ["Name", "Ana"],
      ["Email", "ana@example.com"],
      ["Guests", "3"],
      ["Note", "Vegan"],
    ]);
  });
});

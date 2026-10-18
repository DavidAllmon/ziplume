import { describe, expect, it } from "vitest";

import { csvHref, rsvpsCsv, sharesCsv, usesCsv } from "./csv";

describe("visitor response CSVs", () => {
  it("writes a header and a line per row, quoting and defusing what visitors typed", () => {
    expect(
      sharesCsv([
        {
          id: 1,
          code_id: "c",
          created_at: "2030-01-01T12:00:00Z",
          name: "=HYPERLINK(1)",
          phone: null,
          email: "ana@example.com",
          note: 'Hi, "there"',
        },
      ]),
    ).toBe(
      'received_at,name,phone,email,note\r\n2030-01-01T12:00:00Z,\'=HYPERLINK(1),,ana@example.com,"Hi, ""there"""',
    );
    expect(
      rsvpsCsv([
        {
          id: 1,
          code_id: "c",
          created_at: "2030-01-01T12:00:00Z",
          name: "Ana",
          email: "ana@example.com",
          guests: 3,
          note: null,
        },
      ]),
    ).toBe("received_at,name,email,guests,note\r\n2030-01-01T12:00:00Z,Ana,ana@example.com,3,");
    expect(usesCsv([{ id: 1, code_id: "c", created_at: "2030-01-01T12:00:00Z" }])).toBe(
      "used_at\r\n2030-01-01T12:00:00Z",
    );
    expect(csvHref("a,b")).toBe("data:text/csv;charset=utf-8,a%2Cb");
  });
});

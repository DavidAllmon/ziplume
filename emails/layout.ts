export interface EmailLayoutInput {
  /** The <title>; also used as the heading unless `heading` is given. */
  title: string;
  /** Trusted HTML for the heading (callers escape anything a person typed). */
  heading?: string;
  /** Trusted HTML paragraphs under the heading. */
  body: string;
  button: { label: string; href: string };
  /** Shown under "If the button doesn't work…"; defaults to the button's link. */
  fallbackLink?: string;
  /** The small print under the button. */
  note: string;
  /** Where /brand/email-header.png lives (an origin, or "{{ .SiteURL }}" in sign-in emails). */
  siteUrl: string;
  /** Extra footer HTML after the tagline (for example a support link). */
  footerExtra?: string;
}

/** Every Ziplume email: a navy header band, a white card, one navy button. */
export function emailLayout(input: EmailLayoutInput): string {
  const fallback = input.fallbackLink ?? input.button.href;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a1330;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #dce3ed;overflow:hidden;">
            <tr>
              <td style="background:#0a1330;padding:0;">
                <img src="${input.siteUrl}/brand/email-header.png" width="520" height="80" alt="Ziplume" style="display:block;width:100%;max-width:520px;height:auto;border:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:3px;line-height:80px;text-align:center;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;">
                <h1 style="margin:0 0 12px;font-size:21px;line-height:1.35;color:#0a1330;">${input.heading ?? input.title}</h1>
                ${input.body}
                <a href="${input.button.href}" style="display:inline-block;background:#0a1330;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${input.button.label}</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#45506a;">If the button doesn't work, copy this link into your browser:<br /><a href="${fallback}" style="color:#0b6e8c;word-break:break-all;">${fallback}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#45506a;">${input.note}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#45506a;">Ziplume · Make it. Link it. Share it.${input.footerExtra ?? ""}</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/** A body paragraph in the layout's style. */
export const paragraph = (html: string) =>
  `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#45506a;">${html}</p>`;

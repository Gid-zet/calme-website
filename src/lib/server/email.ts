import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Transactional email.
 *  - RESEND_API_KEY + EMAIL_FROM set → sent through Resend's HTTP API (no SDK needed).
 *  - Otherwise (local development) → written to .data/outbox/*.html and the link is logged to the console.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) console.error(`[email] Resend rejected "${subject}": ${res.status} ${await res.text()}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.error(`[email] RESEND_API_KEY/EMAIL_FROM not configured; "${subject}" was not sent.`);
    return;
  }
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "outbox");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${to.replace(/[^a-z0-9@.]/gi, "_")}.html`);
  await fs.writeFile(file, `<!-- To: ${to} | Subject: ${subject} -->\n${html}`);
  console.info(`[email:dev] To ${to}: ${subject}\n${text}\n(saved to ${path.relative(process.cwd(), file)})`);
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;color:#4a5078;font-size:15px;line-height:1.6">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="background:#1f6fe5;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:99px;border:2px solid #14193a;display:inline-block">${escapeHtml(cta.label)}</a></p>
       <p style="margin:0 0 14px;color:#4a5078;font-size:13px">Or paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fffaf2;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="font-size:22px;font-weight:800;color:#14193a;margin:0 0 24px">CalMe</p>
    <div style="background:#fff;border:2px solid #14193a;border-radius:20px;padding:28px">
      <h1 style="font-size:22px;color:#14193a;margin:0 0 16px">${escapeHtml(heading)}</h1>${body}${button}
    </div>
    <p style="color:#8a8fb0;font-size:12px;margin-top:20px">If you're in crisis, don't wait for an appointment: contact your local emergency services.</p>
  </div></body></html>`;
}

export const emails = {
  verify(name: string, url: string) {
    return {
      subject: "Confirm your email for CalMe",
      html: layout(`Welcome, ${escapeHtml(name)}`, ["Please confirm your email address to finish setting up your CalMe account. This link expires in 24 hours."], { label: "Confirm email", url }),
      text: `Confirm your email: ${url} (expires in 24 hours)`,
    };
  },
  reset(name: string, url: string) {
    return {
      subject: "Reset your CalMe password",
      html: layout("Reset your password", [`Hi ${escapeHtml(name)}, we received a request to reset your password. This link expires in 1 hour and can be used once.`, "If you didn't ask for this, you can ignore this email; your password won't change."], { label: "Choose a new password", url }),
      text: `Reset your password: ${url} (expires in 1 hour)`,
    };
  },
  invite(name: string, inviter: string, url: string) {
    return {
      subject: "You've been invited to administer CalMe",
      html: layout(`Hi ${escapeHtml(name)}`, [`${escapeHtml(inviter)} invited you to join CalMe as an administrator. Set your password to activate your account. This invitation expires in 72 hours.`], { label: "Accept invitation", url }),
      text: `Accept your CalMe admin invitation: ${url} (expires in 72 hours)`,
    };
  },
  generic(heading: string, lines: string[], cta?: { label: string; url: string }) {
    return {
      subject: heading,
      html: layout(heading, lines.map(escapeHtml), cta),
      text: [...lines, cta ? `${cta.label}: ${cta.url}` : ""].join("\n"),
    };
  },
};

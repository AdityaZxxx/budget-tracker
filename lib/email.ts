const RESEND_EMAILS_URL = "https://api.resend.com/emails";

let missingConfigWarningLogged = false;

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    if (!missingConfigWarningLogged) {
      missingConfigWarningLogged = true;
      console.warn(
        "RESEND_API_KEY/RESEND_FROM not set; skipping email send (local dev)."
      );
    }
    return;
  }

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!response.ok) {
      console.error(
        `Resend email failed (${response.status}): ${await response.text()}`
      );
    }
  } catch (error) {
    console.error("Resend email request failed:", error);
  }
}

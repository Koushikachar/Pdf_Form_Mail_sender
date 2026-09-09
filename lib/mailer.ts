import nodemailer from "nodemailer";
import path from "path";

// Free mail sender using Gmail SMTP (works with any Gmail account + an
// "app password"). Swap this transport out later for Resend/SendGrid/etc.
// if you outgrow Gmail's sending limits — the rest of the app doesn't change.
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars. See .env.example.",
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// Vercel serverless functions only ship the exact files Next.js's build-time
// file tracer can statically detect. Because the PDF path used to come from
// an env var (a dynamic value), the tracer couldn't see it and silently left
// the PDF out of the deployed function — so fs.readFileSync worked locally
// (full project on disk) but failed on Vercel ("PDF not found").
//
// Fix: don't read the file from the function's local disk at all. Files in
// /public are always served by Vercel's CDN at a real URL no matter what the
// tracer decides to bundle, so fetch it from there instead.
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendPdfToUser(name: string, toEmail: string) {
  const transporter = getTransporter();

  // Strip accidental wrapping quotes from a malformed env value, and make
  // sure it starts with a single leading slash for the URL path below.
  const rawPdfPath = (process.env.PDF_FILE_PATH || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^public\//, "")
    .replace(/^\/?/, "/");
  const pdfUrlPath =
    rawPdfPath !== "/"
      ? rawPdfPath
      : "/documents/PostgreSQL_SQL_Zero_to_Mastery.pdf";

  const pdfUrl = `${getBaseUrl()}${pdfUrlPath}`;
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    throw new Error(
      `PDF not found at ${pdfUrl} (status ${res.status}). ` +
        `Check that the file is committed under /public and that PDF_FILE_PATH / NEXT_PUBLIC_SITE_URL are set correctly on Vercel.`,
    );
  }
  const pdfBuffer = Buffer.from(await res.arrayBuffer());

  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

  await transporter.sendMail({
    from: `"Team" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: adminEmail,
    subject: "Here is your PDF",
    text: `Hi ${name},\n\nThanks for filling out the form. Please find your PDF attached.\n\nBest,\nTeam`,
    html: `<p>Hi ${name},</p><p>Thanks for filling out the form. Please find your PDF attached.</p><p>Best,<br/>Team</p>`,
    attachments: [
      {
        filename: path.basename(pdfUrlPath),
        content: pdfBuffer,
      },
    ],
  });
}

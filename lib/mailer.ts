import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Free mail sender using Gmail SMTP (works with any Gmail account + an
// "app password"). Swap this transport out later for Resend/SendGrid/etc.
// if you outgrow Gmail's sending limits — the rest of the app doesn't change.
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars. See .env.example."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendPdfToUser(name: string, toEmail: string) {
  const transporter = getTransporter();

  const relativePdfPath = process.env.PDF_FILE_PATH || "public/documents/dummy.pdf";
  const absolutePdfPath = path.join(process.cwd(), relativePdfPath);

  if (!fs.existsSync(absolutePdfPath)) {
    throw new Error(
      `PDF not found at ${absolutePdfPath}. Place a file there or update PDF_FILE_PATH.`
    );
  }

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
        filename: path.basename(absolutePdfPath),
        path: absolutePdfPath,
      },
    ],
  });
}

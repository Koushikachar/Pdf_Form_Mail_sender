import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables.",
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPdfToUser(name: string, toEmail: string) {
  const transporter = getTransporter();

  // Your PDF is inside:
  // public/documents/PostgreSQL_SQL_Zero_to_Mastery.pdf

  const pdfUrl =
    process.env.PDF_URL ||
    `${process.env.APP_URL}/documents/PostgreSQL_SQL_Zero_to_Mastery.pdf`;

  if (!pdfUrl) {
    throw new Error("PDF_URL or APP_URL is missing.");
  }

  console.log("Fetching PDF from:", pdfUrl);

  const response = await fetch(pdfUrl);

  if (!response.ok) {
    throw new Error(
      `Could not fetch PDF. HTTP ${response.status} from ${pdfUrl}`,
    );
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

  await transporter.sendMail({
    from: `"Team" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: adminEmail,
    subject: "Here is your PDF",

    text: `Hi ${name},

Thanks for filling out the form.

Please find your PDF attached.

Best,
Team`,

    html: `
      <p>Hi ${name},</p>
      <p>
        Thanks for filling out the form.
        Please find your PDF attached.
      </p>
      <p>Best,<br>Team</p>
    `,

    attachments: [
      {
        filename: "PostgreSQL_SQL_Zero_to_Mastery.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

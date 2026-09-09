import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPdfToUser } from "@/lib/mailer";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body?.name || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Server-side source of truth: one submission per email, ever.
    const existing = await prisma.submission.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        {
          alreadySubmitted: true,
          message: "You have already filled the form.",
        },
        { status: 409 },
      );
    }

    const submission = await prisma.submission.create({
      data: { name, email },
    });

    try {
      await sendPdfToUser(name, email);
      await prisma.submission.update({
        where: { id: submission.id },
        data: { emailSent: true },
      });
    } catch (mailErr) {
      // Submission is saved even if the email fails — log it so the admin
      // can resend manually. We don't fail the whole request for this.
      console.error("Failed to send PDF email:", mailErr);
      return NextResponse.json(
        {
          success: true,
          emailSent: false,
          message:
            "Form submitted, but we couldn't send the email right now. The admin will follow up.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        emailSent: true,
        message: "Form submitted! Check your inbox for the PDF.",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

// Lets the frontend check "has this email already submitted?" without
// re-submitting the whole form — used for the localStorage + refresh case.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "email query param required" },
      { status: 400 },
    );
  }
  const existing = await prisma.submission.findUnique({ where: { email } });
  return NextResponse.json({ alreadySubmitted: !!existing });
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { sendPdfToUser } from "@/lib/mailer";

// function isValidEmail(email: string) {
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();

//     const name = (body?.name || "").toString().trim();
//     const email = (body?.email || "").toString().trim().toLowerCase();

//     if (!name || !email) {
//       return NextResponse.json(
//         { error: "Name and email are required." },
//         { status: 400 },
//       );
//     }

//     if (!isValidEmail(email)) {
//       return NextResponse.json(
//         { error: "Please enter a valid email address." },
//         { status: 400 },
//       );
//     }

//     // TEST MODE:
//     // No duplicate-email check.
//     // The same email can submit unlimited times.

//     const submission = await prisma.submission.create({
//       data: {
//         name,
//         email,
//       },
//     });

//     try {
//       await sendPdfToUser(name, email);

//       await prisma.submission.update({
//         where: {
//           id: submission.id,
//         },
//         data: {
//           emailSent: true,
//         },
//       });

//       return NextResponse.json(
//         {
//           success: true,
//           emailSent: true,
//           message: "Form submitted! Check your inbox for the PDF.",
//         },
//         { status: 200 },
//       );
//     } catch (mailErr) {
//       console.error("Failed to send PDF email:", mailErr);

//       return NextResponse.json(
//         {
//           success: true,
//           emailSent: false,
//           message: "Form submitted, but the email could not be sent.",
//         },
//         { status: 200 },
//       );
//     }
//   } catch (err) {
//     console.error("Submit error:", err);

//     return NextResponse.json(
//       {
//         error: "Something went wrong. Please try again.",
//       },
//       { status: 500 },
//     );
//   }
// }

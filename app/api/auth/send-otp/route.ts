import { NextResponse } from "next/server";
import { Resend } from "resend";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// 🎨 PREMIUM EMAIL TEMPLATE FUNCTION
const getEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #1877F2; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; text-align: center; color: #111827; }
    .content p { font-size: 16px; line-height: 1.5; color: #4b5563; margin-top: 0; }
    .otp-box { background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; display: inline-block; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BaseKey</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px;">Your Secure Verification Code</h2>
      <p>Please use the verification code below to continue with your BaseKey workspace.</p>
      
      <div class="otp-box">${otp}</div>
      
      <p style="font-size: 14px;">This code is valid for <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      Secured by BaseKey Infrastructure<br>
      © ${new Date().getFullYear()} BaseKey. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

export async function POST(req: Request) {
  try {
    // Frontend se email aur type ("register" ya "forgot") dono aayenge
    const { email, type } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 🔥 NAYA LOGIC: Check karo ki user database me pehle se hai ya nahi
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // 1. Agar Register kar raha hai aur pehle se account hai -> Rok do
    if (type === "register" && existingUser) {
      return NextResponse.json({ error: "Email already registered. Please login." }, { status: 400 });
    }

    // 2. Agar Forgot Password kar raha hai aur account hi nahi hai -> Rok do
    if (type === "forgot" && !existingUser) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
    }

    // 3. Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 4. Expiry time set karna (Current time + 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 5. Database me purane OTP delete karke naya save karna
    await prisma.otpCode.deleteMany({
      where: { email }
    });

    await prisma.otpCode.create({
      data: {
        email,
        code: otp,
        expiresAt
      }
    });

    // 6. Dynamic subject banaya (Register ke liye alag, Forgot ke liye alag)
    const emailSubject = type === "register" 
      ? 'Welcome to BaseKey - Verify your email' 
      : 'Reset your BaseKey Password';

    // 7. Resend ke zariye Email bhejna
    const { data, error } = await resend.emails.send({
      from: 'BaseKey Security <care@basekey.in>', // 🔥 Yahan change kiya hai (care@basekey.in)
      to: [email],
      subject: emailSubject,
      html: getEmailTemplate(otp), 
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" }, { status: 200 });

  } catch (error) {
    console.error("OTP API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

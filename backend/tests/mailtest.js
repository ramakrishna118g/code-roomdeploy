import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function sendOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "ramakrishna118g@gmail.com",
    subject: "OTP Verification",
    text: `Your OTP is ${otp}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP sent:", otp);
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.log("Error sending mail:", error);
  }
}

sendOTP();

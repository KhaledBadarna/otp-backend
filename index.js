// index.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

// تخزين مؤقت (لاحقًا DB)
const otpStore = new Map();

// توليد OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
}

// إرسال OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "phone required" });
  }
  if (!phone.startsWith("+972")) {
    return res.status(400).json({ error: "invalid country" });
  }

  const otp = generateOTP();
  otpStore.set(phone, otp);

  try {
    await client.messages.create({
      body: `كود الدخول: ${otp}`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone,
    });
  } catch (err) {
    console.error("Twilio error:", err.message);
    return res.status(500).json({ error: "sms failed" });
  }

  res.json({ success: true });
});

// التحقق من OTP + إصدار توكن
app.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;

  if (!otpStore.has(phone)) {
    return res.status(400).json({ error: "otp expired" });
  }

  if (otpStore.get(phone) !== code) {
    return res.status(401).json({ error: "invalid otp" });
  }

  otpStore.delete(phone);

  const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    success: true,
    token,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("OTP server running on port", PORT);
});

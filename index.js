// index.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
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

// إرسال OTP (يدعم SMS و WhatsApp)
// ✅ التعديل الجديد في دالة الإرسال
app.post("/send-otp", async (req, res) => {
  const { phone, channel } = req.body;

  if (!phone) return res.status(400).json({ error: "phone required" });
  if (!phone.startsWith("+972"))
    return res.status(400).json({ error: "invalid country" });

  const otp = generateOTP();
  otpStore.set(phone, otp);

  try {
    let messageOptions;

    if (channel === "whatsapp") {
      messageOptions = {
        from: "whatsapp:+14155238886", // رقم الساندبوكس الموحد من تويليو
        to: `whatsapp:${phone}`,
        body: `Your SHAFRA code is: ${otp}`, // نص عادي بدون قوالب عشان يوصل فوراً
      };
    } else {
      messageOptions = {
        body: `Your SHAFRA verification code is: ${otp}`,
        from: process.env.TWILIO_FROM,
        to: phone,
      };
    }

    await client.messages.create(messageOptions);
    res.json({ success: true, channel: channel || "sms" });
  } catch (err) {
    console.error("Twilio error:", err.message);
    return res.status(500).json({ error: "failed to send message" });
  }
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

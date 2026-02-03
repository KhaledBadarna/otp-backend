// index.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "dev_secret_change_later";

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

  // TODO: اربط مزوّد SMS هون
  console.log("OTP:", phone, otp);

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

app.listen(3000, () => {
  console.log("OTP server running on http://localhost:3000");
});

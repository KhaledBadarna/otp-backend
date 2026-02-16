require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");

// تعديل هنا: لا تجعل البرنامج ينهار (Throw Error) بل أعطه قيمة افتراضية مؤقتة
const JWT_SECRET = process.env.JWT_SECRET || "temporary_key_for_now";

const app = express();
// ... باقي الكود كما هو
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing in .env");
}

app.use(cors());
app.use(express.json());

const otpStore = new Map();

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });

  const cleanPhone = phone.replace("+", "");
  const otp = generateOTP();
  const API_KEY = process.env.GLOBAL_SMS_KEY;
  const message = `Your SHAFRA code is: ${otp}`;

  // التنسيق الحرفي المطلوب حسب ملف node.js المرفق
  const xmlBody =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
    "<soap12:Body>" +
    '<sendSmsToRecipients xmlns="apiGlobalSms">' + // الـ Namespace المطلوب
    "<ApiKey>" +
    API_KEY +
    "</ApiKey>" +
    "<txtOriginator>0542636724</txtOriginator>" +
    "<destinations>" +
    cleanPhone +
    "</destinations>" +
    "<txtSMSmessage>" +
    message +
    "</txtSMSmessage>" +
    "<dteToDeliver></dteToDeliver>" +
    "<txtAddInf>jsnodetest</txtAddInf>" +
    "</sendSmsToRecipients>" +
    "</soap12:Body>" +
    "</soap12:Envelope>";

  try {
    const response = await axios.post(
      "http://api.itnewsletter.co.il/webservices/WsSMS.asmx", // الرابط الرسمي
      xmlBody,
      {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8", // نوع المحتوى لـ Soap 1.2
          SOAPAction: "apiGlobalSms/sendSmsToRecipients", // الأكشن المطلوب حرفياً
        },
      },
    );

    console.log("Response From Global:", response.data);
    otpStore.set(phone, otp);
    res.json({ success: true, message: "OTP Sent" });
  } catch (err) {
    console.log("Error Details:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed", details: err.message });
  }
});
app.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;
  if (otpStore.get(phone) === code) {
    otpStore.delete(phone);
    const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, token });
  }
  res.status(401).json({ error: "invalid otp" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
  otpStore.set(phone, otp);

  try {
    const API_KEY = process.env.GLOBAL_SMS_KEY;
    const message = `Your SHAFRA code is: ${otp}`;

    // استخدمنا الـ XML لأنه الأضمن حسب الوثيقة، وضفنا User-Agent عشان ريندر
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <sendSmsToRecipients xmlns="http://api.itnewsletter.co.il/webservices/">
          <ApiKey>${API_KEY}</ApiKey>
          <txtOriginator>0542636724</txtOriginator>
          <destinations>${cleanPhone}</destinations>
          <txtSMSmessage>${message}</txtSMSmessage>
          <dteToDeliver></dteToDeliver>
          <txtAddInf></txtAddInf>
        </sendSmsToRecipients>
      </soap:Body>
    </soap:Envelope>`;

    const response = await axios.post(
      `https://api.itnewsletter.co.il/webservices/wssms.asmx`, // جرب https هون
      xmlBody,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://api.itnewsletter.co.il/webservices/sendSmsToRecipients",
          "User-Agent": "RenderServer/1.0",
        },
      },
    );

    console.log("Response From Global:", response.data);
    res.json({ success: true, otp }); // رجعنا الـ OTP بس عشان تتأكد إنه السيرفر شغال
  } catch (err) {
    console.log("Error Status:", err.response?.status);
    res.status(500).json({ error: "Failed", message: err.message });
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

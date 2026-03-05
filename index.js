require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// مخزن مؤقت: بيحفظ الرقم والكود تبعه
// { "972542636724": "5566" }
const codes = {};

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("972")
    ? digits
    : `972${digits.startsWith("0") ? digits.slice(1) : digits}`;

  // ⚠️ بنحفظ الكود في المخزن قبل ما نبعثه
  codes[formattedPhone] = otp;
  console.log("Saved Code:", formattedPhone, otp);

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <sendSmsToRecipients xmlns="apiGlobalSms">
      <ApiKey>${process.env.GLOBAL_SMS_KEY}</ApiKey>
      <txtOriginator>SHAFRA</txtOriginator>
      <destinations>${formattedPhone}</destinations>
      <txtSMSmessage>Your code is: ${otp}</txtSMSmessage>
    </sendSmsToRecipients>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    await axios.post(
      "https://sapi.itnewsletter.co.il/webservices/WsSMS.asmx",
      xml,
      {
        headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "SMS failed" });
  }
});

// دالة التأكد (المقارنة)
app.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;
  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("972")
    ? digits
    : `972${digits.startsWith("0") ? digits.slice(1) : digits}`;

  // بنشوف شو الكود اللي حفظناه لهذا الرقم
  const savedOtp = codes[formattedPhone];

  if (savedOtp && savedOtp === code) {
    delete codes[formattedPhone]; // بنمسحه عشان الأمان بعد ما دخل
    res.json({ success: true, token: "login-success-token" });
  } else {
    res.status(400).json({ error: "الكود غلط" });
  }
});

app.listen(3000, () => console.log("Server running on 3000"));

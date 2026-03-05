require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const codes = {};

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("972")
    ? digits
    : `972${digits.startsWith("0") ? digits.slice(1) : digits}`;

  codes[formattedPhone] = otp;
  console.log("Saving Code for:", formattedPhone, "Code:", otp);

  // الـ XML لازم يكون مرتب سطر بسطر عشان الـ SOAP يفهمه صح
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <sendSmsToRecipients xmlns="apiGlobalSms">
      <ApiKey>${process.env.GLOBAL_SMS_KEY}</ApiKey>
      <txtOriginator>0542636724</txtOriginator>
      <destinations>${formattedPhone}</destinations>
      <txtSMSmessage>Your code is: ${otp}</txtSMSmessage>
      <dteToDeliver></dteToDeliver>
      <txtAddInf></txtAddInf>
    </sendSmsToRecipients>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await axios.post(
      "https://sapi.itnewsletter.co.il/webservices/WsSMS.asmx",
      xml,
      {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction: "apiGlobalSms/sendSmsToRecipients", // ضفنا هاد عشان الدقة
        },
      },
    );

    console.log("Global SMS Response:", response.data);
    res.json({ success: true });
  } catch (err) {
    console.error(
      "Axios Error:",
      err.response ? err.response.data : err.message,
    );
    res.status(500).json({ error: "SMS failed" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;
  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("972")
    ? digits
    : `972${digits.startsWith("0") ? digits.slice(1) : digits}`;

  const savedOtp = codes[formattedPhone];
  console.log(`Checking: ${code} against saved: ${savedOtp}`);

  if (savedOtp && savedOtp === code) {
    delete codes[formattedPhone];
    res.json({ success: true, token: "login-success-token" });
  } else {
    res.status(400).json({ error: "Invalid Code" });
  }
});

app.listen(3000, () => console.log("Server running on 3000"));

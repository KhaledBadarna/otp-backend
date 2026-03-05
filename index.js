require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const MY_API_KEY = process.env.GLOBAL_SMS_KEY;

  if (!MY_API_KEY) {
    console.error("GLOBAL_SMS_KEY missing");
    return res.status(500).json({ error: "Server config error" });
  }

  const digits = phone.replace(/\D/g, "");
  // تصحيح: إذا الرقم واصل 054، بصير 97254. إذا واصل 97254، بضل 97254.
  let formattedPhone;
  if (digits.startsWith("972")) {
    formattedPhone = digits;
  } else {
    formattedPhone = `972${digits.startsWith("0") ? digits.slice(1) : digits}`;
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <sendSmsToRecipients xmlns="apiGlobalSms">
      <ApiKey>${MY_API_KEY}</ApiKey>
      <txtOriginator>0542636724</txtOriginator> <destinations>${formattedPhone}</destinations>
      <txtSMSmessage>Your code is: ${otp}</txtSMSmessage>
      <dteToDeliver></dteToDeliver>
      <txtAddInf>otp-test</txtAddInf>
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
          "Content-Length": Buffer.byteLength(xml),
          SOAPAction: "apiGlobalSms/sendSmsToRecipients",
        },
      },
    );

    // هذا السطر هو اللي رح يحل اللغز
    console.log("FULL XML RESPONSE FROM GLOBAL SMS:", response.data);

    res.json({
      success: true,
      apiResponse: response.data, // ابعت الرد للتطبيق عندك عشان تشوفه بالتيست
    });
  } catch (err) {
    console.error("NETWORK ERROR:", err.message);
    res.status(500).json({ error: "Network failed" });
  }
});

app.listen(3000, () => console.log("Server running on 3000"));

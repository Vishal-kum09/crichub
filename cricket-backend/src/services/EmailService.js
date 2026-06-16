const nodemailer = require('nodemailer');

// Initialize the SMTP transporter using official Google Gmail configurations
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Protocol lock for SSL/TLS transmission
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Dispatches a secure, high-visibility HTML verification OTP token to the user
 * @param {string} toEmail - The target recipient email address
 * @param {string} otpCode - The generated 6-digit numeric OTP verification string
 * @returns {Promise<object>} Response payload containing status indicators
 */
async function sendOtpEmail(toEmail, otpCode) {
  const mailOptions = {
    from: `"CricketHub Core" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🏏 CricketHub - Account Verification OTP Code',
    html: `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 26px; font-weight: 900; color: #e60023; letter-spacing: -0.03em;">CricketHub</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 10px; text-align: center; color: #1a1a1a;">Security Verification Code</h3>
        <p style="font-size: 13px; color: #4a5568; line-height: 1.6; text-align: center; margin-bottom: 24px;">
          Please utilize the following single-use verification code to authenticate your current action. For optimal security, this registration token remains valid for 5 minutes only.
        </p>
        <div style="background-color: #f7fafc; border: 2px dashed #cbd5e1; padding: 18px; border-radius: 14px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #000000; font-family: 'Courier New', Courier, monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If you did not initiate this system validation token request, please disregard this communication safely. Do not share this operational credential parameter with anyone under any circumstances.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`🚀 Verification token dispatched successfully to ${toEmail}. MsgID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ NodeMailer engine encountered transmission layer fault:", error);
    throw new Error("SMTP channel communication failure: Unable to deliver email payload parameters.");
  }
}

module.exports = { sendOtpEmail };
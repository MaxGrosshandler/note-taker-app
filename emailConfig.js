const nodemailer = require('nodemailer');

let transporter = null;
let userEmail = null;

// Initialize email transporter with Gmail credentials
function initializeTransporter() {
  const email = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!email || !password) {
    throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file.');
  }

  userEmail = email;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });

  return transporter;
}

// Send email with note content
async function sendEmail(to, subject, content) {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      initializeTransporter();
    }

    const mailOptions = {
      from: userEmail,
      to: to,
      subject: subject,
      text: content,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
               <h2 style="color: #2c3e50;">${subject}</h2>
               <div style="white-space: pre-wrap; line-height: 1.6; color: #34495e;">
                 ${content.replace(/\n/g, '<br>')}
               </div>
               <hr style="margin-top: 30px; border: none; border-top: 1px solid #ecf0f1;">
               <p style="color: #95a5a6; font-size: 12px;">Sent from Notes App</p>
             </div>`
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Check if email is configured
function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Get the configured user's email
function getUserEmail() {
  return process.env.GMAIL_USER || null;
}

module.exports = {
  sendEmail,
  isConfigured,
  getUserEmail
};

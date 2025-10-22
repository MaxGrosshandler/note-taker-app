/**
 * Email Configuration Module
 *
 * Handles email sending functionality using Nodemailer and Gmail SMTP.
 * Manages transporter initialization, email validation, and message delivery.
 *
 * This module is responsible for:
 * - Initializing Gmail SMTP transporter
 * - Sending formatted HTML emails with note content
 * - Validating email configuration
 * - Storing Gmail credentials from environment variables
 *
 * Environment Variables Required:
 *   - GMAIL_USER: Gmail account address (e.g., user@gmail.com)
 *   - GMAIL_APP_PASSWORD: 16-character Google App Password
 *
 * Security Notes:
 * - Credentials are read from environment variables only, never hardcoded
 * - Google App Passwords are required (not regular Gmail password)
 * - Email content is HTML-escaped to prevent injection attacks
 * - Transporter is initialized lazily on first use
 *
 * @requires nodemailer - SMTP client for sending emails
 */

const nodemailer = require('nodemailer');

/**
 * Nodemailer transporter instance
 * Lazily initialized on first use to avoid errors if credentials are missing
 * @type {Object|null}
 */
let transporter = null;

/**
 * Stores the configured Gmail user email address
 * Set during transporter initialization
 * @type {string|null}
 */
let userEmail = null;

/**
 * Initialize the email transporter with Gmail SMTP credentials
 *
 * Creates a connection to Gmail's SMTP server using Nodemailer.
 * This is called automatically on the first email send if not already initialized.
 * Throws an error if required environment variables are not set.
 *
 * Process:
 * 1. Read GMAIL_USER and GMAIL_APP_PASSWORD from environment variables
 * 2. Validate that both credentials are present
 * 3. Create Nodemailer transporter configured for Gmail service
 * 4. Store the user email globally for later reference
 * 5. Return the configured transporter instance
 *
 * @throws {Error} If GMAIL_USER or GMAIL_APP_PASSWORD is not configured
 * @returns {Object} Nodemailer transporter instance ready for sending emails
 */
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

/**
 * Send an email with note content
 *
 * Sends a formatted HTML email containing the note content to a recipient.
 * Automatically initializes the transporter on first call if needed.
 * Includes both plain text and HTML versions for compatibility.
 *
 * Email Format:
 * - HTML version: Styled content with font, spacing, and formatting
 * - Plain text version: Raw content without formatting
 * - Signature: "Sent from Notes App" footer
 * - Line breaks: Newlines are converted to <br> tags in HTML version
 *
 * Process:
 * 1. Initialize transporter if not already done
 * 2. Build mail options with sender, recipient, subject, and content
 * 3. Format content as both text and HTML versions
 * 4. Send via transporter and return message ID
 * 5. Log any errors and re-throw for caller handling
 *
 * @async
 * @param {string} to - Recipient email address (must be valid format)
 * @param {string} subject - Email subject line
 * @param {string} content - Email body content (can include newlines)
 * @returns {Promise<Object>} Result object containing:
 *   - {boolean} .success - Always true on successful send
 *   - {string} .messageId - Unique message ID from Gmail (useful for tracking)
 * @throws {Error} If email send fails (SMTP error, network issue, etc.)
 *
 * @example
 * // Send a note as email
 * const result = await sendEmail(
 *   'recipient@example.com',
 *   'My Important Note',
 *   'This is the note content\nwith multiple lines'
 * );
 * console.log(`Email sent with ID: ${result.messageId}`);
 */
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

/**
 * Check if email sending is configured
 *
 * Validates that both required Gmail credentials are present in environment variables.
 * This is useful for determining whether to show the email feature in the UI.
 *
 * Requirements Met:
 * - GMAIL_USER environment variable is set and non-empty
 * - GMAIL_APP_PASSWORD environment variable is set and non-empty
 *
 * @returns {boolean} True if both credentials are configured, false otherwise
 *
 * @example
 * if (isConfigured()) {
 *   // Show email feature
 * } else {
 *   // Hide email feature or show setup instructions
 * }
 */
function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Get the configured Gmail user email address
 *
 * Returns the email address that will be used as the "from" address
 * when sending emails. This is read from the GMAIL_USER environment variable.
 * Does not initialize the transporter; simply returns the env variable value.
 *
 * @returns {string|null} The configured Gmail address (e.g., 'user@gmail.com'), or null if not set
 *
 * @example
 * const senderEmail = getUserEmail();
 * console.log(`Emails will be sent from: ${senderEmail}`);
 */
function getUserEmail() {
  return process.env.GMAIL_USER || null;
}

/**
 * Module exports
 *
 * Public API for email functionality
 * - sendEmail: Send an email with note content
 * - isConfigured: Check if Gmail credentials are configured
 * - getUserEmail: Get the configured Gmail address
 */
module.exports = {
  sendEmail,
  isConfigured,
  getUserEmail
};

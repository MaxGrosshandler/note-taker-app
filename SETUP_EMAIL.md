# Email Setup Guide

This guide will help you set up Gmail authentication to enable email functionality in your Notes App.

## Prerequisites

- A Gmail account
- 2-Step Verification enabled on your Google account

## Step-by-Step Setup

### 1. Enable 2-Step Verification

If you haven't already enabled 2-Step Verification on your Google account:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", select "2-Step Verification"
3. Follow the prompts to set it up

### 2. Generate an App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Scroll down and click "App passwords"
5. You may need to sign in again
6. In the "Select app" dropdown, choose "Mail"
7. In the "Select device" dropdown, choose "Other (Custom name)"
8. Type "Notes App" or any name you prefer
9. Click "Generate"
10. **Important:** Copy the 16-character password shown (it will look like: xxxx xxxx xxxx xxxx)

### 3. Configure Your Application

1. Open the `.env` file in your Notes App folder
2. Replace the placeholder values with your information:
   ```env
   GMAIL_USER=your.email@gmail.com
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   ```
   - Replace `your.email@gmail.com` with your actual Gmail address
   - Replace `xxxxxxxxxxxxxxxx` with the 16-character app password (remove spaces)

3. Save the file

### 4. Start Your Application

1. Make sure your PostgreSQL database is running:
   ```bash
   docker-compose up -d
   ```

2. Start (or restart) the Notes App:
   ```bash
   npm start
   ```

3. Open your browser and go to http://localhost:3000

## Usage

Once configured:

1. You should see your email address displayed in the top right corner
2. Open or create a note
3. Click the "Email Note" button
4. Enter the recipient's email address
5. Modify the subject if needed (defaults to note title)
6. Click "Send Email"

The email will be sent from your Gmail account!

## Troubleshooting

### "Email not configured" error

- Make sure you've set both `GMAIL_USER` and `GMAIL_APP_PASSWORD` in the `.env` file
- Restart your server after modifying the `.env` file

### "Failed to send email" error

- Verify your Gmail address is correct in the `.env` file
- Make sure the app password is exactly 16 characters (no spaces)
- Confirm that 2-Step Verification is enabled on your Google account
- Try generating a new app password

### Email address doesn't show in header

- Check that the `.env` file is in the root directory of the Notes App
- Verify there are no typos in the environment variable names
- Restart the server

### "Authentication failed" error

- The app password might be incorrect - try generating a new one
- Make sure you're using an App Password, not your regular Gmail password

## Security Notes

- Never commit your `.env` file to version control (it's already in `.gitignore`)
- Keep your app password secure - it provides access to your Gmail account
- You can revoke app passwords at any time from your Google Account settings
- For production deployment:
  - Use environment variables provided by your hosting platform
  - Never expose the `.env` file publicly
  - Consider using a dedicated email account for sending notifications

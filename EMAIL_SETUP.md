# EventHive Real Email OTP Setup Guide

## Overview
Your EventHive application now supports real email OTP verification instead of console simulation!

## Setup Instructions

### 1. Email Configuration
- Open the `.env` file in your project folder
- Replace the placeholder values with your actual Gmail credentials:

```
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### 2. Get Gmail App Password
1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security > App passwords
4. Generate a new app password for 'Mail' application
5. Copy the 16-character password (without spaces) and use it as EMAIL_PASS

### 3. Start the Server
```bash
npm start
# or
node server.js
```

### 4. Test the Email System
1. Go to your EventHive auth page
2. Register a new user with a real email address
3. Check your email inbox for the verification code
4. Enter the OTP to complete registration

## Features
- ✅ Real email delivery using Gmail SMTP
- ✅ Professional HTML email templates
- ✅ 5-minute OTP expiration
- ✅ Security features and error handling
- ✅ Beautiful email design with EventHive branding

## Troubleshooting

### "Network error" messages
- Make sure the server is running on port 3000
- Check that your .env file has correct credentials

### Email not received
- Check spam/junk folder
- Verify EMAIL_USER and EMAIL_PASS in .env are correct
- Make sure 2FA is enabled on your Google account
- Ensure you're using an App Password, not your regular Gmail password

### SMTP errors
- Gmail may block the first few attempts - try again
- Check if "Less secure app access" needs to be enabled (though App Passwords are preferred)

## Security Notes
- Never commit the .env file to version control
- Use App Passwords instead of regular passwords
- OTP codes expire after 5 minutes for security
- Each OTP can only be used once

## Email Template
The system sends professional HTML emails with:
- EventHive branding and colors
- Clear OTP display
- Security warnings
- 5-minute expiration notice
- Responsive design

Enjoy your production-ready email verification system! 🎉

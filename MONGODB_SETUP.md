# EventHive MongoDB Atlas Setup Guide

## 🚀 Quick Start with MongoDB Atlas

EventHive now uses MongoDB Atlas (cloud MongoDB) instead of local storage for better scalability, data persistence, and production readiness.

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (free tier available)
- Gmail account (for email OTP)

## 🔧 Setup Instructions

### 1. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account
   - Create a new project (e.g., "EventHive")

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "Shared" (free tier)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Configure Database Access**
   - Go to "Database Access" in the left menu
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username/password (save these!)
   - Set role to "Atlas admin" or "Read and write to any database"

4. **Configure Network Access**
   - Go to "Network Access" in the left menu
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add your specific IP address

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Select "Node.js" and version "4.1 or later"
   - Copy the connection string

### 2. Project Configuration

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.template` to `.env`
   - Update the MongoDB connection string:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/eventhive?retryWrites=true&w=majority
   ```

3. **Complete .env File**
   ```env
   # MongoDB Atlas Connection
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/eventhive?retryWrites=true&w=majority
   
   # Session Secret (generate a random string)
   SESSION_SECRET=your-super-secret-random-string-here
   
   # Gmail Configuration (for OTP emails)
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-char-app-password
   
   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

### 3. Database Initialization

1. **Seed the Database**
   ```bash
   npm run seed
   ```
   This will:
   - Create an admin user (admin@eventhive.com / admin123)
   - Populate the database with sample events
   - Set up initial data structure

2. **Start the Server**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

### 4. Gmail App Password Setup (for OTP emails)

1. **Enable 2-Factor Authentication**
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**
   - Security → App passwords
   - Select app: "Mail"
   - Select device: "Other" → "EventHive"
   - Copy the 16-character password (no spaces)
   - Use this as `EMAIL_PASS` in .env

## 🗄️ Database Models

The application now includes the following MongoDB collections:

### Users Collection
- User authentication and profiles
- Keystroke biometric patterns
- User preferences and settings
- Role-based access (user/admin)

### Events Collection
- Event information and details
- Pricing and availability
- Organizer information
- Venue details with coordinates

### Bookings Collection
- Ticket bookings and reservations
- Payment tracking
- Attendee information
- Booking references and QR codes

### OTPs Collection
- Temporary OTP storage
- Automatic expiration (5 minutes)
- Attempt tracking and security

## 🔌 New API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (after OTP verification)
- `POST /api/auth/login` - User login with keystroke verification
- `POST /api/send-otp` - Send OTP to email
- `POST /api/verify-otp` - Verify OTP code

### Events
- `GET /api/events` - Get all events (with pagination and filters)
- `GET /api/events/:id` - Get single event details

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/user/bookings` - Get user's bookings
- `PUT /api/bookings/:id/cancel` - Cancel a booking

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/auth/status` - Check authentication status

## 🚀 Production Deployment Tips

### Security
- Use strong `SESSION_SECRET`
- Enable IP whitelisting in MongoDB Atlas
- Set `NODE_ENV=production`
- Use HTTPS and secure cookies

### MongoDB Atlas
- Use connection pooling (already configured)
- Monitor database usage in Atlas dashboard
- Set up automatic backups
- Consider upgrading to dedicated cluster for production

### Performance
- Database indexes are pre-configured
- Connection pooling optimized
- TTL indexes for automatic OTP cleanup

## 🔍 Monitoring & Debugging

1. **Check MongoDB Connection**
   - Server logs will show connection status
   - Atlas dashboard shows active connections

2. **Monitor Database Operations**
   - Atlas provides real-time performance metrics
   - Check slow operations and optimize queries

3. **Error Handling**
   - All database operations have proper error handling
   - Graceful degradation for connection issues

## 📊 Data Migration

If you have existing data from the localStorage version:
1. Export data from browser localStorage
2. Format according to new schema
3. Use MongoDB import tools or custom migration script

## 🆘 Troubleshooting

### Common Issues

**Connection Error:**
- Check MongoDB Atlas IP whitelist
- Verify username/password in connection string
- Ensure cluster is running

**Email OTP Not Working:**
- Verify Gmail app password (not regular password)
- Check EMAIL_USER and EMAIL_PASS in .env
- Ensure 2FA is enabled on Gmail

**Google OAuth Issues:**
- Set up credentials in Google Developer Console
- Add correct redirect URI: `http://localhost:3000/auth/google/callback`

## 🎯 Next Steps

- Set up monitoring with MongoDB Atlas alerts
- Configure backup and restore procedures
- Implement additional security measures
- Scale database resources as needed

## 📞 Support

For issues with:
- MongoDB Atlas: Check [MongoDB Documentation](https://docs.atlas.mongodb.com/)
- Node.js/Express: Check application logs
- Email issues: Verify Gmail app password setup

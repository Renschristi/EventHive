# EventHive - Event Management Platform

![EventHive Banner](https://via.placeholder.com/800x200/667eea/ffffff?text=EventHive+Event+Management+Platform)

> A full-stack event management platform built with Node.js, Express.js, MongoDB Atlas, and vanilla JavaScript. Features secure authentication, PayPal payment integration, and comprehensive booking management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB Atlas account (free tier available)
- Gmail account (for email service)
- PayPal Developer account (optional - has demo mode)

### Installation

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd "event - Copy"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create .env file from template
   cp .env.example .env
   ```

4. **Configure Environment Variables**
   Edit `.env` file:
   ```env
   # Database Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventhive

   # Session Security
   SESSION_SECRET=your-super-secret-session-key-here

   # Email Service (Gmail SMTP)
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-app-specific-password

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # PayPal Integration (Optional)
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   ```

5. **Seed Database**
   ```bash
   npm run seed
   ```

6. **Start Application**
   ```bash
   npm start
   ```

7. **Access Application**
   - Main App: http://localhost:3000
   - Auth Page: http://localhost:3000/auth

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [User Journey](#-user-journey)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Authentication System](#-authentication-system)
- [Payment Integration](#-payment-integration)
- [File Structure](#-file-structure)
- [Configuration Guide](#-configuration-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 Authentication System
- **User Registration** with email verification
- **Secure Login** with bcrypt password hashing
- **Session Management** with 7-day persistence
- **Password Reset** functionality
- **Google OAuth** integration (optional)
- **Role-based Access** (User/Admin)

### 🎪 Event Management
- **Browse Events** with filtering and search
- **Event Creation** (Admin only) with image upload
- **Event Editing** with real-time updates
- **Category Filtering** (Music, Sports, Tech, etc.)
- **Event Type** filtering (Free, Paid, Premium)
- **Location Integration** with interactive maps
- **Date/Time Management** with timezone support

### 🎫 Booking System
- **Ticket Selection** with quantity controls
- **Attendee Information** collection
- **Price Calculation** with tax handling
- **Booking Confirmation** with reference numbers
- **Email Notifications** for bookings
- **Booking History** management
- **Cancellation System** with refund logic

### 💳 Payment Integration
- **PayPal Integration** with SDK
- **Secure Payment Processing**
- **Payment Validation**
- **Transaction History**
- **Demo Mode** for development
- **Error Handling** with user feedback

### 👤 User Dashboard
- **My Bookings** page with complete history
- **Profile Management**
- **Booking Cancellation**
- **Event Preferences**
- **Notification Settings**

### 🛡️ Admin Features
- **Event Creation/Editing**
- **User Management**
- **Booking Analytics**
- **System Monitoring**
- **Content Moderation**

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │   Express.js    │    │   Atlas Cloud   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js, Passport.js
- **Database**: MongoDB Atlas (Cloud)
- **Session Store**: MongoDB with TTL
- **Email Service**: Nodemailer with Gmail SMTP
- **Payment**: PayPal SDK
- **Authentication**: bcryptjs, Passport strategies
- **Security**: CORS, HTTP-only cookies, input validation

## 👥 User Journey

### 1. Discovery Phase
```
Landing Page → Browse Events → Apply Filters → View Event Details
```

### 2. Registration Phase
```
Register Account → Email Verification → OTP Confirmation → Account Activation
```

### 3. Booking Phase
```
Select Event → Choose Tickets → Enter Details → Process Payment → Confirmation
```

### 4. Management Phase
## 🔌 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account
```javascript
// Request Body
{
  "username": "johndoe",
  "email": "john@example.com", 
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "message": "Registration successful! Please check your email for verification.",
  "userId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

#### POST /api/auth/login
Authenticate user credentials
```javascript
// Request Body
{
  "username": "johndoe",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "message": "Login successful!",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Event Endpoints

#### GET /api/events
Fetch all events with optional filtering
```javascript
// Query Parameters
?category=music&type=paid&page=1&limit=10

// Response
{
  "success": true,
  "data": [...events],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### POST /api/events
Create new event (Admin only)
```javascript
// Request Body
{
  "title": "Jazz Night",
  "description": "An evening of smooth jazz",
  "date": "2024-12-25T19:00:00Z",
  "location": "Downtown Jazz Club",
  "category": "music",
  "type": "paid",
  "standardPrice": 25,
  "vipPrice": 50,
  "capacity": 200,
  "image": "base64-encoded-image"
}
```

### Booking Endpoints

#### POST /api/bookings
Create a new booking
```javascript
// Request Body
{
  "eventId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "tickets": {
    "standard": 2,
    "vip": 1
  },
  "attendees": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "ticketType": "standard"
    }
  ],
  "totalAmount": 75
}
```

#### GET /api/bookings/user
Get user's booking history
```javascript
// Response
{
  "success": true,
  "bookings": [
    {
      "id": "booking123",
      "event": {...eventDetails},
      "attendees": [...],
      "totalCost": 75,
      "status": "confirmed",
      "bookingDate": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🗃️ Database Schema

### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (default: 'user'),
  isEmailVerified: Boolean (default: false),
  avatar: String,
  preferences: Object,
  createdAt: Date,
  lastLogin: Date,
  keystrokePattern: Object // For enhanced security
}
```

### Event Model
```javascript
{
  title: String (required),
  description: String (required),
  date: Date (required),
  location: String (required),
  category: String (required),
  type: String (required), // 'free', 'paid', 'premium'
  standardPrice: Number,
  vipPrice: Number,
  capacity: Number,
  image: String, // Base64 or URL
  organizer: ObjectId (ref: User),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Model
```javascript
{
  user: ObjectId (ref: User, required),
  event: ObjectId (ref: Event, required),
  attendees: [{
    name: String (required),
    email: String (required),
    phone: String,
    ticketType: String (required)
  }],
  tickets: {
    standard: Number,
    vip: Number
  },
  totalCost: Number (required),
  bookingReference: String (unique),
  status: String (default: 'confirmed'),
  paymentStatus: String (default: 'pending'),
  bookingDate: Date (default: Date.now),
  cancellationDate: Date
}
```

### OTP Model
```javascript
{
  email: String (required),
  code: String (required),
  purpose: String (required), // 'verification', 'reset'
  expiresAt: Date (required),
  isUsed: Boolean (default: false),
  attempts: Number (default: 0),
  createdAt: Date (default: Date.now)
}
```

## 🔐 Authentication System

### Password Security
- **bcryptjs hashing** with 12 salt rounds
- **Password validation** with strength requirements
- **Secure password reset** with time-limited tokens
- **Keystroke dynamics** for enhanced security (optional)

### Session Management
```javascript
// Session Configuration
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60 // 7 days
  }),
  cookie: {
    secure: false, // true in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  }
}
```

### Email Verification Flow
1. User registers → OTP generated → Email sent
2. User enters OTP → Server validates → Account activated
3. OTP expires after 10 minutes
4. Maximum 3 attempts allowed

## 💳 Payment Integration

### PayPal Configuration
```javascript
// Client-side PayPal SDK
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>

// Payment processing
paypal.Buttons({
  createOrder: (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: { value: totalAmount }
      }]
    });
  },
  onApprove: (data, actions) => {
    return actions.order.capture().then(details => {
      // Process successful payment
      processBooking(details);
    });
  }
}).render('#paypal-button-container');
```

### Demo Mode
When PayPal credentials are not configured:
- Payment simulation with fake processing
- All booking features work normally
- Console logging for debugging
- Test card numbers accepted

## 📁 File Structure

```
eventhive/
├── 📄 server.js                 # Main backend server (1,150+ lines)
├── 📁 config/
│   └── database.js              # MongoDB connection setup
├── 📁 models/
│   ├── User.js                  # User schema and methods
│   ├── Event.js                 # Event data structure
│   ├── Booking.js               # Booking relationships
│   └── OTP.js                   # Email verification system
├── 📁 scripts/
│   └── seedDatabase.js          # Sample data initialization
├── 📄 package.json              # Dependencies and scripts
├── 📄 .env                      # Environment variables
├── 📄 .gitignore                # Git ignore rules
│
├── 📄 index.html                # Main homepage
├── 📄 script.js                 # Main frontend logic (2,600+ lines)
├── 📄 styles.css                # Main stylesheet
│
├── 📄 auth.html                 # Registration/Login page
├── 📄 auth-script.js            # Authentication handling
├── 📄 auth-styles.css           # Auth page styling
│
├── 📄 ticket-booking.html       # Event booking interface
├── 📄 ticket-booking.js         # Booking logic
├── 📄 ticket-booking.css        # Booking page styling
│
├── 📄 payment.html              # Payment processing page
├── 📄 payment.js                # Payment handling logic
├── 📄 payment.css               # Payment page styling
│
├── 📄 my-bookings.html          # User booking management
├── 📄 event-details.html        # Event information display
├── 📄 event-details.js          # Event details logic
├── 📄 event-details.css         # Event details styling
│
├── 📄 preferences.html          # User preferences page
├── 📄 preferences.js            # Preferences logic
├── 📄 preferences.css           # Preferences styling
│
└── 📄 registration.html         # Additional registration forms
    ├── registration.js          # Registration logic
    └── registration.css         # Registration styling
```

## ⚙️ Configuration Guide

### MongoDB Atlas Setup
1. **Create Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create Cluster**: Choose free tier (M0)
3. **Database Access**: Create user with read/write permissions
4. **Network Access**: Add your IP address (0.0.0.0/0 for development)
5. **Connect**: Copy connection string to `MONGODB_URI` in `.env`

### Gmail SMTP Setup
1. **Enable 2FA**: On your Gmail account
2. **Generate App Password**: Google Account → Security → App passwords
3. **Configure**: Add credentials to `.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   ```

### Google OAuth Setup (Optional)
1. **Google Console**: Visit [Google Developers Console](https://console.developers.google.com/)
2. **Create Project**: Or select existing project
3. **Enable APIs**: Google+ API
4. **Create Credentials**: OAuth 2.0 client ID
5. **Configure**: Add redirect URI: `http://localhost:3000/auth/google/callback`
6. **Environment**: Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### PayPal Setup (Optional)
1. **Developer Account**: Sign up at [PayPal Developer](https://developer.paypal.com/)
2. **Create App**: In dashboard, create new application
3. **Get Credentials**: Copy Client ID and Secret
4. **Configure**: Add to `.env`:
   ```env
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   ```

## 🔧 NPM Scripts

```json
{
  "start": "node server.js",           // Start production server
  "dev": "nodemon server.js",          // Start development server
  "seed": "node scripts/seedDatabase.js", // Seed database with sample data
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
Error: MongoNetworkError: failed to connect to server
```
**Solution:**
- Check MongoDB Atlas connection string
- Verify network access settings (whitelist IP)
- Ensure database user has proper permissions

#### Email Service Not Working
```bash
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution:**
- Enable 2-factor authentication on Gmail
- Generate app-specific password
- Use app password in EMAIL_PASS, not regular password

#### Session Not Persisting
```bash
User logged out unexpectedly
```
**Solution:**
- Check SESSION_SECRET in .env file
- Verify MongoDB connection for session store
- Clear browser cookies and retry

#### PayPal Integration Issues
```bash
PayPal button not rendering
```
**Solution:**
- Verify PayPal client ID is correct
- Check browser console for JavaScript errors
- Ensure PayPal SDK is loaded properly

#### Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Kill process using port 3000
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
# Or use different port
PORT=3001 npm start
```

### Debug Mode
Enable detailed logging by adding to `.env`:
```env
NODE_ENV=development
DEBUG=true
```

### Browser Console Errors
Common frontend issues:
- **CORS errors**: Check server CORS configuration
- **Authentication errors**: Clear localStorage and cookies
- **API timeouts**: Check server status and network

## 🧪 Testing

### Manual Testing Checklist

#### Authentication Flow
- [ ] User registration with email verification
- [ ] Login with valid credentials
- [ ] Login with invalid credentials  
- [ ] Password reset functionality
- [ ] Session persistence across browser tabs
- [ ] Logout functionality

#### Event Management
- [ ] Browse events on homepage
- [ ] Apply category and type filters
- [ ] Search events by keyword
- [ ] View event details page
- [ ] Admin event creation (if admin user)
- [ ] Admin event editing (if admin user)

#### Booking Process
- [ ] Select event for booking
- [ ] Choose ticket quantities
- [ ] Fill attendee information
- [ ] Process payment (or demo payment)
- [ ] Receive booking confirmation
- [ ] View booking in "My Bookings"

#### Error Handling
- [ ] Network disconnection scenarios
- [ ] Invalid form submissions
- [ ] Database connection failures
- [ ] Payment processing errors

### Test Accounts
After running `npm run seed`, these accounts are available:

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@eventhive.com`

**Test User:**
- Username: `testuser`  
- Password: `password123`
- Email: `test@example.com`

## 🔒 Security Features

### Data Protection
- **Password Hashing**: bcrypt with 12 salt rounds
- **Session Security**: HTTP-only cookies, secure flags in production
- **Input Validation**: Server-side validation for all forms
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CORS Policy**: Restricted origin access

### Authentication Security
- **Rate Limiting**: Failed login attempt tracking
- **Account Lockout**: Temporary lockout after failed attempts
- **Email Verification**: Required for account activation
- **Session Management**: Automatic expiration and cleanup
- **Password Requirements**: Minimum length and complexity

### API Security
- **Authentication Middleware**: Protected route verification
- **Request Validation**: Schema validation for all inputs
- **Error Handling**: Sanitized error responses
- **Audit Logging**: User action tracking
- **Environment Variables**: Sensitive data protection

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=80
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/eventhive
SESSION_SECRET=ultra-secure-64-character-random-string-for-production
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your-production-email-password
GOOGLE_CLIENT_ID=production-google-client-id
GOOGLE_CLIENT_SECRET=production-google-client-secret
PAYPAL_CLIENT_ID=production-paypal-client-id
PAYPAL_CLIENT_SECRET=production-paypal-client-secret
```

### Security Checklist for Production
- [ ] Enable HTTPS with SSL certificates
- [ ] Set `cookie.secure = true` in session config
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting middleware
- [ ] Set up error logging service
- [ ] Configure backup strategy for database
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Use environment-specific configuration
- [ ] Set up monitoring and alerts
- [ ] Configure CDN for static assets

### Performance Optimization
- [ ] Enable gzip compression
- [ ] Configure static asset caching
- [ ] Database indexing optimization  
- [ ] Image optimization and CDN
- [ ] API response caching
- [ ] Connection pooling for database
- [ ] Load balancing configuration
- [ ] Memory usage monitoring

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit with descriptive message: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Submit pull request with detailed description

### Code Style Guidelines
- Use ES6+ JavaScript features
- Follow consistent indentation (2 spaces)
- Add comments for complex logic
- Validate all user inputs
- Handle errors gracefully
- Write self-documenting code

### Testing Requirements
- Test all new features manually
- Verify cross-browser compatibility
- Check mobile responsiveness  
- Validate API endpoint functionality
- Ensure security measures are maintained

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

### Get Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issue with detailed description
- **Email**: contact@eventhive.com (if configured)

### Frequently Asked Questions

**Q: Can I use this for commercial purposes?**
A: Yes, this project is MIT licensed and free for commercial use.

**Q: How do I add new event categories?**
A: Edit the categories array in `script.js` and update the database seeding script.

**Q: Can I integrate other payment providers?**
A: Yes, the payment system is modular. Add new providers in `payment.js`.

**Q: How do I customize the email templates?**
A: Email templates are in `server.js`. Search for email sending functions and modify the HTML.

**Q: Is this production-ready?**
A: Yes, with proper configuration and security measures enabled.

---

## 🎉 Congratulations!

You now have a fully functional event management platform! 🎊

**Next Steps:**
1. Customize the styling to match your brand
2. Add additional features as needed
3. Configure production environment
4. Deploy to your hosting platform
5. Set up monitoring and analytics

**Happy Event Management!** 🎪✨

### Booking System
- **Protected Bookings**: Authentication required
- **Booking Management**: View and cancel reservations
- **Real-time Updates**: Immediate UI updates after booking
- **Persistent Storage**: Bookings saved across sessions

## Browser Compatibility

- **Chrome** (recommended)
- **Firefox**
- **Safari**
- **Edge**

## Future Enhancements

- **Backend Integration**: Server-side authentication and database
- **Real Email Service**: SMTP integration for OTP delivery
- **Payment Processing**: Secure payment gateway integration
- **Admin Dashboard**: Event management for administrators
- **Advanced Analytics**: User behavior and event popularity tracking
- **Mobile App**: Native mobile application
- **Social Login**: Extended OAuth provider support

## Development Notes

- **No Build Process**: Pure HTML/CSS/JS - no compilation needed
- **Local Development**: Use Live Server or similar for development
- **Data Persistence**: All data stored in browser local storage
- **Demo Ready**: Fully functional authentication system
- **Expandable**: Ready for backend integration

## License

This project is open source and available under the MIT License.

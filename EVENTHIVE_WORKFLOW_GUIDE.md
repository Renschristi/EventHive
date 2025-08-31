# EventHive Application - Complete Workflow Guide

## **1. System Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │   Express.js    │    │   Atlas Cloud   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## **2. User Journey Workflow**

### **Phase 1: Discovery & Registration**
```
User visits → Homepage → Browse Events → Register Account → Email Verification
     │            │           │             │               │
     ▼            ▼           ▼             ▼               ▼
  index.html   script.js   API calls   auth-script.js   server.js
```

### **Phase 2: Authentication & Session Management**
```
Login → Password Check → Session Creation → Access Control → 7-day Persistence
  │         │              │               │                │
  ▼         ▼              ▼               ▼                ▼
auth.html  bcrypt       passport.js    middleware       MongoDB Store
```

### **Phase 3: Event Interaction**
```
Browse → Filter → View Details → Book Tickets → Payment → Confirmation
  │        │         │             │           │          │
  ▼        ▼         ▼             ▼           ▼          ▼
Events   Filters   event-details   booking    payment   database
Grid     API      .html/.js       process    .js       storage
```

### **Phase 4: Booking Management**
```
My Bookings → View History → Cancel/Modify → Admin Analytics
     │            │             │              │
     ▼            ▼             ▼              ▼
my-bookings   booking API   cancellation   admin panel
  .html         calls        process        dashboard
```

## **3. File Structure & Responsibilities**

### **Frontend Layer**
```
├── index.html              # Main homepage
├── auth.html               # Registration/Login page
├── ticket-booking.html     # Event booking interface
├── payment.html            # Payment processing
├── my-bookings.html        # User booking management
├── event-details.html      # Event information display
├── script.js               # Main frontend logic (2600+ lines)
├── auth-script.js          # Authentication handling
├── payment.js              # Payment processing logic
└── [all CSS files]         # Styling and responsive design
```

### **Backend Layer**
```
├── server.js               # Main Express server (1150+ lines)
├── config/
│   └── database.js         # MongoDB connection setup
├── models/
│   ├── User.js             # User schema & authentication
│   ├── Event.js            # Event data structure
│   ├── Booking.js          # Booking relationships
│   └── OTP.js              # Email verification system
└── scripts/
    └── seedDatabase.js     # Sample data initialization
```

## **4. Technical Flow Breakdown**

### **Authentication Flow**
```
1. User Registration:
   Frontend Form → Validation → Server Endpoint → Password Hashing → Database Storage
   
2. Email Verification:
   OTP Generation → Email Service → User Input → Verification → Account Activation
   
3. Login Process:
   Credentials → bcrypt Compare → Session Creation → JWT/Cookie → Access Granted
   
4. Session Management:
   7-day Cookies → MongoDB Store → Automatic Refresh → Logout Handling
```

### **Event Management Flow**
```
1. Event Loading:
   MongoDB Query → API Response → Frontend Rendering → Filter Application
   
2. Event Creation (Admin):
   Form Validation → Image Upload → Database Insert → Real-time Update
   
3. Event Booking:
   Selection → Authentication Check → Payment Process → Database Transaction
```

### **Payment Processing Flow**
```
1. Ticket Selection → Price Calculation → User Details Collection
2. PayPal Integration → Payment Validation → Booking Confirmation
3. Database Update → Email Notification → Booking Reference Generation
```

## **5. Database Schema Relationships**

```
Users ──────┐
    │       │
    │       ▼
    │    Bookings ────► Events
    │       │             │
    │       ▼             │
    └────► OTPs           │
                          ▼
                    (Event Details,
                     Pricing, Images)
```

## **6. API Endpoints Structure**

### **Authentication APIs**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/status` - Check login status
- `POST /api/auth/send-otp` - Email verification
- `POST /api/auth/verify-otp` - OTP validation

### **Event Management APIs**
- `GET /api/events` - Fetch all events (with filters)
- `GET /api/events/:id` - Get single event details
- `POST /api/events` - Create new event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)

### **Booking Management APIs**
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/user` - Get user's bookings
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `GET /api/bookings/:id` - Get booking details

## **7. Security Implementation**

```
Password Security: bcryptjs hashing (12 rounds)
Session Security: HTTP-only cookies, 7-day expiration
API Security: Authentication middleware on protected routes
Input Validation: Server-side validation for all forms
CORS Policy: Restricted origin access
Environment Variables: Sensitive data protection (.env)
```

## **8. Error Handling Strategy**

```
Frontend Errors: Try-catch blocks → User notifications → Fallback UI
Backend Errors: Middleware → Logging → Structured responses
Database Errors: Connection retry → Graceful degradation
Authentication Errors: Clear messages → Redirect handling
Payment Errors: Transaction rollback → User guidance
```

## **9. Performance Optimizations**

```
Database: Indexed queries, pagination, connection pooling
Frontend: Lazy loading, image optimization, caching
Session Management: MongoDB TTL, efficient storage
API Responses: Structured data, minimal payloads
Static Assets: CSS/JS optimization, compression
```

## **10. Development vs Production**

### **Development Mode**
- Local MongoDB (optional)
- Console OTP display
- Detailed error messages
- No HTTPS requirements

### **Production Ready**
- MongoDB Atlas cloud database
- Real email service (Gmail SMTP)
- Environment-based configuration
- Security headers and HTTPS
- Error logging and monitoring

---

## **How to Explain This System**

### **For Technical Interviews:**
1. Start with architecture overview
2. Explain user journey step-by-step
3. Detail database relationships
4. Discuss security measures
5. Mention scalability considerations

### **For Code Reviews:**
1. Highlight separation of concerns
2. Explain error handling patterns
3. Show authentication flow
4. Demonstrate API design principles
5. Point out performance optimizations

### **For Documentation:**
1. Document each major component
2. Provide API endpoint examples
3. Include database schema diagrams
4. Show configuration setup steps
5. Add troubleshooting guides

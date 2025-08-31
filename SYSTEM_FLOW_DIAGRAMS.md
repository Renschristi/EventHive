# EventHive System Flow Diagrams

## **1. Complete User Journey Flow**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EVENTHIVE USER JOURNEY                                │
└─────────────────────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Landing   │───▶│   Browse    │───▶│   Event     │───▶│Registration │
│   Page      │    │   Events    │    │   Details   │    │   Required  │
│ index.html  │    │  (Filters)  │    │   Page      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Register   │    │   Search    │    │   Ticket    │    │    Login    │
│   Account   │    │  & Filter   │    │  Booking    │    │   System    │
│ auth.html   │    │  Events     │    │   Form      │    │ Validation  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                                       │                   │
       ▼                                       ▼                   ▼
┌─────────────┐                      ┌─────────────┐    ┌─────────────┐
│   Email     │                      │   Payment   │    │   Session   │
│ Verification│                      │ Processing  │    │  Creation   │
│ (OTP Code)  │                      │ PayPal SDK  │    │  7-day TTL  │
└─────────────┘                      └─────────────┘    └─────────────┘
       │                                       │                   │
       ▼                                       ▼                   ▼
┌─────────────┐                      ┌─────────────┐    ┌─────────────┐
│  Account    │                      │  Booking    │    │   Access    │
│ Activation  │                      │Confirmation │    │  Granted    │
│  Complete   │                      │   & Email   │    │ (Dashboard) │
└─────────────┘                      └─────────────┘    └─────────────┘
       │                                       │                   │
       └───────────────────┐                  │                   │
                          ▼                  ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │    Main     │    │     My      │    │    Admin    │
                   │  Dashboard  │    │  Bookings   │    │   Panel     │
                   │   Access    │    │ Management  │    │ (if admin)  │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

## **2. Technical Architecture Flow**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        TECHNICAL SYSTEM ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

FRONTEND LAYER
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Browser (HTML/CSS/JavaScript)                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │  index.html  │ │   auth.html  │ │ booking.html │ │ payment.html │          │
│  │              │ │              │ │              │ │              │          │
│  │  script.js   │ │auth-script.js│ │ booking.js   │ │ payment.js   │          │
│  │  (2600+     │ │ (900+ lines) │ │ (600+ lines) │ │ (500+ lines) │          │
│  │   lines)     │ │              │ │              │ │              │          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              HTTP REQUESTS (RESTful API)                        │
└─────────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  BACKEND LAYER (Node.js + Express.js)                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        server.js (1,150+ lines)                         │   │
│  │                                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │    Auth     │ │   Events    │ │   Bookings  │ │   Payment   │      │   │
│  │  │ Endpoints   │ │   API       │ │    API      │ │    API      │      │   │
│  │  │             │ │             │ │             │ │             │      │   │
│  │  │ /register   │ │ GET /events │ │POST/bookings│ │PayPal Logic │      │   │
│  │  │ /login      │ │GET/events/:id│ │GET /bookings│ │Validation   │      │   │
│  │  │ /logout     │ │POST /events │ │PUT /cancel  │ │Processing   │      │   │
│  │  │ /verify-otp │ │PUT /events  │ │             │ │             │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           MIDDLEWARE LAYER                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │Passport.js  │ │   Session   │ │   CORS      │ │   Error     │      │   │
│  │  │Authentication│ │ Management │ │  Security   │ │  Handling   │      │   │
│  │  │   OAuth     │ │ 7-day TTL   │ │  Policies   │ │ Middleware  │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE OPERATIONS                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER (MongoDB Atlas)                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        eventhivecluster                                 │   │
│  │                                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │   Users     │ │   Events    │ │   Bookings  │ │    OTPs     │      │   │
│  │  │ Collection  │ │ Collection  │ │ Collection  │ │ Collection  │      │   │
│  │  │             │ │             │ │             │ │             │      │   │
│  │  │ -username   │ │ -title      │ │ -userId     │ │ -email      │      │   │
│  │  │ -email      │ │ -date       │ │ -eventId    │ │ -code       │      │   │
│  │  │ -password   │ │ -location   │ │ -attendees  │ │ -expires    │      │   │
│  │  │ -role       │ │ -pricing    │ │ -totalCost  │ │ -verified   │      │   │
│  │  │ -verified   │ │ -organizer  │ │ -status     │ │             │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## **3. Authentication Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

USER REGISTRATION:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───▶│ Frontend    │───▶│   Server    │───▶│  Database   │
│   Input     │    │ Validation  │    │ Processing  │    │   Storage   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •Username       │ •Field checks    │ •Hash password  │ •Create user
│ •Email          │ •Email format    │ •Generate OTP   │ •Store OTP
│ •Password       │ •Password rules  │ •Send email     │ •Set status
│ •Confirm        │ •Confirmation    │ •Save to DB     │ •Return ID
└─────────────     └─────────────     └─────────────     └─────────────

EMAIL VERIFICATION:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Email     │───▶│ OTP Input   │───▶│ Validation  │───▶│ Activation  │
│  Received   │    │  on Form    │    │  Process    │    │  Complete   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •6-digit code   │ •User enters    │ •Check expiry   │ •Set verified
│ •10min expire   │ •Auto-submit    │ •Compare codes  │ •Delete OTP
│ •Gmail SMTP     │ •Error handling │ •Update status  │ •Enable login
└─────────────     └─────────────     └─────────────     └─────────────

USER LOGIN:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Credentials │───▶│ Server      │───▶│  Password   │───▶│  Session    │
│   Submit    │    │ Validation  │    │ Comparison  │    │  Creation   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •Username/Email │ •Find user      │ •bcrypt.compare │ •Passport.js
│ •Password       │ •Check exists   │ •Hash validation│ •7-day cookie
│ •Remember me    │ •Account status │ •Match result   │ •MongoDB store
└─────────────     └─────────────     └─────────────     └─────────────

SESSION MANAGEMENT:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Request    │───▶│Middleware   │───▶│   Session   │───▶│  Response   │
│   Made      │    │    Check    │    │ Validation  │    │  Generated  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •API call       │ •Read cookie    │ •Check MongoDB  │ •Allow/Deny
│ •Page load      │ •Validate token │ •Update TTL     │ •User data
│ •Form submit    │ •Check expiry   │ •Refresh time   │ •Error message
└─────────────     └─────────────     └─────────────     └─────────────
```

## **4. Data Flow & API Structure**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API REQUEST FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

GET /api/events
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│   Server    │───▶│  Database   │───▶│  Response   │
│  Request    │    │ Processing  │    │    Query    │    │ Generated   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •Page load      │ •Route handler  │ •MongoDB find   │ •JSON format
│ •Filter params  │ •Parse query    │ •Apply filters  │ •Pagination
│ •Pagination     │ •Build filter   │ •Sort by date   │ •Event array
│ •Sort order     │ •Add pagination │ •Populate refs  │ •Metadata
└─────────────     └─────────────     └─────────────     └─────────────

POST /api/bookings
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Booking   │───▶│   Server    │───▶│ Transaction │───▶│Confirmation │
│    Data     │    │ Validation  │    │ Processing  │    │  Response   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •Event ID       │ •Check auth     │ •Create booking │ •Booking ID
│ •Attendee info  │ •Validate data  │ •Update event   │ •Reference #
│ •Payment data   │ •Calculate cost │ •Process pay    │ •Success flag
│ •Ticket count   │ •Check capacity │ •Send email     │ •Error details
└─────────────     └─────────────     └─────────────     └─────────────

ERROR HANDLING
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Error    │───▶│   Catch     │───▶│   Logger    │───▶│   Client    │
│  Occurs     │    │ Middleware  │    │  & Format   │    │  Response   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ •Database fail  │ •Try/catch      │ •Console.error  │ •Error message
│ •Validation     │ •Error types    │ •Stack trace    │ •Status code
│ •Auth failure   │ •Status codes   │ •User-friendly  │ •Retry options
│ •Network issue  │ •Respond format │ •Debug info     │ •Fallback UI
└─────────────     └─────────────     └─────────────     └─────────────
```

---

## **How to Use These Diagrams When Explaining:**

### **1. For Visual Learners:**
- Start with the complete user journey
- Show technical architecture
- Walk through authentication flow
- Explain data flow patterns

### **2. For Technical Interviews:**
- Use architecture diagram to explain separation of concerns
- Show API flow for discussing design patterns
- Reference authentication flow for security discussion
- Point to specific components when asked about implementation

### **3. For Code Reviews:**
- Map code files to diagram components
- Trace request/response cycles
- Show error handling paths
- Demonstrate data relationships

### **4. For Documentation:**
- Include diagrams in README
- Reference in code comments
- Use for onboarding new developers
- Create troubleshooting guides

**Remember:** These diagrams help people understand the "why" behind your code structure!

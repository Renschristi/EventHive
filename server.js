const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const connectDB = require('./config/database');
const User = require('./models/User');
const Event = require('./models/Event');
const Booking = require('./models/Booking');
const OTP = require('./models/OTP');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Email configuration with nodemailer
let emailConfigured = false;
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Test email configuration on startup
console.log('📧 Checking email configuration...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');

if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
    process.env.EMAIL_USER.includes('@') && 
    process.env.EMAIL_PASS.length > 10) {
    
    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ Email configuration error:', error.message);
            console.log('📧 Please check your Gmail credentials in .env file');
            emailConfigured = false;
        } else {
            console.log('✅ Email server is ready to send messages');
            emailConfigured = true;
        }
    });
} else {
    console.log('⚠️  Email not configured - Using demo mode');
    console.log('📧 To enable real email: configure EMAIL_USER and EMAIL_PASS in .env file');
    console.log('🎮 Demo mode: OTP will be displayed in console and browser');
    emailConfigured = false;
}

// Middleware
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration with MongoDB store
app.use(session({
    secret: process.env.SESSION_SECRET || 'eventhive-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600, // lazy session update
        ttl: 7 * 24 * 60 * 60 // 7 days in seconds
    }),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        httpOnly: true,
        sameSite: 'lax' // Helps with session persistence
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static('.'));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ 
            $or: [
                { providerId: profile.id, provider: 'google' },
                { email: profile.emails[0].value }
            ]
        });

        if (user) {
            // Update existing user with Google info if needed
            if (!user.providerId && user.email === profile.emails[0].value) {
                user.providerId = profile.id;
                user.provider = 'google';
                user.avatar = profile.photos[0].value;
                user.isEmailVerified = true;
                await user.save();
            }
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
        }

        // Create new user
        user = new User({
            username: profile.displayName || profile.emails[0].value.split('@')[0],
            email: profile.emails[0].value,
            provider: 'google',
            providerId: profile.id,
            avatar: profile.photos[0].value,
            isEmailVerified: true,
            lastLogin: new Date()
        });

        await user.save();
        console.log('New Google OAuth user created:', user.username);
        return done(null, user);
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Routes

// Send OTP via email
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, username } = req.body;
        
        if (!email || !username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and username are required' 
            });
        }

        // Check if email is already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'This email is already registered. Please use a different email or login instead.' 
            });
        }

        // Check if username is already taken
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
            return res.status(400).json({ 
                success: false, 
                message: 'This username is already taken. Please choose a different username.' 
            });
        }

        // Clean up any existing OTPs for this email
        await OTP.deleteMany({ email: email.toLowerCase() });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to database
        const otpDoc = new OTP({
            email: email.toLowerCase(),
            username: username,
            otp: otp
        });
        
        await otpDoc.save();
        
        // Prepare email content
        const mailOptions = {
            from: process.env.EMAIL_USER || 'EventHive <noreply@eventhive.com>',
            to: email,
            subject: 'EventHive - Email Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Arial, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 20px; 
                        }
                        .header { 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 30px; 
                            text-align: center; 
                            border-radius: 10px 10px 0 0; 
                        }
                        .content { 
                            background: #f9f9f9; 
                            padding: 30px; 
                            border-radius: 0 0 10px 10px; 
                        }
                        .otp-box { 
                            background: white; 
                            border: 2px solid #667eea; 
                            border-radius: 8px; 
                            padding: 20px; 
                            text-align: center; 
                            margin: 20px 0; 
                        }
                        .otp-code { 
                            font-size: 32px; 
                            font-weight: bold; 
                            color: #667eea; 
                            letter-spacing: 8px; 
                            margin: 10px 0; 
                        }
                        .warning { 
                            background: #fff3cd; 
                            border: 1px solid #ffeaa7; 
                            color: #856404; 
                            padding: 15px; 
                            border-radius: 5px; 
                            margin: 20px 0; 
                        }
                        .footer { 
                            text-align: center; 
                            color: #666; 
                            font-size: 14px; 
                            margin-top: 30px; 
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🎉 Welcome to EventHive!</h1>
                        <p>Email Verification Required</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${username}!</h2>
                        <p>Thank you for registering with EventHive. To complete your registration, please use the verification code below:</p>
                        
                        <div class="otp-box">
                            <p>Your verification code is:</p>
                            <div class="otp-code">${otp}</div>
                            <p><small>This code is valid for 5 minutes</small></p>
                        </div>
                        
                        <div class="warning">
                            <strong>Security Notice:</strong> This code is confidential. Do not share it with anyone. EventHive will never ask for this code via phone or email.
                        </div>
                        
                        <p>If you didn't request this verification, please ignore this email.</p>
                        
                        <div class="footer">
                            <p>© 2025 EventHive. All rights reserved.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`📧 OTP sent to ${email}: ${otp}`);
        
        res.json({ 
            success: true, 
            message: 'OTP sent successfully to your email',
            expiresIn: 300 // 5 minutes in seconds
        });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP. Please try again.',
            error: error.message 
        });
    }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }

        // Find the OTP record
        const otpDoc = await OTP.findOne({ 
            email: email.toLowerCase(),
            isUsed: false
        }).sort({ createdAt: -1 }); // Get the latest OTP

        if (!otpDoc) {
            return res.status(400).json({ 
                success: false, 
                message: 'No valid OTP found for this email. Please request a new one.' 
            });
        }

        // Check if OTP is expired
        if (otpDoc.expiresAt < new Date()) {
            await OTP.deleteMany({ email: email.toLowerCase() });
            return res.status(400).json({ 
                success: false, 
                message: 'OTP has expired. Please request a new one.' 
            });
        }

        // Check attempts limit
        if (otpDoc.attempts >= 3) {
            await OTP.deleteMany({ email: email.toLowerCase() });
            return res.status(400).json({ 
                success: false, 
                message: 'Too many failed attempts. Please request a new OTP.' 
            });
        }

        // Verify OTP
        if (otpDoc.otp !== otp) {
            otpDoc.attempts += 1;
            await otpDoc.save();
            
            return res.status(400).json({ 
                success: false, 
                message: `Invalid OTP. You have ${3 - otpDoc.attempts} attempts remaining.` 
            });
        }

        // OTP is valid - mark as used and clean up
        otpDoc.isUsed = true;
        await otpDoc.save();
        
        res.json({ 
            success: true, 
            message: 'OTP verified successfully!',
            username: otpDoc.username 
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'OTP verification failed',
            error: error.message 
        });
    }
});

// Temporary registration endpoint for testing (bypasses OTP)
app.post('/api/auth/register-test', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('🧪 Test registration attempt:', { username, email });
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { username: username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        // Create new user (bypassing OTP verification)
        const user = new User({
            username: username,
            email: email.toLowerCase(),
            password: password,
            isEmailVerified: true // Set as verified for testing
        });

        await user.save();
        console.log('✅ Test user created successfully:', user._id);

        res.json({ 
            success: true, 
            message: 'Test user registered successfully!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Test registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Test registration failed',
            error: error.message 
        });
    }
});

// User Registration (after OTP verification)
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('👤 New user registration attempt:', { 
            username: req.body.username, 
            email: req.body.email,
            hasPassword: !!req.body.password 
        });
        
        const { username, email, password, keystrokePattern } = req.body;
        
        if (!username || !email || !password) {
            console.log('❌ Registration failed: Missing required fields');
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { username: username }
            ]
        });

        if (existingUser) {
            console.log('❌ Registration failed: User already exists');
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        // Create new user with all required fields
        const user = new User({
            username: username,
            email: email.toLowerCase(),
            password: password, // Will be hashed by the pre-save hook
            keystrokePattern: keystrokePattern,
            isEmailVerified: true, // Email was verified via OTP
            isVerified: true, // Set as verified for immediate login
            role: 'user', // Explicitly set role
            provider: 'local', // Set provider as local registration
            avatar: null // No avatar initially
        });

        console.log('💾 Saving new user to database...');
        await user.save();
        console.log('✅ User saved successfully:', user.username);

        // Return user info (password will be excluded by toJSON method)
        res.json({ 
            success: true, 
            message: 'User registered successfully!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                isVerified: user.isVerified,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed',
            error: error.message 
        });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
        
        const { username, password, keystrokePattern } = req.body;
        
        if (!username || !password) {
            console.log('❌ Missing credentials');
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Find user by username or email
        console.log('🔍 Searching for user:', username);
        const user = await User.findOne({ 
            $or: [
                { username: username },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        console.log('✅ User found:', user.username, user.email);

        // Check password
        console.log('🔑 Checking password...');
        const isPasswordValid = await user.comparePassword(password);
        console.log('🔑 Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        // Verify keystroke pattern if available
        if (user.keystrokePattern && keystrokePattern) {
            // Simple keystroke pattern verification (you can make this more sophisticated)
            const patternMatch = verifyKeystrokePattern(user.keystrokePattern, keystrokePattern);
            if (!patternMatch) {
                console.log('❌ Keystroke pattern mismatch');
                return res.status(401).json({ 
                    success: false, 
                    message: 'Keystroke pattern does not match. Authentication failed.' 
                });
            }
        }

        // Update last login
        console.log('📝 Updating last login...');
        user.lastLogin = new Date();
        await user.save();

        // Create session
        console.log('🍪 Creating session...');
        req.login(user, (err) => {
            if (err) {
                console.log('❌ Session creation failed:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session creation failed' 
                });
            }

            console.log('✅ Login successful for:', user.username);
            res.json({ 
                success: true, 
                message: 'Login successful!',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role
                }
            });
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed',
            error: error.message 
        });
    }
});

// Simple keystroke pattern verification function
function verifyKeystrokePattern(storedPattern, currentPattern) {
    if (!storedPattern || !currentPattern) return false;
    
    try {
        const stored = JSON.parse(storedPattern);
        const current = JSON.parse(currentPattern);
        
        if (!stored.timings || !current.timings) return false;
        if (stored.timings.length !== current.timings.length) return false;
        
        // Calculate similarity (30% tolerance)
        let matches = 0;
        const tolerance = 0.3; // 30% tolerance
        
        for (let i = 0; i < stored.timings.length; i++) {
            const storedTime = stored.timings[i];
            const currentTime = current.timings[i];
            
            if (storedTime === 0 && currentTime === 0) {
                matches++;
                continue;
            }
            
            const difference = Math.abs(storedTime - currentTime);
            const maxTime = Math.max(storedTime, currentTime);
            const similarity = 1 - (difference / maxTime);
            
            if (similarity >= (1 - tolerance)) {
                matches++;
            }
        }
        
        const matchPercentage = matches / stored.timings.length;
        return matchPercentage >= 0.7; // 70% match required
    } catch (error) {
        console.error('Keystroke pattern verification error:', error);
        return false;
    }
}

// Routes

// Home route - serve EventHive main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth page route
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Google OAuth routes
app.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/auth?error=oauth_failed' 
    }),
    (req, res) => {
        // Successful authentication
        const user = req.user;
        
        // Create a script to send user data to the frontend
        const userScript = `
            <script>
                // Store user data in localStorage
                const userData = {
                    username: "${user.username}",
                    email: "${user.email}",
                    avatar: "${user.avatar}",
                    provider: "google",
                    loginTime: "${new Date().toISOString()}"
                };
                
                localStorage.setItem('eventhive_current_user', JSON.stringify(userData));
                
                // Show success message and redirect
                const notification = document.createElement('div');
                notification.style.cssText = \`
                    position: fixed; top: 20px; right: 20px; z-index: 10000;
                    background: #4caf50; color: white; padding: 15px 25px;
                    border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    font-family: 'Segoe UI', sans-serif; font-weight: 500;
                \`;
                notification.textContent = 'Google login successful! Redirecting...';
                document.body.appendChild(notification);
                
                // Redirect to main page after 2 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            </script>
        `;
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login Successful - EventHive</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', sans-serif; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0; padding: 0; height: 100vh;
                        display: flex; align-items: center; justify-content: center;
                        color: white;
                    }
                    .container {
                        text-align: center; padding: 40px;
                        background: rgba(255,255,255,0.1); border-radius: 20px;
                        backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    }
                    h1 { margin: 0 0 10px 0; font-size: 2.5em; }
                    p { margin: 0; font-size: 1.2em; opacity: 0.9; }
                    .spinner {
                        width: 40px; height: 40px; margin: 20px auto;
                        border: 4px solid rgba(255,255,255,0.3);
                        border-top: 4px solid white; border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Welcome to EventHive!</h1>
                    <p>Google authentication successful</p>
                    <div class="spinner"></div>
                    <p>Redirecting you to the main page...</p>
                </div>
                ${userScript}
            </body>
            </html>
        `);
    }
);

// Logout route
app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Session destroy failed' });
            }
            res.json({ success: true, message: 'Logged out successfully' });
        });
    });
});

// API route to check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            authenticated: true, 
            user: req.user 
        });
    } else {
        res.json({ 
            authenticated: false 
        });
    }
});

// API route to get user profile
app.get('/api/user/profile', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const user = await User.findById(req.user._id);
        res.json({ 
            success: true, 
            user: user
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch profile',
            message: error.message 
        });
    }
});

// API endpoint to get all events
app.get('/api/events', async (req, res) => {
    try {
        const { category, type, search, page = 1, limit = 10 } = req.query;
        
        // Build filter object
        const filter = { isActive: true };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (type && type !== 'all') {
            filter.type = type;
        }
        
        if (search) {
            filter.$text = { $search: search };
        }
        
        const events = await Event.find(filter)
            .populate('organizer', 'username email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
            
        const total = await Event.countDocuments(filter);
        
        res.json({
            success: true,
            data: events,  // Changed from 'events' to 'data' for frontend compatibility
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Events fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch events',
            message: error.message 
        });
    }
});

// API endpoint to get single event
app.get('/api/events/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'username email avatar');
            
        if (!event) {
            return res.status(404).json({ 
                error: 'Event not found' 
            });
        }
        
        res.json({
            success: true,
            event: event
        });
    } catch (error) {
        console.error('Event fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch event',
            message: error.message 
        });
    }
});

// API endpoint to create a new event (admin only)
app.post('/api/events', async (req, res) => {
    try {
        console.log('📝 Event creation request received');
        console.log('📊 Request body size:', JSON.stringify(req.body).length, 'characters');
        
        const { 
            title, 
            description, 
            date, 
            location, 
            category, 
            type, 
            standardPrice, 
            vipPrice, 
            image,
            coordinates,
            maxAttendees = 1000
        } = req.body;
        
        console.log('🏷️ Event data received:', { title, category, type, location });
        
        // Validate required fields
        if (!title || !description || !date || !location || !category || !type || !standardPrice || !vipPrice) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({ 
                success: false,
                message: 'All required fields must be provided' 
            });
        }
        
        console.log('🔧 Creating new event document...');
        
        // Get or create admin user as organizer
        let organizerId = req.body.organizerId;
        if (!organizerId) {
            // Try to find existing admin user
            let adminUser = await User.findOne({ role: 'admin' });
            
            if (!adminUser) {
                // Create default admin user if none exists
                console.log('📝 Creating default admin user...');
                adminUser = new User({
                    username: 'admin',
                    email: 'admin@eventhive.com',
                    password: 'hashed-admin-password', // This would be properly hashed in production
                    role: 'admin',
                    isVerified: true
                });
                await adminUser.save();
                console.log('✅ Default admin user created with ID:', adminUser._id);
            }
            
            organizerId = adminUser._id;
        }
        
        // Create new event
        const newEvent = new Event({
            title,
            description,
            date,
            location,
            category,
            type,
            standardPrice: parseFloat(standardPrice),
            vipPrice: parseFloat(vipPrice),
            image: image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            maxAttendees,
            currentAttendees: 0,
            organizer: organizerId,
            venue: {
                name: location,
                address: location,
                coordinates: coordinates ? {
                    lat: parseFloat(coordinates.split(',')[0]),
                    lng: parseFloat(coordinates.split(',')[1])
                } : undefined
            },
            tags: req.body.tags || []
        });
        
        console.log('💾 Saving event to database...');
        const savedEvent = await newEvent.save();
        console.log('✅ Event saved successfully with ID:', savedEvent._id);
        
        res.json({
            success: true,
            message: 'Event created successfully!',
            event: savedEvent
        });
        
    } catch (error) {
        console.error('❌ Event creation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create event',
            error: error.message 
        });
    }
});

// API endpoint to create a new booking
app.post('/api/bookings', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        console.log('🎫 Booking request received:', req.body);
        console.log('👤 User:', req.user.username);
        
        const { eventId, tickets, attendees, totalAmount } = req.body;
        
        if (!eventId || !tickets || !attendees || !totalAmount) {
            return res.status(400).json({ 
                error: 'Missing required booking information' 
            });
        }
        
        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                error: 'Event not found' 
            });
        }
        
        // Generate booking reference if not provided
        const bookingReference = req.body.bookingReference || 'EH' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
        
        // Create new booking
        const booking = new Booking({
            user: req.user._id,
            event: eventId,
            tickets: tickets,
            attendees: attendees,
            totalAmount: totalAmount,
            status: 'confirmed',
            paymentStatus: req.body.paymentStatus || 'completed',
            paymentMethod: req.body.paymentMethod || 'card',
            bookingReference: bookingReference
        });
        
        await booking.save();
        
        // Update event attendee count
        const totalTickets = (tickets.standard?.quantity || 0) + (tickets.vip?.quantity || 0);
        event.currentAttendees += totalTickets;
        await event.save();
        
        res.json({
            success: true,
            booking: booking,
            message: 'Booking created successfully!'
        });
        
    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create booking',
            message: error.message 
        });
    }
});

// API endpoint to get user bookings
app.get('/api/user/bookings', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const bookings = await Booking.find({ user: req.user._id })
            .populate('event', 'title date location image category type')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            bookings: bookings
        });
        
    } catch (error) {
        console.error('Bookings fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bookings',
            message: error.message 
        });
    }
});

// API endpoint to cancel a booking
app.put('/api/bookings/:id/cancel', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const booking = await Booking.findOne({ 
            _id: req.params.id,
            user: req.user._id 
        }).populate('event');
        
        if (!booking) {
            return res.status(404).json({ 
                error: 'Booking not found' 
            });
        }
        
        if (booking.status === 'cancelled') {
            return res.status(400).json({ 
                error: 'Booking is already cancelled' 
            });
        }
        
        // Update booking status
        booking.status = 'cancelled';
        await booking.save();
        
        // Update event attendee count
        const totalTickets = (booking.tickets.standard?.quantity || 0) + (booking.tickets.vip?.quantity || 0);
        booking.event.currentAttendees -= totalTickets;
        await booking.event.save();
        
        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });
        
    } catch (error) {
        console.error('Booking cancellation error:', error);
        res.status(500).json({ 
            error: 'Failed to cancel booking',
            message: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EventHive Authentication Server running on http://localhost:${PORT}`);
    console.log(`📱 Main page: http://localhost:${PORT}`);
    console.log(`🔐 Auth page: http://localhost:${PORT}/auth`);
    console.log(`🔑 Google OAuth: http://localhost:${PORT}/auth/google`);
    
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
        console.log('\n⚠️  WARNING: Google OAuth not configured!');
        console.log('📝 Please set up Google OAuth credentials:');
        console.log('   1. Go to https://console.developers.google.com/');
        console.log('   2. Create a new project or select existing');
        console.log('   3. Enable Google+ API');
        console.log('   4. Create OAuth 2.0 credentials');
        console.log('   5. Add redirect URI: http://localhost:3000/auth/google/callback');
        console.log('   6. Update .env file with your credentials');
    }
});

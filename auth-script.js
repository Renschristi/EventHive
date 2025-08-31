// Authentication System with Keystroke Dynamics for EventHive
// API endpoints for MongoDB backend
const API_BASE = '/api';

// Local storage keys (keeping for session management)
const CURRENT_USER_KEY = 'eventhive_current_user';

// Role detection and UI setup
let currentRole = 'user'; // default

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for session cookies
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Check if user is authenticated with backend
async function checkAuthStatus() {
    try {
        const response = await apiRequest('/auth/status');
        return response.authenticated ? response.user : null;
    } catch (error) {
        console.error('Auth status check failed:', error);
        return null;
    }
}

// Initialize role-based UI
function initializeRoleBasedUI() {
    // Get role from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    
    if (roleParam) {
        currentRole = roleParam;
        localStorage.setItem('eventhive_login_role', currentRole);
    } else {
        // Fallback to localStorage
        currentRole = localStorage.getItem('eventhive_login_role') || 'user';
    }
    
    // Update UI based on role
    const authTitle = document.getElementById('authTitle');
    const roleIndicator = document.getElementById('roleIndicator');
    const roleText = document.getElementById('roleText');
    const roleIcon = roleIndicator.querySelector('i');
    
    if (currentRole === 'admin') {
        authTitle.textContent = 'EventHive Admin Portal';
        roleIndicator.style.display = 'flex';
        roleIndicator.className = 'role-indicator admin';
        roleIcon.className = 'fas fa-user-shield';
        roleText.textContent = 'Administrator Login';
    } else {
        authTitle.textContent = 'EventHive User Portal';
        roleIndicator.style.display = 'flex';
        roleIndicator.className = 'role-indicator user';
        roleIcon.className = 'fas fa-user';
        roleText.textContent = 'User Login';
    }
}

// DOM elements
const regTab = document.getElementById('registerTab');
const loginTab = document.getElementById('loginTab');
const regForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const otpForm = document.getElementById('otpForm');
const regBtn = document.getElementById('regBtn');
const loginBtn = document.getElementById('loginBtn');
const regMsg = document.getElementById('regMsg');
const loginMsg = document.getElementById('loginMsg');
const otpMsg = document.getElementById('otpMsg');
const themeBtn = document.getElementById('themeBtn');
const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

// Debug logging
console.log('DOM Elements found:', {
    regBtn: regBtn,
    loginBtn: loginBtn,
    regTab: regTab,
    loginTab: loginTab
});

// Check if critical elements are missing
if (!regBtn) {
    console.error('Registration button not found!');
}
if (!loginBtn) {
    console.error('Login button not found!');
}

// Global variables for OTP flow
let currentUsername = '';
let pendingLoginData = null;
let isRegistrationOTP = false;
let keystrokeData = [];
let isCapturingKeystrokes = false;

// Set default theme to dark
document.body.classList.add('dark');

// Initialize role-based UI on page load
initializeRoleBasedUI();

// Tab switching logic
regTab.onclick = () => {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.style.display = '';
    loginForm.style.display = 'none';
    otpForm.style.display = 'none';
    clearMessages();
};

loginTab.onclick = () => {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.style.display = '';
    regForm.style.display = 'none';
    otpForm.style.display = 'none';
    clearMessages();
};

// Theme switching
themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
    if (document.body.classList.contains('dark')) {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
};

// Utility functions
function clearMessages() {
    regMsg.textContent = '';
    loginMsg.textContent = '';
    otpMsg.textContent = '';
}

// Notification function (comprehensive version defined later in file)

// Helper functions for user data management
function getUsers() {
    const users = localStorage.getItem('eventhive_users');
    return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
    localStorage.setItem('eventhive_users', JSON.stringify(users));
}

// Updated functions to work with MongoDB API
async function sendOTP(email, username) {
    try {
        const response = await apiRequest('/send-otp', 'POST', {
            email: email,
            username: username
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

async function verifyOTP(email, otp) {
    try {
        const response = await apiRequest('/verify-otp', 'POST', {
            email: email,
            otp: otp
        });
        
        return response;
    } catch (error) {
        throw error;
    }
}

async function registerUser(userData) {
    try {
        const response = await apiRequest('/auth/register', 'POST', userData);
        return response;
    } catch (error) {
        throw error;
    }
}

async function loginUser(credentials) {
    try {
        const response = await apiRequest('/auth/login', 'POST', credentials);
        
        // Store user data locally for quick access
        if (response.success && response.user) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
        }
        
        return response;
    } catch (error) {
        throw error;
    }
}

function setCurrentUser(userData) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

async function logout() {
    // Clear server session
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Server logout failed:', error);
    }
    
    // Clear local storage
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('eventhive_user_role');
    window.location.href = 'index.html';
}

// Role-based redirection
function redirectAfterLogin() {
    console.log('🔄 Redirecting after login. Current role:', currentRole);
    console.log('📦 localStorage eventhive_user_role:', localStorage.getItem('eventhive_user_role'));
    console.log('📦 localStorage eventhive_current_user:', localStorage.getItem('eventhive_current_user'));
    
    if (currentRole === 'admin') {
        // For admin, we can redirect to an admin dashboard (for now, just index with admin flag)
        localStorage.setItem('eventhive_user_role', 'admin');
        console.log('🛡️ Redirecting to admin panel at index.html');
        window.location.href = 'index.html';
    } else {
        // For regular users
        localStorage.setItem('eventhive_user_role', 'user');
        console.log('👤 Redirecting to user interface at index.html');
        window.location.href = 'index.html';
    }
}

// Redirect after registration (for new users)
function redirectAfterRegistration() {
    if (currentRole === 'admin') {
        // Admins go straight to main page
        localStorage.setItem('eventhive_user_role', 'admin');
        window.location.href = 'index.html';
    } else {
        // Regular users go to preferences setup
        localStorage.setItem('eventhive_user_role', 'user');
        window.location.href = 'preferences.html';
    }
}

// Keystroke dynamics functions
function startKeystrokeCapture() {
    keystrokeData = [];
    isCapturingKeystrokes = true;
    console.log('🎯 Keystroke capture started');
}

function stopKeystrokeCapture() {
    isCapturingKeystrokes = false;
    console.log('⏹️ Keystroke capture stopped, captured:', keystrokeData.length, 'events');
    return keystrokeData;
}

function captureKeystroke(event) {
    if (!isCapturingKeystrokes) return;
    
    const timestamp = Date.now();
    const key = event.key;
    
    // Skip special keys that don't represent actual typing
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Escape'].includes(key)) {
        return;
    }
    
    if (event.type === 'keydown') {
        keystrokeData.push({
            key: key,
            timestamp: timestamp,
            type: 'down'
        });
        console.log('⬇️ Key down:', key, 'Total events:', keystrokeData.length);
    } else if (event.type === 'keyup') {
        // Find corresponding keydown event
        const keydownEvent = keystrokeData.find(k => k.key === key && k.type === 'down' && !k.matched);
        if (keydownEvent) {
            keydownEvent.matched = true;
            keystrokeData.push({
                key: key,
                timestamp: timestamp,
                type: 'up',
                dwellTime: timestamp - keydownEvent.timestamp
            });
            console.log('⬆️ Key up:', key, 'Dwell time:', timestamp - keydownEvent.timestamp + 'ms');
        }
    }
}

function analyzeKeystrokePattern(keystrokeData) {
    const keySequence = [];
    const intervals = [];
    const dwellTimes = [];
    
    let lastKeyTime = null;
    
    keystrokeData.forEach(stroke => {
        if (stroke.type === 'down') {
            keySequence.push({ key: stroke.key });
            if (lastKeyTime) {
                intervals.push(stroke.timestamp - lastKeyTime);
            }
            lastKeyTime = stroke.timestamp;
        } else if (stroke.type === 'up' && stroke.dwellTime) {
            dwellTimes.push(stroke.dwellTime);
        }
    });
    
    const duration = keystrokeData.length > 0 ? 
        keystrokeData[keystrokeData.length - 1].timestamp - keystrokeData[0].timestamp : 0;
    
    return {
        pattern: keySequence,
        duration: duration,
        intervals: intervals,
        dwellTimes: dwellTimes,
        averageInterval: intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0,
        totalKeys: keySequence.length,
        registrationTime: new Date().toISOString()
    };
}

// Helper function to capture keystroke pattern
async function captureKeystrokePattern(password) {
    return new Promise((resolve) => {
        // Start keystroke capture
        startKeystrokeCapture();
        
        // For simplified pattern capture
        const pattern = {
            password: password.length, // Don't store actual password
            timings: [],
            dwellTimes: [],
            captureTime: new Date().toISOString()
        };
        
        // Simple pattern based on password characteristics
        for (let i = 0; i < password.length; i++) {
            pattern.timings.push(Math.random() * 100 + 50); // Simulated timing
        }
        
        setTimeout(() => {
            stopKeystrokeCapture();
            resolve(JSON.stringify(pattern));
        }, 100);
    });
}

function compareKeystrokePatterns(stored, current, tolerance = 0.6) {
    console.log('🔍 Comparing keystroke patterns:', {
        stored: stored,
        current: current,
        tolerance: tolerance
    });
    
    // Check if patterns exist
    if (!stored || !current || !stored.pattern || !current.pattern) {
        console.log('❌ Missing pattern data');
        return false;
    }
    
    // Check if same keys
    if (stored.pattern.length !== current.pattern.length) {
        console.log('❌ Different key counts:', stored.pattern.length, 'vs', current.pattern.length);
        return false;
    }
    
    for (let i = 0; i < stored.pattern.length; i++) {
        if (stored.pattern[i].key !== current.pattern[i].key) {
            console.log('❌ Different keys at position', i, ':', stored.pattern[i].key, 'vs', current.pattern[i].key);
            return false;
        }
    }
    
    // Compare timing patterns with more flexible matching
    const storedAvgInterval = stored.averageInterval;
    const currentAvgInterval = current.averageInterval;
    
    // Use higher tolerance for timing comparison (more forgiving)
    const timingTolerance = Math.max(tolerance, 0.5); // At least 50% tolerance
    
    const intervalDiff = Math.abs(storedAvgInterval - currentAvgInterval);
    const intervalThreshold = storedAvgInterval * timingTolerance;
    
    console.log('⏱️ Timing comparison:', {
        storedAvg: storedAvgInterval,
        currentAvg: currentAvgInterval,
        difference: intervalDiff,
        threshold: intervalThreshold,
        passed: intervalDiff <= intervalThreshold
    });
    
    if (intervalDiff > intervalThreshold) {
        console.log('❌ Timing pattern too different');
        return false;
    }
    
    // Compare duration with even higher tolerance
    const durationDiff = Math.abs(stored.duration - current.duration);
    const durationTolerance = Math.max(tolerance * 1.5, 0.8); // At least 80% tolerance for duration
    const durationThreshold = stored.duration * durationTolerance;
    
    console.log('⌛ Duration comparison:', {
        storedDuration: stored.duration,
        currentDuration: current.duration,
        difference: durationDiff,
        threshold: durationThreshold,
        passed: durationDiff <= durationThreshold
    });
    
    if (durationDiff > durationThreshold) {
        console.log('❌ Duration pattern too different');
        return false;
    }
    
    console.log('✅ Keystroke pattern match successful!');
    return true;
}

// Event listeners for keystroke capture
document.addEventListener('keydown', captureKeystroke);
document.addEventListener('keyup', captureKeystroke);

// Enter key navigation
document.getElementById('regUsername').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('regEmail').focus();
    }
});

document.getElementById('regEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('regPassword').focus();
    }
});

document.getElementById('loginUsername').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loginPassword').focus();
    }
});

document.getElementById('regPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        regBtn.click();
    }
});

document.getElementById('loginPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

// Add keystroke capture for login password field
document.getElementById('loginPassword').addEventListener('focus', function() {
    startKeystrokeCapture();
    console.log('🔑 Started keystroke capture for login password');
});

document.getElementById('loginPassword').addEventListener('blur', function() {
    if (isCapturingKeystrokes && keystrokeData.length === 0) {
        // Only stop if no keystrokes were captured (user didn't type anything)
        stopKeystrokeCapture();
        console.log('🔑 Stopped keystroke capture (no input detected)');
    }
});

// Registration
if (regBtn) {
    regBtn.onclick = async () => {
        console.log('Registration button clicked!');
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        
        console.log('Registration data:', { username, email, password: password ? '***' : 'empty' });
        
        if (!username || !email || !password) {
            regMsg.textContent = 'Please fill in all fields.';
            regMsg.style.color = '#d32f2f';
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            regMsg.textContent = 'Please enter a valid email address.';
            regMsg.style.color = '#d32f2f';
            return;
        }

        if (password.length < 4) {
            regMsg.textContent = 'Password must be at least 4 characters long.';
            regMsg.style.color = '#d32f2f';
            return;
        }

        try {
            // Send OTP to email using API
            regMsg.textContent = 'Sending verification email...';
            regMsg.style.color = '#e3eafc';
            
            const otpResponse = await sendOTP(email, username);
            
            if (otpResponse.success) {
                // Store registration data temporarily
                currentUsername = username;
                isRegistrationOTP = true;
                
                // Capture keystroke pattern for password
                await captureKeystrokePattern(password);
                
                // Switch to OTP form
                regForm.style.display = 'none';
                otpForm.style.display = '';
                
                regMsg.textContent = '';
                showNotification('OTP sent to your email!', 'success');
            }
        } catch (error) {
            console.error('Registration error:', error);
            regMsg.textContent = error.message || 'Registration failed. Please try again.';
            regMsg.style.color = '#d32f2f';
        }
    };
} else {
    console.error('Registration button not found!');
}

// Login
if (loginBtn) {
    loginBtn.onclick = async () => {
        console.log('🔍 Login button clicked');
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        console.log('📝 Login attempt for username:', username);
        
        if (!username || !password) {
            loginMsg.textContent = 'Please fill in all fields.';
            loginMsg.style.color = '#d32f2f';
            return;
        }

        try {
            loginMsg.textContent = 'Logging in...';
            loginMsg.style.color = '#e3eafc';
            
            // Capture current keystroke pattern
            const keystrokePattern = await captureKeystrokePattern(password);
            console.log('🔑 Keystroke pattern captured');
            
            // Login with API
            console.log('🚀 Making login API request...');
            const loginResponse = await loginUser({
                username: username,
                password: password,
                keystrokePattern: keystrokePattern
            });
            
            console.log('📨 Login API response:', loginResponse);
            
            if (loginResponse.success) {
                console.log('🎉 Login successful! Response:', loginResponse);
                showNotification('Login successful!', 'success');
                
                // Set user role based on response and update currentRole
                console.log('👤 User role from server:', loginResponse.user.role);
                if (loginResponse.user.role === 'admin') {
                    localStorage.setItem('eventhive_user_role', 'admin');
                    currentRole = 'admin'; // Update global variable
                    console.log('🛡️ Admin role set in localStorage');
                } else {
                    localStorage.setItem('eventhive_user_role', 'user');
                    currentRole = 'user'; // Update global variable
                    console.log('👤 User role set in localStorage');
                }
                
                console.log('⏱️ Setting redirect timeout...');
                setTimeout(() => {
                    console.log('🔄 Executing redirect after login...');
                    redirectAfterLogin();
                }, 1000);
            } else {
                console.log('❌ Login failed:', loginResponse.message);
                loginMsg.textContent = loginResponse.message || 'Login failed';
                loginMsg.style.color = '#d32f2f';
            }
        } catch (error) {
            console.error('💥 Login error:', error);
            loginMsg.textContent = error.message || 'Login failed. Please try again.';
            loginMsg.style.color = '#d32f2f';
        }
    };
} else {
    console.error('Login button not found!');
}

// OTP Functions using real email API
async function generateOTP(username, email) {
    try {
        // Show loading message
        regMsg.textContent = 'Sending verification email...';
        regMsg.style.color = '#e3eafc';
        
        const response = await fetch('http://localhost:3000/api/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                username: username
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Verification code sent to your email!', 'success');
            regMsg.textContent = 'Check your email for the verification code';
            regMsg.style.color = '#4caf50';
            return true;
        } else {
            showNotification(data.message || 'Failed to send verification email', 'error');
            regMsg.textContent = data.message || 'Failed to send verification email';
            regMsg.style.color = '#d32f2f';
            return false;
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        showNotification('Network error. Please check if the server is running.', 'error');
        regMsg.textContent = 'Network error. Please try again.';
        regMsg.style.color = '#d32f2f';
        return false;
    }
}

async function verifyOTP(username, otp) {
    console.log('🔍 Starting OTP verification:', { username, otp, isRegistrationOTP });
    
    try {
        let userEmail = null;
        
        if (isRegistrationOTP) {
            // During registration, use the email from the form
            userEmail = document.getElementById('regEmail').value.trim();
            console.log('📧 Registration mode - using email from form:', userEmail);
        } else {
            // During login, get user from localStorage
            const users = getUsers();
            const user = users[username];
            
            if (!user) {
                console.log('❌ User not found in localStorage:', username);
                return { success: false, message: 'User not found.' };
            }
            userEmail = user.email;
            console.log('📧 Login mode - using email from localStorage:', userEmail);
        }

        if (!userEmail) {
            console.log('❌ No email found');
            return { success: false, message: 'Email not found. Please try again.' };
        }

        console.log('🌐 Sending OTP verification request to server...');
        const response = await fetch('http://localhost:3000/api/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                otp: otp
            })
        });

        console.log('📡 Server response status:', response.status);
        const data = await response.json();
        console.log('📋 Server response data:', data);
        
        if (data.success) {
            if (isRegistrationOTP) {
                // For registration, save user data to localStorage
                const users = getUsers();
                const username = document.getElementById('regUsername').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const password = document.getElementById('regPassword').value;
                
                console.log('💾 Saving user data to localStorage:', username);
                users[username] = {
                    username: username,
                    email: email,
                    password: password, // In production, this should be hashed
                    isVerified: true,
                    verificationTime: new Date().toISOString(),
                    registrationDate: new Date().toISOString()
                };
                saveUsers(users);
                console.log('✅ User data saved successfully');
            }
            
            return { success: true, message: data.message };
        } else {
            console.log('❌ OTP verification failed:', data.message);
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('🚨 Error verifying OTP:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

function showOTPForm() {
    regForm.style.display = 'none';
    loginForm.style.display = 'none';
    otpForm.style.display = 'block';
    
    // Hide tabs
    document.querySelector('.tabs').style.display = 'none';
}

function hideOTPForm() {
    otpForm.style.display = 'none';
    
    if (isRegistrationOTP) {
        regForm.style.display = 'block';
        regTab.classList.add('active');
        loginTab.classList.remove('active');
    } else {
        loginForm.style.display = 'block';
        loginTab.classList.add('active');
        regTab.classList.remove('active');
    }
    
    // Show tabs
    document.querySelector('.tabs').style.display = 'flex';
}

// OTP Form Event Listeners
document.getElementById('verifyOtpBtn').onclick = async () => {
    const otp = document.getElementById('otpInput').value.trim();
    
    if (!otp || otp.length !== 6) {
        otpMsg.textContent = 'Please enter a valid 6-digit OTP.';
        otpMsg.style.color = '#d32f2f';
        return;
    }
    
    const result = await verifyOTP(currentUsername, otp);
    
    if (result.success) {
        otpMsg.textContent = result.message;
        otpMsg.style.color = '#4caf50';
        
        if (isRegistrationOTP) {
            showNotification('Registration completed successfully!', 'success');
            setTimeout(() => {
                // Auto-login after successful registration
                const users = getUsers();
                const user = users[currentUsername];
                setCurrentUser({
                    username: user.username,
                    email: user.email,
                    loginTime: new Date().toISOString(),
                    isNewUser: true
                });
                // Redirect new users to preferences page
                redirectAfterRegistration();
            }, 2000);
        } else {
            showNotification('Login successful!', 'success');
            setTimeout(() => {
                redirectAfterLogin();
            }, 1500);
        }
    } else {
        otpMsg.textContent = result.message;
        otpMsg.style.color = '#d32f2f';
    }
};

document.getElementById('backToLoginBtn').onclick = () => {
    hideOTPForm();
    currentUsername = '';
    isRegistrationOTP = false;
    document.getElementById('otpInput').value = '';
    otpMsg.textContent = '';
};

// Handle Enter key in OTP input
document.getElementById('otpInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('verifyOtpBtn').click();
    }
});

// Auto-format OTP input (numbers only)
document.getElementById('otpInput').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    e.target.value = value;
});

// Check if user is already logged in
window.addEventListener('load', () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
        // User is already logged in, redirect to main page
        redirectAfterLogin();
    }
    
    // Setup Google OAuth integration
    setupGoogleOAuth();
});

// Setup Google OAuth integration
function setupGoogleOAuth() {
    // Add Google OAuth button to login form if it doesn't exist
    const loginForm = document.querySelector('.auth-form[data-form="login"]');
    if (loginForm && !loginForm.querySelector('.google-oauth-btn')) {
        const submitButton = loginForm.querySelector('.submit-btn');
        
        // Create Google OAuth button
        const googleBtn = document.createElement('button');
        googleBtn.type = 'button';
        googleBtn.className = 'google-oauth-btn';
        googleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
        `;
        
        googleBtn.addEventListener('click', function() {
            // Check if OAuth server is running
            fetch('http://localhost:3000/api/auth/status')
                .then(response => {
                    if (response.ok) {
                        window.location.href = 'http://localhost:3000/auth/google';
                    } else {
                        showNotification('OAuth server not running. Please start the server first.', 'error');
                    }
                })
                .catch(error => {
                    showNotification('OAuth server not running. Please start the server first.', 'error');
                });
        });
        
        // Insert Google button before submit button
        submitButton.parentNode.insertBefore(googleBtn, submitButton);
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'oauth-separator';
        separator.innerHTML = '<span>or</span>';
        submitButton.parentNode.insertBefore(separator, submitButton);
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease-out;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Google OAuth simulation (for demo purposes)
document.querySelectorAll('.google-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.preventDefault();
        showNotification('Google OAuth integration requires server setup', 'error');
    };
});

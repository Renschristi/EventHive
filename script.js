// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API request helper
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include' // Include cookies for session authentication
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Helper function to validate authentication and redirect if needed
async function validateAuthentication() {
    try {
        const authStatus = await apiRequest('/auth/status');
        return authStatus.authenticated ? authStatus.user : null;
    } catch (error) {
        console.error('Authentication validation failed:', error);
        return null;
    }
}

// Events storage - now loaded from MongoDB
let events = [];

// Load events from MongoDB API
async function loadEventsFromAPI() {
    try {
        const response = await apiRequest('/events');
        events = response.data || [];
        console.log('Events loaded from API:', events.length);
        return events;
    } catch (error) {
        console.error('Failed to load events from API:', error);
        // Fallback to empty array if API fails
        events = [];
        return events;
    }
}

// Authentication and storage keys
const CURRENT_USER_KEY = 'eventhive_current_user';
const USER_BOOKINGS_KEY = 'eventhive_user_bookings';

// DOM elements
const categoryFilter = document.getElementById('categoryFilter');
const eventTypeFilter = document.getElementById('eventTypeFilter');
const eventsGrid = document.getElementById('eventsGrid');
const eventsTitle = document.getElementById('eventsTitle');
const noEvents = document.getElementById('noEvents');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
const authToggleBtn = document.getElementById('authToggleBtn');
const myBookingsBtn = document.getElementById('myBookingsBtn');
const eventTypeGroup = document.getElementById('eventTypeGroup');
const dateFilterGroup = document.getElementById('dateFilterGroup');
const dateFilter = document.getElementById('dateFilter');
const profileDropdownContainer = document.getElementById('profileDropdownContainer');
const profileAvatar = document.getElementById('profileAvatar');
const profileText = document.getElementById('profileText');

// State
let filteredEvents = [...events];
let currentUser = null;
let isBookingFlowActive = false;
let isContentRemoved = false;
let originalMainContent = null;
let originalHeader = null;
let userPreferences = null;

// Authentication functions
function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Load user preferences
function loadUserPreferences() {
    const user = getCurrentUser();
    if (!user) return null;
    
    const prefsKey = `eventhive_user_preferences_${user.username}`;
    const storedPrefs = localStorage.getItem(prefsKey);
    
    if (storedPrefs) {
        try {
            return JSON.parse(storedPrefs);
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return null;
        }
    }
    return null;
}

// Calculate event recommendation score based on user preferences
function calculateEventScore(event, preferences) {
    if (!preferences) return 0;
    
    let score = 0;
    
    // Category match (40% weight)
    if (preferences.categories && preferences.categories.includes(event.category)) {
        score += 40;
    }
    
    // Type match (30% weight)
    if (preferences.types && preferences.types.includes(event.type)) {
        score += 30;
    }
    
    // Budget match (20% weight)
    if (preferences.budget) {
        const eventPrice = event.standardPrice || 0;
        let budgetMatch = false;
        
        switch (preferences.budget) {
            case 'free':
                budgetMatch = eventPrice === 0;
                break;
            case 'low':
                budgetMatch = eventPrice > 0 && eventPrice <= 50;
                break;
            case 'medium':
                budgetMatch = eventPrice > 50 && eventPrice <= 200;
                break;
            case 'high':
                budgetMatch = eventPrice > 200 && eventPrice <= 500;
                break;
            case 'premium':
                budgetMatch = eventPrice > 500;
                break;
        }
        
        if (budgetMatch) {
            score += 20;
        }
    }
    
    // Location match (10% weight)
    if (preferences.location && preferences.location.city) {
        const userCity = preferences.location.city.toLowerCase();
        const eventLocation = event.location.toLowerCase();
        if (eventLocation.includes(userCity)) {
            score += 10;
        }
    }
    
    return score;
}

// Sort events by recommendation score
function getRecommendedEvents(events, preferences) {
    if (!preferences) return events;
    
    return events.map(event => ({
        ...event,
        recommendationScore: calculateEventScore(event, preferences)
    })).sort((a, b) => b.recommendationScore - a.recommendationScore);
}

// Check if user should see preferences prompt
function shouldShowPreferencesPrompt() {
    const user = getCurrentUser();
    if (!user) return false;
    
    const hasCompletedPrefs = localStorage.getItem(`eventhive_preferences_completed_${user.username}`);
    const hasSkippedPrefs = localStorage.getItem(`eventhive_preferences_skipped_${user.username}`);
    
    return !hasCompletedPrefs && !hasSkippedPrefs;
}

// Show preferences prompt
function showPreferencesPrompt() {
    const promptHTML = `
        <div class="preferences-prompt" id="preferencesPrompt">
            <div class="prompt-content">
                <div class="prompt-icon">
                    <i class="fas fa-heart"></i>
                </div>
                <h3>Personalize Your Experience!</h3>
                <p>Set up your preferences to get personalized event recommendations tailored just for you.</p>
                <div class="prompt-actions">
                    <button class="btn secondary" onclick="skipPreferencesPrompt()">Maybe Later</button>
                    <button class="btn primary" onclick="goToPreferences()">Set Preferences</button>
                </div>
            </div>
        </div>
    `;
    
    // Insert prompt after header
    const header = document.querySelector('.header');
    header.insertAdjacentHTML('afterend', promptHTML);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .preferences-prompt {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .preferences-prompt::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="a" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="0.1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23a)"/></svg>');
            opacity: 0.1;
        }
        
        .prompt-content {
            position: relative;
            z-index: 1;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .prompt-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.9;
        }
        
        .preferences-prompt h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .preferences-prompt p {
            margin-bottom: 1.5rem;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .prompt-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .preferences-prompt .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }
        
        .preferences-prompt .btn.primary {
            background: white;
            color: #667eea;
        }
        
        .preferences-prompt .btn.primary:hover {
            background: #f1f3f4;
            transform: translateY(-2px);
        }
        
        .preferences-prompt .btn.secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .preferences-prompt .btn.secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        @media (max-width: 768px) {
            .prompt-actions {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
}

// Go to preferences page
function goToPreferences() {
    window.location.href = 'preferences.html';
}

// Skip preferences prompt
function skipPreferencesPrompt() {
    const user = getCurrentUser();
    if (user) {
        localStorage.setItem(`eventhive_preferences_skipped_${user.username}`, 'true');
    }
    
    const prompt = document.getElementById('preferencesPrompt');
    if (prompt) {
        prompt.style.animation = 'slideUp 0.3s ease-in-out';
        setTimeout(() => {
            prompt.remove();
        }, 300);
    }
}

// Add recommendation badges to events
function addRecommendationBadges(recommendedEvents) {
    if (!recommendedEvents || !userPreferences) return;
    
    // Add recommendation info to events for display
    recommendedEvents.forEach((event, index) => {
        if (event.recommendationScore > 50) {
            event.isHighlyRecommended = true;
            event.recommendationLevel = 'high';
        } else if (event.recommendationScore > 20) {
            event.isRecommended = true;
            event.recommendationLevel = 'medium';
        }
        
        // Mark top 3 as "For You"
        if (index < 3 && event.recommendationScore > 0) {
            event.isPersonalized = true;
        }
    });
}

// Get recommendation badge HTML
function getRecommendationBadgeHTML(event) {
    if (!userPreferences) return '';
    
    let badgeHTML = '';
    
    if (event.isPersonalized) {
        badgeHTML += `
            <div class="recommendation-badge personalized">
                <i class="fas fa-heart"></i>
                <span>For You</span>
            </div>
        `;
    }
    
    if (event.isHighlyRecommended) {
        badgeHTML += `
            <div class="recommendation-badge highly-recommended">
                <i class="fas fa-star"></i>
                <span>Perfect Match</span>
            </div>
        `;
    } else if (event.isRecommended) {
        badgeHTML += `
            <div class="recommendation-badge recommended">
                <i class="fas fa-thumbs-up"></i>
                <span>Recommended</span>
            </div>
        `;
    }
    
    return badgeHTML;
}

function logout() {
    // Restore content and header if they were removed before logging out
    if (isContentRemoved && originalMainContent && originalHeader) {
        const body = document.body;
        const adminWelcomeElement = document.getElementById('adminWelcome');
        
        // Restore header first
        body.insertBefore(originalHeader, body.firstChild);
        
        // Restore main content
        if (adminWelcomeElement) {
            body.insertBefore(originalMainContent, adminWelcomeElement);
        } else {
            body.appendChild(originalMainContent);
        }
        isContentRemoved = false;
    }
    
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('eventhive_user_role');
    currentUser = null;
    updateAuthUI();
    showNotification('Logged out successfully! Redirecting to login page...', 'success');
    
    // Redirect to login page after a brief delay
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 1500);
}

// Updated booking functions to work with MongoDB API
async function getUserBookings(username) {
    try {
        // Try API call with proper endpoint first
        try {
            const response = await apiRequest('/user/bookings');
            return response.bookings || [];
        } catch (apiError) {
            console.log('API booking check failed, using localStorage:', apiError.message);
            // Fallback to localStorage instead of redirecting immediately
            const localBookings = JSON.parse(localStorage.getItem('eventhive_user_bookings') || '{}');
            return localBookings[username] || [];
        }
    } catch (error) {
        console.error('Failed to load user bookings:', error);
        return [];
    }
}

async function saveUserBooking(username, eventId, bookingData) {
    try {
        // Always save to localStorage as fallback
        const localBookings = JSON.parse(localStorage.getItem('eventhive_user_bookings') || '{}');
        if (!localBookings[username]) {
            localBookings[username] = [];
        }
        if (!localBookings[username].includes(eventId)) {
            localBookings[username].push(eventId);
            localStorage.setItem('eventhive_user_bookings', JSON.stringify(localBookings));
        }
        
        // Try API call but don't fail if it doesn't work
        try {
            const response = await apiRequest('/bookings', 'POST', {
                username: username,
                eventId: eventId,
                ...bookingData
            });
            
            if (response.success) {
                console.log('Booking saved to API successfully:', response.data);
            }
        } catch (apiError) {
            console.log('API booking save failed, but localStorage updated:', apiError.message);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to save booking:', error);
        return false;
    }
}

function updateAuthUI() {
    const userRole = localStorage.getItem('eventhive_user_role');
    console.log('🔍 UpdateAuthUI - User role:', userRole);
    console.log('🔍 UpdateAuthUI - Current user:', currentUser);
    
    const mainContent = document.querySelector('.main');
    const adminWelcome = document.getElementById('adminWelcome');
    const header = document.querySelector('.header');
    
    if (currentUser) {
        // User is logged in
        profileDropdownContainer.style.display = 'block';
        profileAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        profileText.textContent = currentUser.username;
        
        if (userRole === 'admin') {
            console.log('🛡️ Admin detected - Setting up admin interface');
            // Admin interface - REMOVE ALL CONTENT AND NAVBAR
            const currentAuthBtn = document.getElementById('authToggleBtn');
            if (currentAuthBtn) {
                currentAuthBtn.textContent = 'Admin Panel';
                currentAuthBtn.onclick = () => {
                    showNotification('Admin Panel Active - Content Removed', 'success');
                };
            }
            
            // Store original content and header before removing them
            if (mainContent && !isContentRemoved) {
                originalMainContent = mainContent.cloneNode(true);
                originalHeader = header.cloneNode(true);
                isContentRemoved = true;
            }
            
            // Remove main content and header completely for admin
            if (mainContent) {
                console.log('🗑️ Removing main content for admin');
                mainContent.remove();
            }
            if (header) {
                console.log('🗑️ Removing header for admin');
                header.remove();
            }
            
            // Show admin welcome
            if (adminWelcome) {
                console.log('👑 Showing admin welcome panel');
                adminWelcome.style.display = 'block';
                // Initialize admin panel data
                initializeAdminPanel();
            } else {
                console.log('❌ Admin welcome panel not found!');
            }
            
            // Show admin elements
            myBookingsBtn.style.display = 'none';
            
        } else {
            // Regular user interface
            const currentAuthBtn = document.getElementById('authToggleBtn');
            if (currentAuthBtn) {
                currentAuthBtn.textContent = 'User Mode';
                currentAuthBtn.onclick = () => {
                    showNotification('User Mode Active', 'success');
                };
            }
            
            // Restore main content and header if they were removed
            if (isContentRemoved && originalMainContent && originalHeader) {
                const body = document.body;
                const adminWelcomeElement = document.getElementById('adminWelcome');
                
                // Restore header first
                body.insertBefore(originalHeader, body.firstChild);
                
                // Restore main content
                if (adminWelcomeElement) {
                    body.insertBefore(originalMainContent, adminWelcomeElement);
                } else {
                    body.appendChild(originalMainContent);
                }
                isContentRemoved = false;
                
                // Re-setup event listeners after restoration
                setTimeout(() => {
                    setupEventListeners();
                }, 100);
            }
            
            // Hide admin welcome for regular users
            if (adminWelcome) {
                adminWelcome.style.display = 'none';
            }
            
            // Show user elements
            myBookingsBtn.style.display = 'block';
            eventTypeGroup.style.display = 'block';
            dateFilterGroup.style.display = 'none';
            
            // User event handlers
            myBookingsBtn.onclick = showMyBookings;
        }
    } else {
        // User is not logged in
        // Find authToggleBtn again in case it was restored
        const currentAuthBtn = document.getElementById('authToggleBtn');
        if (currentAuthBtn) {
            currentAuthBtn.textContent = 'Login';
            currentAuthBtn.onclick = () => {
                window.location.href = 'auth.html';
            };
        }
        
        // Restore main content and header if they were removed
        if (isContentRemoved && originalMainContent && originalHeader) {
            const body = document.body;
            const adminWelcomeElement = document.getElementById('adminWelcome');
            
            // Restore header first
            body.insertBefore(originalHeader, body.firstChild);
            
            // Restore main content
            if (adminWelcomeElement) {
                body.insertBefore(originalMainContent, adminWelcomeElement);
            } else {
                body.appendChild(originalMainContent);
            }
            isContentRemoved = false;
            
            // Re-setup event listeners after restoration
            setTimeout(() => {
                setupEventListeners();
            }, 100);
        }
        
        // Hide admin welcome for non-logged in users
        if (adminWelcome) {
            adminWelcome.style.display = 'none';
        }
        
        profileDropdownContainer.style.display = 'none';
        myBookingsBtn.style.display = 'block';
        eventTypeGroup.style.display = 'block';
        dateFilterGroup.style.display = 'none';
        
        myBookingsBtn.onclick = () => {
            showNotification('Please login to view your bookings', 'error');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1500);
        };
    }
}

function showNotification(message, type = 'error') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 1000;
        color: #fff;
        background: ${type === 'error' ? '#d32f2f' : '#4caf50'};
        padding: 10px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 4000);
}

async function showMyBookings() {
    if (!currentUser) {
        showNotification('Please login to view bookings', 'error');
        return;
    }
    
    try {
        // Show loading notification
        showNotification('Loading your bookings...', 'info');
        
        // Fetch bookings from MongoDB API
        const response = await apiRequest('/user/bookings');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch bookings');
        }
        
        const userBookings = response.bookings || [];
        
        if (userBookings.length === 0) {
            showNotification('You have no bookings yet!', 'info');
            return;
        }
        
        // Create modal to show bookings
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 9999; padding: 20px; box-sizing: border-box;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white; border-radius: 16px; padding: 24px;
            max-width: 700px; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        `;
        
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="color: #7c3aed; margin: 0;">My Bookings</h2>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${userBookings.length} booking${userBookings.length !== 1 ? 's' : ''} found</p>
                </div>
                <button id="closeBookingsModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="bookingsList"></div>
        `;
        
        const bookingsList = content.querySelector('#bookingsList');
        
        userBookings.forEach(booking => {
            const event = booking.event;
            const bookingDate = new Date(booking.createdAt).toLocaleDateString();
            const standardTickets = booking.tickets?.standard?.quantity || 0;
            const vipTickets = booking.tickets?.vip?.quantity || 0;
            const totalTickets = standardTickets + vipTickets;
            
            const eventDiv = document.createElement('div');
            eventDiv.style.cssText = `
                border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                transition: transform 0.2s ease;
            `;
            
            eventDiv.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: start;">
                    <img src="${event.image || 'https://via.placeholder.com/80x60'}" 
                         alt="${event.title}" 
                         style="width: 80px; height: 60px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h3 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">${event.title}</h3>
                            <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; white-space: nowrap;">
                                ${booking.status || 'Confirmed'}
                            </span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 14px; color: #6b7280;">
                            <div><i class="fas fa-calendar"></i> ${event.date}</div>
                            <div><i class="fas fa-map-marker-alt"></i> ${event.location}</div>
                            <div><i class="fas fa-ticket-alt"></i> ${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}</div>
                            <div><i class="fas fa-dollar-sign"></i> $${booking.totalAmount}</div>
                        </div>
                        
                        ${standardTickets > 0 || vipTickets > 0 ? `
                            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                                ${standardTickets > 0 ? `<span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                                    ${standardTickets} Standard
                                </span>` : ''}
                                ${vipTickets > 0 ? `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                                    ${vipTickets} VIP
                                </span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: between; align-items: center; gap: 12px;">
                            <span style="color: #6b7280; font-size: 12px;">Booked on ${bookingDate}</span>
                            <div style="display: flex; gap: 8px; margin-left: auto;">
                                <button onclick="viewBookingDetails('${booking._id}')" 
                                        style="background: #7c3aed; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s;">
                                    <i class="fas fa-eye"></i> Details
                                </button>
                                ${booking.status !== 'cancelled' ? `
                                    <button onclick="cancelBooking('${booking._id}')" 
                                            style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s;">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add hover effect
            eventDiv.addEventListener('mouseenter', () => {
                eventDiv.style.transform = 'translateY(-2px)';
                eventDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });
            
            eventDiv.addEventListener('mouseleave', () => {
                eventDiv.style.transform = 'translateY(0)';
                eventDiv.style.boxShadow = 'none';
            });
            
            bookingsList.appendChild(eventDiv);
        });
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Close modal functionality
        content.querySelector('#closeBookingsModal').onclick = () => {
            document.body.removeChild(modal);
        };
        
        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
    } catch (error) {
        console.error('Error fetching bookings:', error);
        showNotification('Failed to load bookings. Please try again.', 'error');
    }
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        showNotification('Loading booking details...', 'info');
        
        // For now, we'll use the booking data from the bookings list
        // In a full implementation, you might want a separate API endpoint for detailed booking info
        showNotification('Booking details: Check your email for full details or contact support.', 'info');
        
    } catch (error) {
        console.error('Error fetching booking details:', error);
        showNotification('Failed to load booking details.', 'error');
    }
}

async function cancelBooking(bookingId) {
    if (!currentUser) {
        showNotification('Please login to cancel bookings', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return;
    }
    
    try {
        showNotification('Cancelling booking...', 'info');
        
        // Call the cancel booking API
        const response = await apiRequest(`/bookings/${bookingId}/cancel`, 'PUT');
        
        if (response.success) {
            showNotification('Booking cancelled successfully!', 'success');
            
            // Refresh the bookings display
            setTimeout(() => {
                // Close current modal
                const modal = document.querySelector('[style*="z-index: 9999"]');
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                // Reopen with updated data
                showMyBookings();
            }, 1000);
        } else {
            throw new Error(response.message || 'Failed to cancel booking');
        }
        
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showNotification('Failed to cancel booking. Please try again.', 'error');
    }
}

// Make functions global for onclick handlers
window.cancelBooking = cancelBooking;
window.viewBookingDetails = viewBookingDetails;

// Initialize the application
async function init() {
    currentUser = getCurrentUser();
    console.log('🔍 Init - Current user loaded:', currentUser);
    
    // If user is logged in locally, verify server session
    if (currentUser) {
        try {
            const authStatus = await apiRequest('/auth/status');
            if (!authStatus.authenticated) {
                console.log('⚠️ Server session expired but keeping local data for better UX');
                // Don't clear localStorage immediately - let user continue browsing
                // Only clear when they try to perform authenticated actions
            } else {
                // Update current user with server data if needed
                console.log('✅ Server session valid, syncing user data');
                currentUser = authStatus.user;
                localStorage.setItem('eventhive_current_user', JSON.stringify(currentUser));
            }
        } catch (error) {
            console.error('Failed to verify authentication:', error);
            // Keep local user data if server is unreachable - don't disrupt user experience
            console.log('🌐 Server unreachable, continuing with local data');
        }
    }
    
    userPreferences = loadUserPreferences();
    
    // Load events from MongoDB API first
    try {
        await loadEventsFromAPI();
        console.log('Events loaded from MongoDB:', events.length);
    } catch (error) {
        console.error('Failed to load events from API:', error);
        // Continue with empty events array if API fails
    }
    
    // Apply recommendations if user has preferences
    if (userPreferences && events.length > 0) {
        const recommendedEvents = getRecommendedEvents(events, userPreferences);
        addRecommendationBadges(recommendedEvents);
        await renderEvents(recommendedEvents);
    } else {
        await renderEvents(events);
    }

    updateAuthUI();
    setupEventListeners();
    
    // Show preferences prompt for users who haven't set preferences
    if (currentUser && shouldShowPreferencesPrompt()) {
        setTimeout(() => {
            showPreferencesPrompt();
        }, 1000); // Show after 1 second for better UX
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.textContent.toLowerCase();
            handleNavigation(text);
        });
    });
    
    // Make logo clickable
    const logo = document.querySelector('.logo h1');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Filter change listeners
    categoryFilter.addEventListener('change', applyFilters);
    eventTypeFilter.addEventListener('change', applyFilters);
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Auth toggle button
    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', () => {
            if (!currentUser) {
                window.location.href = 'auth.html';
            }
        });
    }
    
    // Profile dropdown
    if (profileBtn) {
        profileBtn.addEventListener('click', toggleProfileMenu);
    }
    
    // Profile menu items
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    document.getElementById('viewProfileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Profile management coming soon!', 'success');
    });
    
    document.getElementById('settingsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Settings coming soon!', 'success');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (profileBtn && !profileBtn.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    });
}

// Handle navigation clicks
function handleNavigation(section) {
    switch(section) {
        case 'events':
            // Scroll to events section
            const eventsSection = document.querySelector('.events-section');
            if (eventsSection) {
                eventsSection.scrollIntoView({ behavior: 'smooth' });
            }
            break;
        case 'about':
            showAboutModal();
            break;
        case 'contact':
            showContactModal();
            break;
        default:
            showNotification('Navigation feature coming soon!', 'success');
    }
}

// Show About modal
function showAboutModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: #333;">About EventHive</h2>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="line-height: 1.6; color: #666;">
                <p><strong>EventHive</strong> is a modern event management platform that connects people with amazing experiences.</p>
                
                <h3 style="color: #333; margin-top: 1.5rem;">Features:</h3>
                <ul style="margin-left: 1rem;">
                    <li><strong>Advanced Authentication:</strong> Keystroke dynamics and email OTP verification</li>
                    <li><strong>Smart Filtering:</strong> Find events by category, type, and more</li>
                    <li><strong>Personal Recommendations:</strong> AI-powered event suggestions</li>
                    <li><strong>Secure Booking:</strong> Safe and reliable ticket booking system</li>
                    <li><strong>Admin Tools:</strong> Complete event management dashboard</li>
                </ul>
                
                <h3 style="color: #333; margin-top: 1.5rem;">Our Mission:</h3>
                <p>To make discovering and attending events effortless, secure, and personalized for everyone.</p>
                
                <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #999; font-size: 0.9rem;">© 2025 EventHive. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show Contact modal
function showContactModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 500px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: #333;">Contact Us</h2>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="line-height: 1.8; color: #666;">
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <i class="fas fa-envelope" style="width: 20px; color: #667eea; margin-right: 1rem;"></i>
                    <span>support@eventhive.com</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <i class="fas fa-phone" style="width: 20px; color: #667eea; margin-right: 1rem;"></i>
                    <span>+1 (555) 123-4567</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <i class="fas fa-map-marker-alt" style="width: 20px; color: #667eea; margin-right: 1rem;"></i>
                    <span>123 Event Street, Tech City, TC 12345</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-clock" style="width: 20px; color: #667eea; margin-right: 1rem;"></i>
                    <span>Mon-Fri: 9:00 AM - 6:00 PM</span>
                </div>
                
                <div style="text-align: center; padding-top: 1rem; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-weight: 500; color: #333;">Follow us on social media</p>
                    <div style="margin-top: 1rem;">
                        <i class="fab fa-facebook" style="margin: 0 0.5rem; color: #667eea; font-size: 1.2rem; cursor: pointer;"></i>
                        <i class="fab fa-twitter" style="margin: 0 0.5rem; color: #667eea; font-size: 1.2rem; cursor: pointer;"></i>
                        <i class="fab fa-instagram" style="margin: 0 0.5rem; color: #667eea; font-size: 1.2rem; cursor: pointer;"></i>
                        <i class="fab fa-linkedin" style="margin: 0 0.5rem; color: #667eea; font-size: 1.2rem; cursor: pointer;"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Toggle profile dropdown menu
function toggleProfileMenu(e) {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
}

// Apply filters to events
function applyFilters() {
    const selectedCategory = categoryFilter.value;
    const selectedEventType = eventTypeFilter.value;
    
    console.log('Applying filters:', { category: selectedCategory, type: selectedEventType });
    
    // Show/hide clear filters button based on filter selection
    const clearFiltersGroup = document.getElementById('clearFiltersGroup');
    if (clearFiltersGroup) {
        if (selectedCategory !== 'all' || selectedEventType !== 'all') {
            clearFiltersGroup.style.display = 'block';
        } else {
            clearFiltersGroup.style.display = 'none';
        }
    }
    
    filteredEvents = events.filter(event => {
        const categoryMatch = selectedCategory === 'all' || event.category === selectedCategory;
        const typeMatch = selectedEventType === 'all' || event.type === selectedEventType;
        return categoryMatch && typeMatch;
    });
    
    console.log(`Filtered ${filteredEvents.length} events from ${events.length} total events`);
    
    // Show notification about filtering results
    if (selectedCategory !== 'all' || selectedEventType !== 'all') {
        const categoryText = selectedCategory === 'all' ? 'All Categories' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
        const typeText = selectedEventType === 'all' ? 'All Types' : selectedEventType.charAt(0).toUpperCase() + selectedEventType.slice(1);
        showNotification(`Found ${filteredEvents.length} events in ${categoryText} - ${typeText}`, 'success');
    }
    
    renderEvents(filteredEvents);
}

// Clear all filters
function clearFilters() {
    categoryFilter.value = 'all';
    eventTypeFilter.value = 'all';
    
    // Hide the clear filters button
    const clearFiltersGroup = document.getElementById('clearFiltersGroup');
    if (clearFiltersGroup) {
        clearFiltersGroup.style.display = 'none';
    }
    
    // Reset to show all events
    filteredEvents = [...events];
    renderEvents(filteredEvents);
    
    showNotification('Filters cleared - showing all events', 'success');
}

// Render events to the grid
async function renderEvents(eventsToRender) {
    // Update events count with personalized title
    let titleText = `Upcoming Events (${eventsToRender.length})`;
    if (userPreferences && eventsToRender.some(e => e.recommendationScore > 0)) {
        titleText = `✨ Personalized Events for You (${eventsToRender.length})`;
    }
    eventsTitle.textContent = titleText;
    
    // Clear existing events
    eventsGrid.innerHTML = '';
    
    if (eventsToRender.length === 0) {
        // Show no events message
        noEvents.style.display = 'block';
        eventsGrid.style.display = 'none';
    } else {
        // Hide no events message and show grid
        noEvents.style.display = 'none';
        eventsGrid.style.display = 'grid';
        
        // Render each event (now async)
        for (const event of eventsToRender) {
            const eventCard = await createEventCard(event);
            eventsGrid.appendChild(eventCard);
        }
    }
}

// Create event card element
async function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    // Get the correct event ID (MongoDB uses _id, fallback to id)
    const eventId = event._id || event.id;
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Properly handle async booking check
    let isBooked = false;
    if (currentUser) {
        try {
            const userBookings = await getUserBookings(currentUser.username);
            isBooked = userBookings.includes(eventId);
        } catch (error) {
            console.error('Error checking booking status:', error);
            isBooked = false;
        }
    }
    
    let actionsHTML;
    if (isAdmin) {
        // Admin view - show Edit Event button
        actionsHTML = `
            <div class="event-actions">
                <button class="event-button edit-event" onclick="editEvent('${eventId}')" style="background: #7c3aed; width: 100%;">
                    <i class="fas fa-edit"></i> Edit Event
                </button>
            </div>
        `;
    } else {
        // User view - show View Details and Book Event buttons
        const buttonText = isBooked ? 'Booked' : (currentUser ? 'Book Event' : 'Login to Book');
        const buttonClass = isBooked ? 'event-button booked' : 'event-button';
        const buttonDisabled = isBooked ? 'disabled' : '';
        
        actionsHTML = `
            <div class="event-actions">
                <button class="event-button view-details" onclick="viewEventDetails('${eventId}')">
                    View Details
                </button>
                <button class="${buttonClass}" onclick="bookEvent('${eventId}')" ${buttonDisabled}>
                    ${buttonText}
                </button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="event-image">
            <img src="${event.image}" alt="${event.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="image-placeholder" style="display: none;">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 48px; height: 48px; opacity: 0.5;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span style="margin-top: 8px; font-size: 14px;">Event Image</span>
            </div>
            ${getRecommendationBadgeHTML(event)}
        </div>
        <div class="event-content">
            <div class="event-header">
                <span class="event-type">${event.type}</span>
                <span class="event-price">From $${event.standardPrice}</span>
            </div>
            <h3 class="event-title">${event.title}</h3>
            <p class="event-description">${event.description}</p>
            <div class="event-details">
                <div class="event-detail">
                    <svg viewBox="0 0 24 24">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${event.date}</span>
                </div>
                <div class="event-detail">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>${event.location}</span>
                </div>
            </div>
            ${actionsHTML}
        </div>
    `;
    
    return card;
}

// Edit event function (admin only)
function editEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    showEditEventModal(event);
}

// Book event function
function bookEvent(eventId) {
    if (!currentUser) {
        showNotification('Please login to book events', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    // Redirect to ticket booking page
    window.location.href = `ticket-booking.html?id=${eventId}`;
}

// Make bookEvent global for onclick handlers
window.bookEvent = bookEvent;

// Edit event function (admin only)
function editEvent(eventId) {
    const event = events.find(e => String(e.id) === String(eventId) || String(e._id) === String(eventId));
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    showEditEventModal(event);
}

// Show edit event modal
function showEditEventModal(event) {
    // Get attendee count for this event
    const attendees = getEventAttendees(event.id);
    const attendeeCount = attendees.length;
    
    const modal = document.createElement('div');
    modal.id = 'editEventModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 700px; width: 95%; max-height: 95vh; overflow-y: auto;">
            <h2 style="margin-bottom: 1.5rem; color: #333; text-align: center;">Edit Event</h2>
            
            <!-- Attendee Count Section -->
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: #374151;">Event Attendees</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">Total registered attendees for this event</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: #7c3aed;">${attendeeCount}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">Attendees</div>
                    </div>
                    <button type="button" onclick="viewAttendees('${event._id || event.id}')" style="padding: 0.5rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-users"></i> View Attendees
                    </button>
                </div>
            </div>
            
            <form id="editEventForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Title</label>
                    <input type="text" id="editEventTitle" value="${event.title}" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
                    <textarea id="editEventDescription" required rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; resize: vertical;">${event.description}</textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Date</label>
                        <input type="date" id="editEventDate" value="${formatDateForInput(event.date)}" required min="${getTodayDate()}" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Time</label>
                        <input type="time" id="editEventTime" value="${extractTimeFromDate(event.date)}" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Location</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="editEventLocation" value="${event.location}" required readonly placeholder="Click 'Choose Location' to select from map" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                        <button type="button" onclick="openEditLocationPicker()" style="padding: 0.75rem 1rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-map-marker-alt"></i> Choose Location
                        </button>
                    </div>
                    <input type="hidden" id="editEventCoordinates" value="${event.coordinates || ''}">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Category</label>
                        <select id="editEventCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                            <option value="">Select Category</option>
                            <option value="music" ${event.category === 'music' ? 'selected' : ''}>Music</option>
                            <option value="technology" ${event.category === 'technology' ? 'selected' : ''}>Technology</option>
                            <option value="arts" ${event.category === 'arts' ? 'selected' : ''}>Arts & Culture</option>
                            <option value="sports" ${event.category === 'sports' ? 'selected' : ''}>Sports</option>
                            <option value="business" ${event.category === 'business' ? 'selected' : ''}>Business</option>
                            <option value="education" ${event.category === 'education' ? 'selected' : ''}>Education</option>
                            <option value="food" ${event.category === 'food' ? 'selected' : ''}>Food & Drink</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Type</label>
                        <select id="editEventType" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                            <option value="">Select Type</option>
                            <option value="festival" ${event.type === 'festival' ? 'selected' : ''}>Festival</option>
                            <option value="conference" ${event.type === 'conference' ? 'selected' : ''}>Conference</option>
                            <option value="workshop" ${event.type === 'workshop' ? 'selected' : ''}>Workshop</option>
                            <option value="exhibition" ${event.type === 'exhibition' ? 'selected' : ''}>Exhibition</option>
                            <option value="concert" ${event.type === 'concert' ? 'selected' : ''}>Concert</option>
                            <option value="seminar" ${event.type === 'seminar' ? 'selected' : ''}>Seminar</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Standard Price ($)</label>
                        <input type="number" id="editStandardPrice" value="${event.standardPrice}" required min="0" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">VIP Price ($)</label>
                        <input type="number" id="editVipPrice" value="${event.vipPrice}" required min="0" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Image</label>
                    <div style="border: 2px dashed #ddd; border-radius: 8px; padding: 1.5rem; text-align: center; background: #f9f9f9;">
                        <input type="file" id="editEventImageFile" accept="image/*" style="display: none;" onchange="handleEditImageUpload(this)">
                        <div id="editImageUploadArea" onclick="document.getElementById('editEventImageFile').click()" style="cursor: pointer; ${event.image ? 'display: none;' : ''}">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #667eea; margin-bottom: 0.5rem;"></i>
                            <p style="margin: 0; color: #666;">Click to upload event image</p>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #999;">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <div id="editImagePreview" style="${event.image ? 'display: block;' : 'display: none;'} margin-top: 1rem;">
                            <img id="editPreviewImg" src="${event.image || ''}" style="max-width: 100%; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <p id="editFileName" style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">Current Event Image</p>
                            <button type="button" onclick="removeEditImage()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Remove</button>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="closeEditEventModal()" style="padding: 0.75rem 1.5rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: background-color 0.3s;">Cancel</button>
                    <button type="submit" style="padding: 0.75rem 2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-save"></i> Update Event
                    </button>
                </div>
            </form>
        </div>
        
        <!-- Location Picker Modal for Edit -->
        <div id="editLocationModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1001;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 15px; width: 90%; max-width: 800px; height: 80vh; overflow: hidden;">
                <div style="padding: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Choose Event Location</h3>
                    <button onclick="closeEditLocationPicker()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div style="padding: 1rem;">
                    <input type="text" id="editLocationSearch" placeholder="Search for a location..." style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
                </div>
                <div id="editMapContainer" style="height: calc(100% - 120px); background: #f0f0f0;"></div>
                <div style="padding: 1rem; border-top: 1px solid #eee; text-align: right;">
                    <button onclick="confirmEditLocation()" style="padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Confirm Location</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize edit drag and drop functionality
    setTimeout(() => {
        setupEditImageDragDrop();
    }, 100);
    
    // Handle form submission
    document.getElementById('editEventForm').onsubmit = function(e) {
        e.preventDefault();
        updateEvent(event._id || event.id);
    };
}

// Close edit event modal
function closeEditEventModal() {
    const modal = document.getElementById('editEventModal');
    if (modal) {
        modal.remove();
    }
}

// Update event function
function updateEvent(eventId) {
    const eventIndex = events.findIndex(e => String(e.id) === String(eventId) || String(e._id) === String(eventId));
    if (eventIndex === -1) {
        showNotification('Event not found', 'error');
        return;
    }
    
    // Validate required fields
    const title = document.getElementById('editEventTitle').value;
    const description = document.getElementById('editEventDescription').value;
    const location = document.getElementById('editEventLocation').value;
    const category = document.getElementById('editEventCategory').value;
    const type = document.getElementById('editEventType').value;
    const standardPrice = document.getElementById('editStandardPrice').value;
    const vipPrice = document.getElementById('editVipPrice').value;
    const eventDate = document.getElementById('editEventDate').value;
    const eventTime = document.getElementById('editEventTime').value;
    
    if (!title || !description || !location || !category || !type || !standardPrice || !vipPrice || !eventDate || !eventTime) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate that the selected date is not in the past
    const selectedDate = new Date(eventDate + 'T' + eventTime);
    const currentDate = new Date();
    
    if (selectedDate <= currentDate) {
        showNotification('Event date and time must be in the future. Please select a future date and time.', 'error');
        return;
    }
    
    // Get image (either uploaded file as base64 or keep existing)
    const previewImg = document.getElementById('editPreviewImg');
    const eventImage = previewImg && previewImg.src ? previewImg.src : 
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
    
    // Update the event
    events[eventIndex] = {
        ...events[eventIndex],
        title: title,
        description: description,
        date: formatEventDate(eventDate, eventTime),
        location: location,
        coordinates: document.getElementById('editEventCoordinates').value || '',
        category: category,
        type: type,
        standardPrice: parseInt(standardPrice),
        vipPrice: parseInt(vipPrice),
        price: `$${standardPrice}`,
        image: eventImage
    };
    
    // Save to localStorage
    saveEventsToStorage();
    
    // Update display
    filteredEvents = [...events];
    renderEvents(filteredEvents);
    
    // Close modal
    closeEditEventModal();
    
    // Show success message
    showNotification('Event updated successfully!', 'success');
}

// Edit image upload handling
function handleEditImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    processEditImageFile(file);
}

function processEditImageFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Image size must be less than 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUploadArea = document.getElementById('editImageUploadArea');
        const imagePreview = document.getElementById('editImagePreview');
        const previewImg = document.getElementById('editPreviewImg');
        const fileName = document.getElementById('editFileName');
        
        imageUploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        previewImg.src = e.target.result;
        fileName.textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function removeEditImage() {
    const imageUploadArea = document.getElementById('editImageUploadArea');
    const imagePreview = document.getElementById('editImagePreview');
    const eventImageFile = document.getElementById('editEventImageFile');
    
    imageUploadArea.style.display = 'block';
    imagePreview.style.display = 'none';
    eventImageFile.value = '';
}

// Edit drag and drop functionality
function setupEditImageDragDrop() {
    const uploadArea = document.getElementById('editImageUploadArea');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processEditImageFile(files[0]);
        }
    });
}

// Edit location picker functionality
let editSelectedLocation = null;
let editLocationMap = null;
let editLocationMarker = null;

function openEditLocationPicker() {
    const locationModal = document.getElementById('editLocationModal');
    locationModal.style.display = 'block';
    
    // Initialize map after modal is visible
    setTimeout(() => {
        initEditLocationMap();
    }, 100);
}

function closeEditLocationPicker() {
    const locationModal = document.getElementById('editLocationModal');
    locationModal.style.display = 'none';
    
    // Clean up map
    if (editLocationMap) {
        editLocationMap.remove();
        editLocationMap = null;
        editLocationMarker = null;
    }
}

function initEditLocationMap() {
    const mapContainer = document.getElementById('editMapContainer');
    
    // Clear any existing map
    mapContainer.innerHTML = '';
    
    // Create map
    editLocationMap = L.map(mapContainer).setView([40.7128, -74.0060], 10); // Default to New York
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(editLocationMap);
    
    // Add click handler
    editLocationMap.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Remove existing marker
        if (editLocationMarker) {
            editLocationMap.removeLayer(editLocationMarker);
        }
        
        // Add new marker
        editLocationMarker = L.marker([lat, lng]).addTo(editLocationMap);
        
        // Reverse geocoding to get address
        reverseEditGeocode(lat, lng);
        
        editSelectedLocation = {
            lat: lat,
            lng: lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` // Fallback
        };
    });
    
    // Search functionality
    const searchInput = document.getElementById('editLocationSearch');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchEditLocation(this.value);
        }
    });
}

function reverseEditGeocode(lat, lng) {
    // Using Nominatim for reverse geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                editSelectedLocation.address = data.display_name;
                if (editLocationMarker) {
                    editLocationMarker.bindPopup(data.display_name).openPopup();
                }
            }
        })
        .catch(error => {
            console.error('Reverse geocoding failed:', error);
        });
}

function searchEditLocation(query) {
    if (!query.trim()) return;
    
    // Using Nominatim for geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                // Center map on result
                editLocationMap.setView([lat, lng], 15);
                
                // Remove existing marker
                if (editLocationMarker) {
                    editLocationMap.removeLayer(editLocationMarker);
                }
                
                // Add marker
                editLocationMarker = L.marker([lat, lng]).addTo(editLocationMap);
                editLocationMarker.bindPopup(result.display_name).openPopup();
                
                editSelectedLocation = {
                    lat: lat,
                    lng: lng,
                    address: result.display_name
                };
            } else {
                showNotification('Location not found', 'error');
            }
        })
        .catch(error => {
            console.error('Geocoding failed:', error);
            showNotification('Search failed. Please try again.', 'error');
        });
}

function confirmEditLocation() {
    if (!editSelectedLocation) {
        showNotification('Please select a location on the map', 'error');
        return;
    }
    
    // Update location field
    document.getElementById('editEventLocation').value = editSelectedLocation.address;
    document.getElementById('editEventCoordinates').value = `${editSelectedLocation.lat},${editSelectedLocation.lng}`;
    
    // Close modal
    closeEditLocationPicker();
    
    showNotification('Location selected successfully', 'success');
}

// Helper functions for date/time formatting
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForInput(dateString) {
    // Convert "March 15, 2024, 7:00 PM" to "2024-03-15"
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function extractTimeFromDate(dateString) {
    // Convert "March 15, 2024, 7:00 PM" to "19:00"
    const date = new Date(dateString);
    return date.toTimeString().slice(0, 5);
}

// Get attendees for a specific event
function getEventAttendees(eventId) {
    const attendees = [];
    const bookings = JSON.parse(localStorage.getItem('eventBookings') || '{}');
    
    for (const username in bookings) {
        if (bookings[username].includes(String(eventId)) || bookings[username].includes(eventId)) {
            // Get user details from localStorage or create mock data
            const userKey = `user_${username}`;
            const userData = JSON.parse(localStorage.getItem(userKey) || '{}');
            
            attendees.push({
                eventId: String(eventId),
                username: username,
                name: userData.name || username,
                email: userData.email || `${username}@example.com`,
                phone: userData.phone || 'Not provided',
                gender: userData.gender || 'Not specified'
            });
        }
    }
    
    return attendees;
}

// View attendees function
function viewAttendees(eventId) {
    const event = events.find(e => String(e.id) === String(eventId) || String(e._id) === String(eventId));
    const attendees = getEventAttendees(eventId);
    
    showAttendeesModal(event, attendees);
}

// Show attendees modal
function showAttendeesModal(event, attendees) {
    const modal = document.createElement('div');
    modal.id = 'attendeesModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 900px; width: 95%; max-height: 95vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem;">
                <div>
                    <h2 style="margin: 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-users" style="color: #7c3aed;"></i>
                        Event Attendees
                    </h2>
                    <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem;">${event.title}</p>
                </div>
                <button onclick="closeAttendeesModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Search Bar -->
            <div style="margin-bottom: 1.5rem;">
                <div style="position: relative;">
                    <input type="text" id="attendeeSearch" placeholder="Search attendees by name, email, or phone..." 
                           style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem;"
                           oninput="filterAttendees()">
                    <i class="fas fa-search" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #666;"></i>
                </div>
            </div>
            
            <!-- Attendees Count -->
            <div style="margin-bottom: 1rem; color: #666; font-size: 0.875rem;">
                <span id="attendeeCount">${attendees.length}</span> attendee(s) found
            </div>
            
            <!-- Attendees List -->
            <div id="attendeesList" style="max-height: 400px; overflow-y: auto;">
                ${attendees.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-user-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <h3 style="margin: 0 0 0.5rem 0;">No Attendees Yet</h3>
                        <p style="margin: 0;">No one has registered for this event yet.</p>
                    </div>
                ` : attendees.map(attendee => `
                    <div class="attendee-card" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s;" 
                         onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                                    ${attendee.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 style="margin: 0; color: #374151; font-size: 1rem;">${attendee.name}</h4>
                                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${attendee.gender}</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 2rem; margin-left: 56px; font-size: 0.875rem; color: #6b7280;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-envelope"></i>
                                    <span>${attendee.email}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-phone"></i>
                                    <span>${attendee.phone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 1.5rem; text-align: right;">
                <button onclick="closeAttendeesModal()" style="padding: 0.75rem 1.5rem; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store original attendees for filtering
    window.originalAttendees = attendees;
}

// Close attendees modal
function closeAttendeesModal() {
    const modal = document.getElementById('attendeesModal');
    if (modal) {
        modal.remove();
    }
}

// Filter attendees function
function filterAttendees() {
    const searchTerm = document.getElementById('attendeeSearch').value.toLowerCase();
    const attendeesList = document.getElementById('attendeesList');
    const attendeeCount = document.getElementById('attendeeCount');
    
    const filteredAttendees = window.originalAttendees.filter(attendee => 
        attendee.name.toLowerCase().includes(searchTerm) ||
        attendee.email.toLowerCase().includes(searchTerm) ||
        attendee.phone.toLowerCase().includes(searchTerm)
    );
    
    attendeeCount.textContent = filteredAttendees.length;
    
    if (filteredAttendees.length === 0) {
        attendeesList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3 style="margin: 0 0 0.5rem 0;">No Results Found</h3>
                <p style="margin: 0;">No attendees match your search criteria.</p>
            </div>
        `;
    } else {
        attendeesList.innerHTML = filteredAttendees.map(attendee => `
            <div class="attendee-card" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s;" 
                 onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                            ${attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="margin: 0; color: #374151; font-size: 1rem;">${attendee.name}</h4>
                            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${attendee.gender}</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 2rem; margin-left: 56px; font-size: 0.875rem; color: #6b7280;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-envelope"></i>
                            <span>${attendee.email}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-phone"></i>
                            <span>${attendee.phone}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// View event details function
function viewEventDetails(eventId) {
    window.location.href = `event-details.html?id=${eventId}`;
}

// Admin Functions
function showAddEventModal() {
    // Create modal for adding new event
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 700px; width: 95%; max-height: 95vh; overflow-y: auto;">
            <h2 style="margin-bottom: 1.5rem; color: #333; text-align: center;">Create New Event</h2>
            <form id="addEventForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Title</label>
                    <input type="text" id="eventTitle" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
                    <textarea id="eventDescription" required rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Date</label>
                        <input type="date" id="eventDate" required min="${getTodayDate()}" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Time</label>
                        <input type="time" id="eventTime" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Location</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="eventLocation" required readonly placeholder="Click 'Choose Location' to select from map" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                        <button type="button" onclick="openLocationPicker()" style="padding: 0.75rem 1rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap;">
                            <i class="fas fa-map-marker-alt"></i> Choose Location
                        </button>
                    </div>
                    <input type="hidden" id="eventCoordinates" value="">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Category</label>
                        <select id="eventCategory" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                            <option value="">Select Category</option>
                            <option value="music">Music</option>
                            <option value="technology">Technology</option>
                            <option value="arts">Arts & Culture</option>
                            <option value="sports">Sports</option>
                            <option value="business">Business</option>
                            <option value="education">Education</option>
                            <option value="food">Food & Drink</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Type</label>
                        <select id="eventType" required style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                            <option value="">Select Type</option>
                            <option value="festival">Festival</option>
                            <option value="conference">Conference</option>
                            <option value="workshop">Workshop</option>
                            <option value="exhibition">Exhibition</option>
                            <option value="concert">Concert</option>
                            <option value="seminar">Seminar</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Standard Price ($)</label>
                        <input type="number" id="standardPrice" required min="0" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">VIP Price ($)</label>
                        <input type="number" id="vipPrice" required min="0" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Event Image</label>
                    <div style="border: 2px dashed #ddd; border-radius: 8px; padding: 1.5rem; text-align: center; background: #f9f9f9;">
                        <input type="file" id="eventImageFile" accept="image/*" style="display: none;" onchange="handleImageUpload(this)">
                        <div id="imageUploadArea" style="cursor: pointer;">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #667eea; margin-bottom: 0.5rem;"></i>
                            <p style="margin: 0; color: #666;">Click to upload event image</p>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #999;">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <div id="imagePreview" style="display: none; margin-top: 1rem;">
                            <img id="previewImg" style="max-width: 100%; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <p id="fileName" style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;"></p>
                            <button type="button" onclick="removeImage()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Remove</button>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="closeAddEventModal()" style="padding: 0.75rem 1.5rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: background-color 0.3s;">Cancel</button>
                    <button type="submit" style="padding: 0.75rem 2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-plus-circle"></i> Create Event
                    </button>
                </div>
            </form>
        </div>
        
        <!-- Location Picker Modal -->
        <div id="locationModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1001;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 15px; width: 90%; max-width: 800px; height: 80vh; display: flex; flex-direction: column;">
                <div style="padding: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <h3 style="margin: 0;">Choose Event Location</h3>
                    <button onclick="closeLocationPicker()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div style="padding: 1rem; flex-shrink: 0;">
                    <input type="text" id="locationSearch" placeholder="Search for a location..." style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
                </div>
                <div id="mapContainer" style="flex: 1; background: #f0f0f0; min-height: 300px;"></div>
                <div style="padding: 1rem; border-top: 1px solid #eee; text-align: right; flex-shrink: 0; background: white;">
                    <button onclick="confirmLocation()" style="padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-check"></i> Confirm Location
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize drag and drop functionality
    setTimeout(() => {
        setupImageDragDrop();
    }, 100);
    
    // Handle form submission
    document.getElementById('addEventForm').onsubmit = function(e) {
        console.log('🚀 Form submitted - event creation started'); // Debug log
        e.preventDefault();
        
        try {
            addNewEvent();
        } catch (error) {
            console.error('❌ Error in addNewEvent:', error);
            showNotification('Error creating event: ' + error.message, 'error');
        }
    };
    
    // Also add click handler to submit button as backup
    const submitBtn = document.querySelector('#addEventForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.onclick = function(e) {
            console.log('🖱️ Submit button clicked directly');
            e.preventDefault();
            const form = document.getElementById('addEventForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        };
    }
}

function addNewEvent() {
    console.log('addNewEvent called'); // Debug log
    
    const form = document.getElementById('addEventForm');
    
    // Validate required fields
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const location = document.getElementById('eventLocation').value;
    const category = document.getElementById('eventCategory').value;
    const type = document.getElementById('eventType').value;
    const standardPrice = document.getElementById('standardPrice').value;
    const vipPrice = document.getElementById('vipPrice').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    
    console.log('Form values:', { title, description, location, category, type, standardPrice, vipPrice }); // Debug log
    
    if (!title || !description || !location || !category || !type || !standardPrice || !vipPrice || !eventDate || !eventTime) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate that the selected date is not in the past
    const selectedDate = new Date(eventDate + 'T' + eventTime);
    const currentDate = new Date();
    
    if (selectedDate <= currentDate) {
        showNotification('Event date and time must be in the future. Please select a future date and time.', 'error');
        return;
    }
    
    // Get image (either uploaded file as base64 or default)
    const previewImg = document.getElementById('previewImg');
    const eventImage = previewImg && previewImg.src ? previewImg.src : 
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
    
    const newEventData = {
        title: title,
        description: description,
        date: formatEventDate(eventDate, eventTime),
        location: location,
        coordinates: document.getElementById('eventCoordinates').value || '',
        category: category,
        type: type,
        standardPrice: parseFloat(standardPrice),
        vipPrice: parseFloat(vipPrice),
        image: eventImage,
        maxAttendees: 1000, // Default value
        tags: [category, type] // Basic tags
    };
    
    console.log('Event data to send:', newEventData); // Debug log
    
    // Send to API
    createEventAPI(newEventData);
}

// Function to create event via API
async function createEventAPI(eventData) {
    try {
        console.log('Sending event to API:', eventData);
        console.log('📊 Event data size:', JSON.stringify(eventData).length, 'characters');
        
        // Check if user is admin
        const userRole = localStorage.getItem('eventhive_user_role');
        if (userRole !== 'admin') {
            showNotification('Only administrators can create events', 'error');
            return;
        }
        
        // Validate image size if present
        if (eventData.image && eventData.image.length > 2 * 1024 * 1024) { // 2MB limit for base64
            console.warn('⚠️ Large image detected, this might cause issues');
            showNotification('Image is quite large, please wait...', 'info');
        }
        
        const response = await apiRequest('/events', 'POST', eventData);
        
        if (response.success) {
            console.log('✅ Event created successfully via API:', response.event);
            
            // Reload events from API to get the latest data
            await loadEventsFromAPI();
            
            // Update display
            filteredEvents = [...events];
            await renderEvents(filteredEvents);
            
            // Close modal
            closeAddEventModal();
            
            // Show success message
            showNotification('Event created successfully and saved to database!', 'success');
            
            // Update admin statistics
            if (typeof updateAdminStatistics === 'function') {
                updateAdminStatistics();
            }
        } else {
            console.error('❌ API returned error:', response.message);
            showNotification(response.message || 'Failed to create event', 'error');
        }
        
    } catch (error) {
        console.error('🚨 Error creating event:', error);
        
        // Provide more specific error messages
        if (error.message.includes('request entity too large') || error.message.includes('413')) {
            showNotification('Image file is too large. Please choose a smaller image or compress it.', 'error');
        } else if (error.message.includes('401')) {
            showNotification('Authentication required. Please login as admin.', 'error');
        } else if (error.message.includes('400')) {
            showNotification('Invalid event data. Please check all required fields.', 'error');
        } else if (error.message.includes('500')) {
            showNotification('Server error. Please try again or contact support.', 'error');
        } else {
            showNotification('Network error: Failed to create event. Please try again.', 'error');
        }
    }
}

// Image upload handling
function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    processImageFile(file);
}

function processImageFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Image size must be less than 10MB', 'error');
        return;
    }
    
    // Compress and process the image
    compressImage(file, (compressedImageUrl) => {
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const fileName = document.getElementById('fileName');
        
        imageUploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        previewImg.src = compressedImageUrl;
        fileName.textContent = file.name;
    });
}

// Compress image to reduce payload size
function compressImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Set maximum dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed data URL (JPEG with 0.8 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log(`📸 Image compressed: ${file.size} bytes → ${compressedDataUrl.length} chars`);
        callback(compressedDataUrl);
    };
    
    img.src = URL.createObjectURL(file);
}

function removeImage() {
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const eventImageFile = document.getElementById('eventImageFile');
    
    imageUploadArea.style.display = 'block';
    imagePreview.style.display = 'none';
    eventImageFile.value = '';
}

// Drag and drop functionality
function setupImageDragDrop() {
    const uploadArea = document.getElementById('imageUploadArea');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processImageFile(files[0]);
        }
    });
    
    uploadArea.addEventListener('click', function() {
        document.getElementById('eventImageFile').click();
    });
}

// Location picker functionality
let selectedLocation = null;
let locationMap = null;
let locationMarker = null;

function openLocationPicker() {
    console.log('openLocationPicker called'); // Debug log
    
    // Reset selected location
    selectedLocation = null;
    
    const locationModal = document.getElementById('locationModal');
    locationModal.style.display = 'block';
    
    // Initialize map after modal is visible
    setTimeout(() => {
        initLocationMap();
    }, 100);
}

function closeLocationPicker() {
    const locationModal = document.getElementById('locationModal');
    locationModal.style.display = 'none';
    
    // Clean up map
    if (locationMap) {
        locationMap.remove();
        locationMap = null;
        locationMarker = null;
    }
}

function initLocationMap() {
    const mapContainer = document.getElementById('mapContainer');
    
    // Clear any existing map
    mapContainer.innerHTML = '';
    
    // Create map
    locationMap = L.map(mapContainer).setView([40.7128, -74.0060], 10); // Default to New York
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetMap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(locationMap);
    
    // Ensure map renders properly
    setTimeout(() => {
        locationMap.invalidateSize();
    }, 200);
    
    // Add click handler
    locationMap.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Remove existing marker
        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
        }
        
        // Add new marker
        locationMarker = L.marker([lat, lng]).addTo(locationMap);
        
        // Reverse geocoding to get address
        reverseGeocode(lat, lng);
        
        selectedLocation = {
            lat: lat,
            lng: lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` // Fallback
        };
        
        // Show notification that location is selected
        showNotification('Location selected! Click "Confirm Location" to proceed.', 'success');
    });
    
    // Search functionality
    const searchInput = document.getElementById('locationSearch');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation(this.value);
        }
    });
}

function reverseGeocode(lat, lng) {
    // Using Nominatim for reverse geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                selectedLocation.address = data.display_name;
                if (locationMarker) {
                    locationMarker.bindPopup(data.display_name).openPopup();
                }
            }
        })
        .catch(error => {
            console.error('Reverse geocoding failed:', error);
        });
}

function searchLocation(query) {
    if (!query.trim()) return;
    
    // Using Nominatim for geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                // Center map on result
                locationMap.setView([lat, lng], 15);
                
                // Remove existing marker
                if (locationMarker) {
                    locationMap.removeLayer(locationMarker);
                }
                
                // Add marker
                locationMarker = L.marker([lat, lng]).addTo(locationMap);
                locationMarker.bindPopup(result.display_name).openPopup();
                
                selectedLocation = {
                    lat: lat,
                    lng: lng,
                    address: result.display_name
                };
            } else {
                showNotification('Location not found', 'error');
            }
        })
        .catch(error => {
            console.error('Geocoding failed:', error);
            showNotification('Search failed. Please try again.', 'error');
        });
}

function confirmLocation() {
    console.log('confirmLocation called', selectedLocation); // Debug log
    
    if (!selectedLocation) {
        showNotification('Please select a location on the map', 'error');
        return;
    }
    
    // Update location field
    document.getElementById('eventLocation').value = selectedLocation.address;
    document.getElementById('eventCoordinates').value = `${selectedLocation.lat},${selectedLocation.lng}`;
    
    // Close modal
    closeLocationPicker();
    
    showNotification('Location selected successfully', 'success');
}

function formatEventDate(date, time) {
    const eventDate = new Date(date + 'T' + time);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return eventDate.toLocaleDateString('en-US', options);
}

function closeAddEventModal() {
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) {
        modal.remove();
    }
}

function filterEventsByDate() {
    const selectedDate = dateFilter.value;
    if (!selectedDate) {
        filteredEvents = [...events];
        renderEvents(filteredEvents);
        return;
    }
    
    const filterDate = new Date(selectedDate);
    filteredEvents = events.filter(event => {
        // Simple date matching - you can make this more sophisticated
        return event.date.includes(filterDate.getFullYear().toString());
    });
    
    renderEvents(filteredEvents);
}

// Make admin functions global
window.showAddEventModal = showAddEventModal;
window.closeAddEventModal = closeAddEventModal;
window.addNewEvent = addNewEvent;
window.openLocationPicker = openLocationPicker;
window.closeLocationPicker = closeLocationPicker;
window.confirmLocation = confirmLocation;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Admin Panel Functions
function initializeAdminPanel() {
    // Set admin name
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement && currentUser) {
        adminNameElement.textContent = `Welcome, ${currentUser.username}`;
    }
    
    // Update statistics
    updateAdminStatistics();
    
    // Load past and upcoming events
    loadPastEvents();
    loadUpcomingEvents();
}

function updateAdminStatistics() {
    const totalEvents = events.length;
    const currentDate = new Date();
    
    // Categorize events into past and upcoming
    let pastEventsCount = 0;
    let upcomingEventsCount = 0;
    
    events.forEach(event => {
        const eventDate = new Date(event.date);
        if (eventDate < currentDate) {
            pastEventsCount++;
        } else {
            upcomingEventsCount++;
        }
    });
    
    // Calculate total bookings
    const allBookings = JSON.parse(localStorage.getItem(USER_BOOKINGS_KEY) || '{}');
    let totalBookings = 0;
    Object.values(allBookings).forEach(userBookings => {
        totalBookings += userBookings.length;
    });
    
    // Update statistics display
    document.getElementById('totalEventsCount').textContent = totalEvents;
    document.getElementById('upcomingEventsCount').textContent = upcomingEventsCount;
    document.getElementById('pastEventsCount').textContent = pastEventsCount;
    document.getElementById('totalBookingsCount').textContent = totalBookings;
    
    // Update badges
    document.getElementById('pastEventsCountBadge').textContent = pastEventsCount;
    document.getElementById('upcomingEventsCountBadge').textContent = upcomingEventsCount;
}

function loadPastEvents() {
    const pastEventsList = document.getElementById('pastEventsList');
    const currentDate = new Date();
    
    const pastEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate < currentDate;
    });
    
    if (pastEvents.length === 0) {
        pastEventsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #9ca3af;">
                <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="margin: 0;">No past events found</p>
            </div>
        `;
    } else {
        pastEventsList.innerHTML = pastEvents.map(event => {
            const eventId = event._id || event.id;
            const attendees = getEventAttendees(eventId);
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; background: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: #374151; font-size: 1rem;">${event.title}</h4>
                        <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Past</span>
                    </div>
                    <p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.875rem; line-height: 1.4;">${event.description.substring(0, 80)}...</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #6b7280;">
                        <span><i class="fas fa-calendar"></i> ${event.date}</span>
                        <span><i class="fas fa-users"></i> ${attendees.length} attendees</span>
                    </div>
                    <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                        <button onclick="viewEventDetails('${eventId}')" style="padding: 0.25rem 0.75rem; background: #e5e7eb; color: #374151; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                            View Details
                        </button>
                        <button onclick="viewAttendees('${eventId}')" style="padding: 0.25rem 0.75rem; background: #dbeafe; color: #1e40af; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                            View Attendees
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function loadUpcomingEvents() {
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    const currentDate = new Date();
    
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= currentDate;
    });
    
    if (upcomingEvents.length === 0) {
        upcomingEventsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #9ca3af;">
                <i class="fas fa-calendar-plus" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="margin: 0;">No upcoming events found</p>
                <button onclick="showAddEventModal()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Create Your First Event
                </button>
            </div>
        `;
    } else {
        upcomingEventsList.innerHTML = upcomingEvents.map(event => {
            const attendees = getEventAttendees(event._id || event.id);
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; background: #f0fdf4;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: #374151; font-size: 1rem;">${event.title}</h4>
                        <span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Upcoming</span>
                    </div>
                    <p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.875rem; line-height: 1.4;">${event.description.substring(0, 80)}...</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #6b7280;">
                        <span><i class="fas fa-calendar"></i> ${event.date}</span>
                        <span><i class="fas fa-users"></i> ${attendees.length} attendees</span>
                    </div>
                    <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                        <button onclick="editEvent('${event._id || event.id}')" style="padding: 0.25rem 0.75rem; background: #dbeafe; color: #1e40af; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                            Edit Event
                        </button>
                        <button onclick="viewAttendees('${event._id || event.id}')" style="padding: 0.25rem 0.75rem; background: #f3e8ff; color: #7c3aed; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                            View Attendees
                        </button>
                        <button onclick="deleteEvent('${event._id || event.id}')" style="padding: 0.25rem 0.75rem; background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function showEventManagement() {
    showNotification('Event Management - Use the event cards below to manage individual events', 'success');
}

function showAnalytics() {
    const totalEvents = events.length;
    const allBookings = JSON.parse(localStorage.getItem(USER_BOOKINGS_KEY) || '{}');
    let totalBookings = 0;
    Object.values(allBookings).forEach(userBookings => {
        totalBookings += userBookings.length;
    });
    
    const avgBookingsPerEvent = totalEvents > 0 ? (totalBookings / totalEvents).toFixed(1) : 0;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 9999; padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 2rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0; color: #374151; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-chart-bar" style="color: #8b5cf6;"></i>
                    Analytics Dashboard
                </h2>
                <button onclick="closeAnalyticsModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: bold;">${totalEvents}</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;">Total Events</div>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: bold;">${totalBookings}</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;">Total Bookings</div>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: bold;">${avgBookingsPerEvent}</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;">Avg Bookings/Event</div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="closeAnalyticsModal()" style="padding: 0.75rem 2rem; background: #374151; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close Analytics
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentAnalyticsModal = modal;
}

function closeAnalyticsModal() {
    if (window.currentAnalyticsModal) {
        document.body.removeChild(window.currentAnalyticsModal);
        window.currentAnalyticsModal = null;
    }
}

function deleteEvent(eventId) {
    const event = events.find(e => String(e.id) === String(eventId) || String(e._id) === String(eventId));
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
        // Remove event from events array
        events = events.filter(e => String(e.id) !== String(eventId) && String(e._id) !== String(eventId));
        
        // Save updated events to localStorage
        saveEventsToStorage();
        
        // Remove bookings for this event
        const allBookings = JSON.parse(localStorage.getItem(USER_BOOKINGS_KEY) || '{}');
        Object.keys(allBookings).forEach(username => {
            allBookings[username] = allBookings[username].filter(id => String(id) !== String(eventId));
        });
        localStorage.setItem(USER_BOOKINGS_KEY, JSON.stringify(allBookings));
        
        // Refresh admin panel
        initializeAdminPanel();
        
        showNotification(`Event "${event.title}" deleted successfully`, 'success');
    }
}

// Make admin functions global
window.showEventManagement = showEventManagement;
window.showAnalytics = showAnalytics;
window.closeAnalyticsModal = closeAnalyticsModal;
window.deleteEvent = deleteEvent;
window.initializeAdminPanel = initializeAdminPanel;

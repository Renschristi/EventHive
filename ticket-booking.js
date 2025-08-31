// Ticket Booking JavaScript
let currentEvent = null;
let standardQuantity = 0;
let vipQuantity = 0;
let standardPrice = 0;
let vipPrice = 0;

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API request helper
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
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

// Load events from MongoDB API
let eventsData = [];

async function loadEventsFromAPI() {
    try {
        const response = await apiRequest('/events');
        eventsData = response.data || [];
        console.log('Events loaded from API for booking:', eventsData.length);
        return eventsData;
    } catch (error) {
        console.error('Failed to load events from API:', error);
        eventsData = [];
        return eventsData;
    }
}

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Load events from API first
    try {
        await loadEventsFromAPI();
    } catch (error) {
        console.error('Failed to load events:', error);
        // Redirect to main page if events can't be loaded
        window.location.href = 'index.html';
        return;
    }

    // Get event ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id'); // Keep as string for MongoDB _id compatibility
    
    console.log('=== Ticket Booking Page Debug ===');
    console.log('Event ID from URL:', eventId);
    console.log('Events loaded:', eventsData.length);
    
    if (eventId) {
        console.log('Looking for event with ID:', eventId);
        console.log('Available events:', eventsData.map(e => ({id: e.id, _id: e._id, title: e.title})));
        
        currentEvent = eventsData.find(event => String(event.id) === String(eventId) || String(event._id) === String(eventId));
        console.log('Found event:', currentEvent ? currentEvent.title : 'Not found');
        
        if (currentEvent) {
            console.log('Event found, populating info...');
            console.log('Event has image:', !!currentEvent.image);
            console.log('Full event object:', JSON.stringify(currentEvent, null, 2));
            standardPrice = currentEvent.standardPrice;
            vipPrice = currentEvent.vipPrice;
            populateEventInfo();
            setupEventListeners();
        } else {
            // Event not found, redirect to main page
            console.log('Event not found, redirecting...');
            window.location.href = 'index.html';
        }
    } else {
        // No event ID, redirect to main page
        window.location.href = 'index.html';
    }
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Check if user is logged in
    updateProfileDisplay();
});

// Populate event information
function populateEventInfo() {
    if (!currentEvent) return;
    
    console.log('=== populateEventInfo called ===');
    console.log('Current event:', currentEvent);
    console.log('Event image URL:', currentEvent.image);
    
    // Update page title
    document.title = `Book Tickets - ${currentEvent.title} - EventHive`;
    
    // Event details - with null checks
    const eventTitle = document.getElementById('eventTitle');
    const eventDate = document.getElementById('eventDate');
    const eventLocation = document.getElementById('eventLocation');
    const eventDescription = document.getElementById('eventDescription');
    const eventType = document.getElementById('eventType');
    
    if (eventTitle) eventTitle.textContent = currentEvent.title;
    if (eventDate) eventDate.textContent = currentEvent.date;
    if (eventLocation) eventLocation.textContent = currentEvent.location;
    if (eventDescription) eventDescription.textContent = currentEvent.description;
    if (eventType) eventType.textContent = currentEvent.type;
    
    // Set up image with error handling
    const imageElement = document.getElementById('eventImage');
    if (!imageElement) {
        console.error('Image element not found in DOM!');
        return;
    }
    
    console.log('Image element found, setting up handlers...');
    console.log('Setting image src to:', currentEvent.image);
    
    imageElement.onload = function() {
        console.log('✅ Image loaded successfully:', this.src);
    };
    imageElement.onerror = function() {
        console.error('❌ Failed to load image:', this.src);
        // Set a fallback placeholder image
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDQwSDExMi41VjUwSDEwN1Y2MEg5M1Y1MEg4Ny41VjQwWiIgZmlsbD0iIzlDQTNBRiIvPgo8dGV4dCB4PSIxMDAiIHk9IjgwIiBmaWxsPSIjNkI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiI+RXZlbnQgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        this.alt = 'Event Image Placeholder';
    };
    
    // Add a timeout to catch images that never trigger load/error events
    setTimeout(() => {
        if (!imageElement.complete && imageElement.src === currentEvent.image) {
            console.warn('⚠️ Image still loading after 5 seconds, may have network issues');
        }
    }, 5000);
    
    imageElement.src = currentEvent.image;
    imageElement.alt = currentEvent.title;
    
    // Immediate verification
    console.log('✅ Image src set. Current src:', imageElement.src);
    console.log('✅ Image alt set. Current alt:', imageElement.alt);
    
    // Check if image starts loading immediately
    setTimeout(() => {
        console.log('📊 Image loading status after 100ms:');
        console.log('  - Complete:', imageElement.complete);
        console.log('  - Natural width:', imageElement.naturalWidth);
        console.log('  - Current src:', imageElement.src);
    }, 100);
    
    console.log('Image element src set to:', document.getElementById('eventImage').src);
    
    // Ticket prices
    const standardPriceElement = document.getElementById('standardPrice');
    const vipPriceElement = document.getElementById('vipPrice');
    if (standardPriceElement) standardPriceElement.textContent = `$${standardPrice}`;
    if (vipPriceElement) vipPriceElement.textContent = `$${vipPrice}`;
    
    // Initial quantities
    const standardQuantityElement = document.getElementById('standardQuantity');
    const vipQuantityElement = document.getElementById('vipQuantity');
    if (standardQuantityElement) standardQuantityElement.value = standardQuantity;
    if (vipQuantityElement) vipQuantityElement.value = vipQuantity;
    
    // Update summary
    updateOrderSummary();
}

// Setup event listeners
function setupEventListeners() {
    // No additional event listeners needed since HTML uses onclick attributes
}

// Global functions for HTML onclick handlers
function increaseQuantity(ticketType) {
    if (ticketType === 'standard') {
        if (standardQuantity < 10) {
            standardQuantity++;
            updateQuantityDisplay();
        }
    } else if (ticketType === 'vip') {
        if (vipQuantity < 10) {
            vipQuantity++;
            updateQuantityDisplay();
        }
    }
}

function decreaseQuantity(ticketType) {
    if (ticketType === 'standard') {
        if (standardQuantity > 0) {
            standardQuantity--;
            updateQuantityDisplay();
        }
    } else if (ticketType === 'vip') {
        if (vipQuantity > 0) {
            vipQuantity--;
            updateQuantityDisplay();
        }
    }
}

// Update quantity display
function updateQuantityDisplay() {
    document.getElementById('standardQuantity').value = standardQuantity;
    document.getElementById('vipQuantity').value = vipQuantity;
    updateOrderSummary();
}

// Update order summary
function updateOrderSummary() {
    const standardTotal = standardQuantity * standardPrice;
    const vipTotal = vipQuantity * vipPrice;
    const total = standardTotal + vipTotal;
    
    // Update total price
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        totalPriceElement.textContent = `$${total}`;
    }
    
    // Update summary items
    const summaryItems = document.getElementById('summaryItems');
    const hasTickets = standardQuantity > 0 || vipQuantity > 0;
    
    if (hasTickets) {
        let summaryHTML = '';
        
        if (standardQuantity > 0) {
            summaryHTML += `
                <div class="summary-item">
                    <span>${standardQuantity} × Standard Tickets</span>
                    <span>$${standardTotal}</span>
                </div>
            `;
        }
        
        if (vipQuantity > 0) {
            summaryHTML += `
                <div class="summary-item">
                    <span>${vipQuantity} × VIP Tickets</span>
                    <span>$${vipTotal}</span>
                </div>
            `;
        }
        
        summaryItems.innerHTML = summaryHTML;
    } else {
        summaryItems.innerHTML = '<div class="summary-placeholder">Select tickets to see your order summary</div>';
    }
    
    // Enable/disable register button
    const registerBtn = document.getElementById('registerBtn');
    registerBtn.disabled = !hasTickets;
}

// Proceed to register
async function proceedToRegister() {
    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Please login to book events', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }

    // Check if any tickets are selected
    if (standardQuantity === 0 && vipQuantity === 0) {
        showNotification('Please select at least one ticket', 'error');
        return;
    }

    // Store ticket selections in localStorage (for registration process)
    const ticketSelections = {
        eventId: currentEvent._id || currentEvent.id,
        standard: standardQuantity,
        vip: vipQuantity,
        standardPrice: standardPrice,
        vipPrice: vipPrice,
        totalAmount: (standardQuantity * standardPrice) + (vipQuantity * vipPrice)
    };
    localStorage.setItem('eventhive_ticket_selections', JSON.stringify(ticketSelections));

    // Redirect to registration page
    window.location.href = `registration.html?id=${currentEvent._id || currentEvent.id}`;
}

// Close booking
function closeBooking() {
    window.history.back();
}

// Profile dropdown functionality
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (profileDropdown) {
            profileDropdown.classList.remove('show');
        }
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Update profile display
function updateProfileDisplay() {
    const currentUser = getCurrentUser();
    const profileName = document.getElementById('profileName');
    
    if (currentUser && profileName) {
        profileName.textContent = currentUser.username;
    }
}

// Helper functions
function getCurrentUser() {
    const user = localStorage.getItem('eventhive_current_user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('eventhive_current_user');
    localStorage.removeItem('eventhive_ticket_selections');
    window.location.href = 'index.html';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

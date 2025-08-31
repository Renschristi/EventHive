// Registration Page JavaScript
let currentEvent = null;
let ticketSelections = {
    standard: 0,
    vip: 0
};
let registrationData = [];

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
        console.log('Events loaded from API for registration:', eventsData.length);
        return eventsData;
    } catch (error) {
        console.error('Failed to load events from API:', error);
        eventsData = [];
        return eventsData;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Load events from API first
    try {
        await loadEventsFromAPI();
    } catch (error) {
        console.error('Failed to load events:', error);
    }
    
    initializePage();
    setupProfileDropdown();
});

// Initialize the registration page
function initializePage() {
    // Get event and ticket data from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id'); // Keep as string for MongoDB _id compatibility
    
    // Get ticket selections from localStorage (set by ticket booking page)
    const storedSelections = localStorage.getItem('eventhive_ticket_selections');
    if (!storedSelections) {
        // No ticket selections found, redirect back to ticket booking
        alert('No ticket selections found. Please select tickets first.');
        window.location.href = `ticket-booking.html?id=${eventId}`;
        return;
    }
    
    ticketSelections = JSON.parse(storedSelections);
    
    // Find the event
    currentEvent = eventsData.find(event => String(event.id) === String(eventId) || String(event._id) === String(eventId));
    if (!currentEvent) {
        alert('Event not found.');
        window.location.href = 'index.html';
        return;
    }
    
    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = 'login-portal.html';
        }, 1500);
        return;
    }
    
    // Update profile display
    updateProfileDisplay();
    
    // Populate event information
    populateEventInfo();
    
    // Generate registration forms
    generateRegistrationForms();
    
    // Update ticket summary
    updateTicketSummary();
}

// Populate event information
function populateEventInfo() {
    document.title = `Registration - ${currentEvent.title} - EventHive`;
    
    // Handle image with null check
    const eventImage = document.getElementById('eventImage');
    if (eventImage) {
        eventImage.src = currentEvent.image;
        eventImage.alt = currentEvent.title;
    }
    
    // Handle event details with null checks
    const eventTitle = document.getElementById('eventTitle');
    const eventDate = document.getElementById('eventDate');
    const eventLocation = document.getElementById('eventLocation');
    
    if (eventTitle) eventTitle.textContent = currentEvent.title;
    if (eventDate) eventDate.textContent = currentEvent.date;
    if (eventLocation) eventLocation.textContent = currentEvent.location;
}

// Update ticket summary
function updateTicketSummary() {
    const summaryContainer = document.getElementById('ticketSummary');
    let summaryHTML = '';
    let totalCost = 0;
    
    if (ticketSelections.standard > 0) {
        const standardTotal = ticketSelections.standard * currentEvent.standardPrice;
        totalCost += standardTotal;
        summaryHTML += `
            <div class="summary-item">
                <span>Standard Tickets (${ticketSelections.standard})</span>
                <span>$${standardTotal}</span>
            </div>
        `;
    }
    
    if (ticketSelections.vip > 0) {
        const vipTotal = ticketSelections.vip * currentEvent.vipPrice;
        totalCost += vipTotal;
        summaryHTML += `
            <div class="summary-item">
                <span>VIP Tickets (${ticketSelections.vip})</span>
                <span>$${vipTotal}</span>
            </div>
        `;
    }
    
    summaryHTML += `
        <div class="summary-item">
            <span>Total Amount</span>
            <span>$${totalCost}</span>
        </div>
    `;
    
    summaryContainer.innerHTML = summaryHTML;
}

// Generate registration forms for each ticket
function generateRegistrationForms() {
    const formsContainer = document.getElementById('registrationForms');
    let formsHTML = '';
    let attendeeIndex = 1;
    
    // Generate forms for standard tickets
    for (let i = 0; i < ticketSelections.standard; i++) {
        formsHTML += generateAttendeeForm(attendeeIndex, 'standard');
        attendeeIndex++;
    }
    
    // Generate forms for VIP tickets
    for (let i = 0; i < ticketSelections.vip; i++) {
        formsHTML += generateAttendeeForm(attendeeIndex, 'vip');
        attendeeIndex++;
    }
    
    formsContainer.innerHTML = formsHTML;
    
    // Add event listeners for form validation
    addFormEventListeners();
}

// Generate individual attendee form
function generateAttendeeForm(attendeeNumber, ticketType) {
    return `
        <div class="attendee-form" data-attendee="${attendeeNumber}" data-ticket-type="${ticketType}">
            <div class="attendee-header">
                <div class="attendee-title">
                    <div class="attendee-number">${attendeeNumber}</div>
                    <h3>Attendee ${attendeeNumber}</h3>
                </div>
                <div class="ticket-type-badge ${ticketType}">
                    ${ticketType.toUpperCase()} TICKET
                </div>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="firstName_${attendeeNumber}">First Name <span class="required">*</span></label>
                    <input type="text" id="firstName_${attendeeNumber}" name="firstName" required>
                </div>
                
                <div class="form-group">
                    <label for="lastName_${attendeeNumber}">Last Name <span class="required">*</span></label>
                    <input type="text" id="lastName_${attendeeNumber}" name="lastName" required>
                </div>
                
                <div class="form-group full-width">
                    <label for="email_${attendeeNumber}">Email Address <span class="required">*</span></label>
                    <input type="email" id="email_${attendeeNumber}" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="phone_${attendeeNumber}">Phone Number <span class="required">*</span></label>
                    <input type="tel" id="phone_${attendeeNumber}" name="phone" required>
                </div>
                
                <div class="form-group">
                    <label for="age_${attendeeNumber}">Age</label>
                    <input type="number" id="age_${attendeeNumber}" name="age" min="1" max="120">
                </div>
                
                <div class="form-group full-width">
                    <label for="address_${attendeeNumber}">Address <span class="required">*</span></label>
                    <input type="text" id="address_${attendeeNumber}" name="address" placeholder="Street Address" required>
                </div>
                
                <div class="form-group">
                    <label for="city_${attendeeNumber}">City <span class="required">*</span></label>
                    <input type="text" id="city_${attendeeNumber}" name="city" required>
                </div>
                
                <div class="form-group">
                    <label for="zipCode_${attendeeNumber}">ZIP Code <span class="required">*</span></label>
                    <input type="text" id="zipCode_${attendeeNumber}" name="zipCode" required>
                </div>
            </div>
        </div>
    `;
}

// Add event listeners for form validation
function addFormEventListeners() {
    const forms = document.querySelectorAll('.attendee-form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('blur', validateForm);
        });
    });
}

// Validate all forms
function validateForm() {
    const allForms = document.querySelectorAll('.attendee-form');
    let allValid = true;
    
    allForms.forEach(form => {
        const requiredInputs = form.querySelectorAll('input[required]');
        let formValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                formValid = false;
                allValid = false;
            }
        });
        
        // Update form appearance based on validation
        if (formValid) {
            form.style.borderColor = '#10b981';
        } else {
            form.style.borderColor = '#f3f4f6';
        }
    });
    
    // Enable/disable proceed button
    const proceedBtn = document.getElementById('proceedToPayment');
    proceedBtn.disabled = !allValid;
    
    return allValid;
}

// Collect all registration data
function collectRegistrationData() {
    const forms = document.querySelectorAll('.attendee-form');
    const data = [];
    
    forms.forEach(form => {
        const attendeeNumber = form.dataset.attendee;
        const ticketType = form.dataset.ticketType;
        
        const attendeeData = {
            attendeeNumber: parseInt(attendeeNumber),
            ticketType: ticketType,
            firstName: form.querySelector(`input[name="firstName"]`).value,
            lastName: form.querySelector(`input[name="lastName"]`).value,
            email: form.querySelector(`input[name="email"]`).value,
            phone: form.querySelector(`input[name="phone"]`).value,
            age: form.querySelector(`input[name="age"]`).value || null,
            address: form.querySelector(`input[name="address"]`).value,
            city: form.querySelector(`input[name="city"]`).value,
            zipCode: form.querySelector(`input[name="zipCode"]`).value
        };
        
        data.push(attendeeData);
    });
    
    return data;
}

// Proceed to payment
function proceedToPayment() {
    if (!validateForm()) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Collect registration data
    registrationData = collectRegistrationData();
    
    // Store registration data in localStorage
    localStorage.setItem('eventhive_registration_data', JSON.stringify(registrationData));
    
    // Store complete booking data
    const bookingData = {
        eventId: currentEvent._id || currentEvent.id,
        eventTitle: currentEvent.title,
        eventDate: currentEvent.date,
        eventLocation: currentEvent.location,
        ticketSelections: ticketSelections,
        registrationData: registrationData,
        totalAmount: calculateTotalAmount(),
        bookingDate: new Date().toISOString()
    };
    
    localStorage.setItem('eventhive_pending_booking', JSON.stringify(bookingData));
    
    // Redirect to payment page
    window.location.href = `payment.html?id=${currentEvent._id || currentEvent.id}`;
}

// Calculate total amount
function calculateTotalAmount() {
    let total = 0;
    total += ticketSelections.standard * currentEvent.standardPrice;
    total += ticketSelections.vip * currentEvent.vipPrice;
    return total;
}

// Go back to ticket selection
function goBack() {
    // Clear stored selections if user wants to go back
    localStorage.removeItem('eventhive_ticket_selections');
    window.location.href = `ticket-booking.html?id=${currentEvent._id || currentEvent.id}`;
}

// Cancel booking
function cancelBooking() {
    if (confirm('Are you sure you want to cancel this booking? All entered information will be lost.')) {
        // Clear all stored data
        localStorage.removeItem('eventhive_ticket_selections');
        localStorage.removeItem('eventhive_registration_data');
        localStorage.removeItem('eventhive_pending_booking');
        
        // Go back to event details or main page
        window.location.href = `event-details.html?id=${currentEvent._id || currentEvent.id}`;
    }
}

// Profile dropdown functionality
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        profileDropdown.classList.remove('show');
    });

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
}

// Update profile display
function updateProfileDisplay() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.username;
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
    localStorage.removeItem('eventhive_registration_data');
    localStorage.removeItem('eventhive_pending_booking');
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

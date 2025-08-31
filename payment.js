// Payment Page JavaScript
let currentEvent = null;
let bookingData = null;
let registrationData = [];
let totalAmount = 0;

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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupProfileDropdown();
    setupPaymentForm();
});

// Initialize the payment page
async function initializePage() {
    // Get booking data from localStorage
    const storedBooking = localStorage.getItem('eventhive_pending_booking');
    if (!storedBooking) {
        alert('No booking data found. Please start the booking process again.');
        window.location.href = 'index.html';
        return;
    }
    
    bookingData = JSON.parse(storedBooking);
    registrationData = bookingData.registrationData;
    
    // Load event data from API
    currentEvent = await getEventById(bookingData.eventId);
    
    if (!currentEvent) {
        alert('Event not found.');
        window.location.href = 'index.html';
        return;
    }
    
    // Check if user is logged in locally and with server
    const currentUser = getCurrentUser();
    console.log('🔍 Payment Auth Check - LocalStorage user:', currentUser);
    
    if (!currentUser) {
        console.error('❌ No user in localStorage');
        showNotification('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    // Verify server-side authentication
    try {
        console.log('🔍 Checking server authentication status...');
        const authResponse = await apiRequest('/auth/status');
        console.log('🔍 Server auth response:', authResponse);
        
        if (!authResponse.authenticated) {
            console.error('❌ Server session not authenticated');
            showNotification('Session expired. Please login again.', 'error');
            localStorage.removeItem('eventhive_current_user');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1500);
            return;
        }
        
        console.log('✅ Authentication verified - proceeding with payment');
    } catch (error) {
        console.error('❌ Authentication verification failed:', error);
        showNotification('Please login to continue with payment', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    // Update profile display
    updateProfileDisplay();
    
    // Populate all sections
    populateEventInfo();
    populateTicketBreakdown();
    populateAttendeeList();
    calculateAndDisplayTotal();
    
    // Pre-fill billing address with first attendee's address
    prefillBillingAddress();
}

// Get event by ID from API
async function getEventById(eventId) {
    try {
        const response = await apiRequest(`/events/${eventId}`);
        return response.event; // Server returns event in 'event' field
    } catch (error) {
        console.error('Error fetching event:', error);
        return null;
    }
}

// Populate event information
function populateEventInfo() {
    document.title = `Payment - ${currentEvent.title} - EventHive`;
    
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

// Populate ticket breakdown
function populateTicketBreakdown() {
    const container = document.getElementById('ticketBreakdown');
    let breakdownHTML = '';
    
    if (bookingData.ticketSelections.standard > 0) {
        const standardTotal = bookingData.ticketSelections.standard * currentEvent.standardPrice;
        breakdownHTML += `
            <div class="ticket-item">
                <div class="ticket-info">
                    <span class="ticket-type-badge">STANDARD</span>
                    <span>${bookingData.ticketSelections.standard} × $${currentEvent.standardPrice}</span>
                </div>
                <span>$${standardTotal}</span>
            </div>
        `;
    }
    
    if (bookingData.ticketSelections.vip > 0) {
        const vipTotal = bookingData.ticketSelections.vip * currentEvent.vipPrice;
        breakdownHTML += `
            <div class="ticket-item">
                <div class="ticket-info">
                    <span class="ticket-type-badge vip">VIP</span>
                    <span>${bookingData.ticketSelections.vip} × $${currentEvent.vipPrice}</span>
                </div>
                <span>$${vipTotal}</span>
            </div>
        `;
    }
    
    container.innerHTML = breakdownHTML;
}

// Populate attendee list
function populateAttendeeList() {
    const container = document.getElementById('attendeeList');
    let listHTML = '<h4>Attendees</h4>';
    
    registrationData.forEach((attendee, index) => {
        listHTML += `
            <div class="attendee-item">
                <div>
                    <div class="attendee-name">${attendee.firstName} ${attendee.lastName}</div>
                    <div class="attendee-ticket">${attendee.ticketType.toUpperCase()} Ticket</div>
                </div>
                <div class="attendee-ticket">#${String(index + 1).padStart(3, '0')}</div>
            </div>
        `;
    });
    
    container.innerHTML = listHTML;
}

// Calculate and display total
function calculateAndDisplayTotal() {
    const subtotal = bookingData.totalAmount;
    const serviceFee = 5.99;
    totalAmount = subtotal + serviceFee;
    
    // Handle payment elements with null checks
    const subtotalElement = document.getElementById('subtotal');
    const serviceFeeElement = document.getElementById('serviceFee');
    const finalTotalElement = document.getElementById('finalTotal');
    
    if (subtotalElement) subtotalElement.textContent = `$${subtotal}`;
    if (serviceFeeElement) serviceFeeElement.textContent = `$${serviceFee}`;
    if (finalTotalElement) finalTotalElement.textContent = `$${totalAmount.toFixed(2)}`;
}

// Setup payment form
function setupPaymentForm() {
    // Payment method selection
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const cardDetails = document.getElementById('cardDetails');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            if (this.value === 'card') {
                cardDetails.style.display = 'block';
            } else {
                cardDetails.style.display = 'none';
            }
        });
    });
    
    // Card number formatting
    const cardNumber = document.getElementById('cardNumber');
    cardNumber.addEventListener('input', function() {
        let value = this.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        if (formattedValue !== this.value) {
            this.value = formattedValue;
        }
    });
    
    // Expiry date formatting
    const expiryDate = document.getElementById('expiryDate');
    expiryDate.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        this.value = value;
    });
    
    // CVV formatting
    const cvv = document.getElementById('cvv');
    cvv.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });
    
    // Billing address toggle
    const sameAsRegistration = document.getElementById('sameAsRegistration');
    const billingFields = document.getElementById('billingAddressFields');
    
    sameAsRegistration.addEventListener('change', function() {
        if (this.checked) {
            billingFields.style.display = 'none';
            prefillBillingAddress();
        } else {
            billingFields.style.display = 'block';
            clearBillingAddress();
        }
    });
    
    // Form validation
    const form = document.getElementById('paymentForm');
    const inputs = form.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('input', validatePaymentForm);
        input.addEventListener('blur', validatePaymentForm);
    });
}

// Prefill billing address from first attendee
function prefillBillingAddress() {
    if (registrationData && registrationData.length > 0) {
        const firstAttendee = registrationData[0];
        document.getElementById('cardName').value = `${firstAttendee.firstName} ${firstAttendee.lastName}`;
        
        // If billing address fields are visible, fill them too
        const billingFields = document.getElementById('billingAddressFields');
        if (billingFields.style.display !== 'none') {
            document.getElementById('billingFirstName').value = firstAttendee.firstName;
            document.getElementById('billingLastName').value = firstAttendee.lastName;
            document.getElementById('billingAddress').value = firstAttendee.address;
            document.getElementById('billingCity').value = firstAttendee.city;
            document.getElementById('billingZip').value = firstAttendee.zipCode;
        }
    }
}

// Clear billing address
function clearBillingAddress() {
    document.getElementById('billingFirstName').value = '';
    document.getElementById('billingLastName').value = '';
    document.getElementById('billingAddress').value = '';
    document.getElementById('billingCity').value = '';
    document.getElementById('billingZip').value = '';
}

// Validate payment form
function validatePaymentForm() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const completePaymentBtn = document.getElementById('completePayment');
    
    let isValid = agreeTerms;
    
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        const cardName = document.getElementById('cardName').value;
        
        isValid = isValid && 
                  cardNumber.length >= 13 && 
                  expiryDate.length === 5 && 
                  cvv.length >= 3 && 
                  cardName.trim().length > 0;
        
        // Check billing address if not same as registration
        const sameAsRegistration = document.getElementById('sameAsRegistration').checked;
        if (!sameAsRegistration) {
            const billingFirstName = document.getElementById('billingFirstName').value;
            const billingLastName = document.getElementById('billingLastName').value;
            const billingAddress = document.getElementById('billingAddress').value;
            const billingCity = document.getElementById('billingCity').value;
            const billingZip = document.getElementById('billingZip').value;
            
            isValid = isValid && 
                      billingFirstName.trim().length > 0 && 
                      billingLastName.trim().length > 0 && 
                      billingAddress.trim().length > 0 && 
                      billingCity.trim().length > 0 && 
                      billingZip.trim().length > 0;
        }
    }
    
    completePaymentBtn.disabled = !isValid;
    return isValid;
}

// Process payment
function processPayment() {
    if (!validatePaymentForm()) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    console.log('🔄 Starting payment processing...');
    console.log('Payment method selected:', document.querySelector('input[name="paymentMethod"]:checked')?.value);
    console.log('Booking data:', bookingData);
    console.log('Total amount:', totalAmount);
    
    // Show loading state
    const btn = document.getElementById('completePayment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;
    
    // Complete the booking with MongoDB
    completeBooking()
        .then((result) => {
            console.log('✅ Payment processing successful:', result);
            // Show success modal
            showSuccessModal();
            
            // Reset button
            btn.innerHTML = originalText;
            btn.disabled = false;
        })
        .catch((error) => {
            console.error('❌ Payment processing failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                bookingData: bookingData,
                currentEvent: currentEvent
            });
            showNotification(`Payment processing failed: ${error.message}`, 'error');
            
            // Reset button
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

// Complete booking
async function completeBooking() {
    const currentUser = getCurrentUser();
    const bookingId = generateBookingId();
    
    // Create final booking record
    const finalBooking = {
        ...bookingData,
        bookingId: bookingId,
        userId: currentUser.username,
        paymentStatus: 'completed',
        paymentDate: new Date().toISOString(),
        totalAmountPaid: totalAmount
    };
    
    // Save to MongoDB via API
    await saveUserBooking(currentUser.username, finalBooking);
    
    // Clear temporary data
    localStorage.removeItem('eventhive_ticket_selections');
    localStorage.removeItem('eventhive_registration_data');
    localStorage.removeItem('eventhive_pending_booking');
    
    return finalBooking;
}

// Save user booking to MongoDB
async function saveUserBooking(username, booking) {
    try {
        // Ensure attendees have proper structure with required fields
        let attendeesData = [];
        if (booking.registrationData && booking.registrationData.length > 0) {
            attendeesData = booking.registrationData.map((attendee, index) => ({
                name: attendee.name || attendee.fullName || `Guest ${index + 1}`,
                email: attendee.email || `guest${index + 1}@eventhive.com`,
                phone: attendee.phone || '',
                ticketType: attendee.ticketType || 'standard'
            }));
        } else {
            // Generate default attendees if none provided
            const totalTickets = (booking.ticketSelections?.standard || 0) + (booking.ticketSelections?.vip || 0);
            for (let i = 0; i < totalTickets; i++) {
                attendeesData.push({
                    name: `Guest ${i + 1}`,
                    email: `guest${i + 1}@eventhive.com`,
                    phone: '',
                    ticketType: i < (booking.ticketSelections?.standard || 0) ? 'standard' : 'vip'
                });
            }
        }

        // Format data according to server expectations
        const bookingPayload = {
            eventId: booking.eventId,
            tickets: {
                standard: {
                    quantity: booking.ticketSelections?.standard || 0,
                    price: currentEvent.standardPrice || 0
                },
                vip: {
                    quantity: booking.ticketSelections?.vip || 0,
                    price: currentEvent.vipPrice || 0
                }
            },
            attendees: attendeesData,
            totalAmount: booking.totalAmountPaid || booking.totalAmount,
            paymentMethod: 'paypal',
            paymentStatus: 'completed'
        };
        
        console.log('🎫 Sending booking data to server:', bookingPayload);
        
        const response = await apiRequest('/bookings', 'POST', bookingPayload);
        
        if (response.success) {
            console.log('✅ Booking saved successfully to MongoDB:', response.booking);
            return response.booking;
        } else {
            throw new Error(response.message || 'Failed to save booking');
        }
    } catch (error) {
        console.error('❌ Failed to save booking to MongoDB:', error);
        throw error;
    }
}

// Get user bookings from MongoDB
async function getUserBookings(username) {
    try {
        const response = await apiRequest(`/user/bookings?username=${encodeURIComponent(username)}`);
        return response.data || [];
    } catch (error) {
        console.error('Failed to get user bookings:', error);
        return [];
    }
}

// Generate booking ID
function generateBookingId() {
    return 'EVT' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const bookingDetails = document.getElementById('bookingDetails');
    
    bookingDetails.innerHTML = `
        <h4>Booking Confirmation</h4>
        <p><strong>Event:</strong> ${currentEvent.title}</p>
        <p><strong>Date:</strong> ${currentEvent.date}</p>
        <p><strong>Tickets:</strong> ${bookingData.ticketSelections.standard + bookingData.ticketSelections.vip} tickets</p>
        <p><strong>Total Paid:</strong> $${totalAmount.toFixed(2)}</p>
        <p><strong>Confirmation:</strong> ${generateBookingId()}</p>
    `;
    
    modal.style.display = 'block';
}

// Navigation functions
function goBackToRegistration() {
    window.location.href = `registration.html?id=${currentEvent._id || currentEvent.id}`;
}

function cancelBooking() {
    if (confirm('Are you sure you want to cancel this booking? All information will be lost.')) {
        localStorage.removeItem('eventhive_ticket_selections');
        localStorage.removeItem('eventhive_registration_data');
        localStorage.removeItem('eventhive_pending_booking');
        window.location.href = `event-details.html?id=${currentEvent._id || currentEvent.id}`;
    }
}

function goToBookings() {
    window.location.href = 'my-bookings.html';
}

function goHome() {
    window.location.href = 'index.html';
}

// Profile dropdown functionality
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    document.addEventListener('click', function() {
        profileDropdown.classList.remove('show');
    });

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

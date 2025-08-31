// User Preferences System
const USER_PREFERENCES_KEY = 'eventhive_user_preferences';
const CURRENT_USER_KEY = 'eventhive_current_user';

let userPreferences = {
    categories: [],
    types: [],
    location: {
        city: '',
        maxDistance: 50
    },
    budget: '',
    timePreferences: [],
    notifications: {
        email: true,
        weeklyDigest: true,
        reminders: false
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html';
        return;
    }

    // Setup event listeners
    setupEventListeners();
    
    // Load existing preferences if any
    loadExistingPreferences();
});

// Setup all event listeners
function setupEventListeners() {
    // Category preferences
    const categoryItems = document.querySelectorAll('[data-category]');
    categoryItems.forEach(item => {
        item.addEventListener('click', () => toggleSelection(item, 'category'));
    });

    // Type preferences
    const typeItems = document.querySelectorAll('[data-type]');
    typeItems.forEach(item => {
        item.addEventListener('click', () => toggleSelection(item, 'type'));
    });

    // Budget preferences
    const budgetItems = document.querySelectorAll('[data-budget]');
    budgetItems.forEach(item => {
        item.addEventListener('click', () => toggleSingleSelection(item, budgetItems, 'budget'));
    });

    // Time preferences
    const timeItems = document.querySelectorAll('[data-time]');
    timeItems.forEach(item => {
        item.addEventListener('click', () => toggleSelection(item, 'time'));
    });

    // Location input
    const cityInput = document.getElementById('preferredCity');
    const distanceSelect = document.getElementById('maxDistance');
    
    cityInput.addEventListener('input', updateLocationPreferences);
    distanceSelect.addEventListener('change', updateLocationPreferences);

    // Notification checkboxes
    const notificationInputs = document.querySelectorAll('.notification-option input[type="checkbox"]');
    notificationInputs.forEach(input => {
        input.addEventListener('change', updateNotificationPreferences);
    });
}

// Toggle selection for multi-select items (categories, types, time)
function toggleSelection(item, type) {
    item.classList.toggle('selected');
    updatePreferences(type);
}

// Toggle selection for single-select items (budget)
function toggleSingleSelection(item, allItems, type) {
    // Remove selection from all items
    allItems.forEach(i => i.classList.remove('selected'));
    // Add selection to clicked item
    item.classList.add('selected');
    updatePreferences(type);
}

// Update preferences based on selections
function updatePreferences(type) {
    switch(type) {
        case 'category':
            userPreferences.categories = getSelectedValues('[data-category].selected', 'data-category');
            break;
        case 'type':
            userPreferences.types = getSelectedValues('[data-type].selected', 'data-type');
            break;
        case 'budget':
            const selectedBudget = document.querySelector('[data-budget].selected');
            userPreferences.budget = selectedBudget ? selectedBudget.getAttribute('data-budget') : '';
            break;
        case 'time':
            userPreferences.timePreferences = getSelectedValues('[data-time].selected', 'data-time');
            break;
    }
    
    console.log('Updated preferences:', userPreferences);
}

// Get selected values from elements
function getSelectedValues(selector, attribute) {
    const selectedElements = document.querySelectorAll(selector);
    return Array.from(selectedElements).map(el => el.getAttribute(attribute));
}

// Update location preferences
function updateLocationPreferences() {
    const cityInput = document.getElementById('preferredCity');
    const distanceSelect = document.getElementById('maxDistance');
    
    userPreferences.location = {
        city: cityInput.value.trim(),
        maxDistance: distanceSelect.value
    };
    
    console.log('Updated location preferences:', userPreferences.location);
}

// Update notification preferences
function updateNotificationPreferences() {
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const weeklyDigest = document.getElementById('weeklyDigest').checked;
    const upcomingReminders = document.getElementById('upcomingReminders').checked;
    
    userPreferences.notifications = {
        email: emailNotifications,
        weeklyDigest: weeklyDigest,
        reminders: upcomingReminders
    };
    
    console.log('Updated notification preferences:', userPreferences.notifications);
}

// Load existing preferences if user has them
function loadExistingPreferences() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const existingPrefs = localStorage.getItem(`${USER_PREFERENCES_KEY}_${currentUser.username}`);
    if (existingPrefs) {
        try {
            const savedPrefs = JSON.parse(existingPrefs);
            userPreferences = { ...userPreferences, ...savedPrefs };
            
            // Apply saved preferences to UI
            applySavedPreferencesToUI();
        } catch (error) {
            console.error('Error loading saved preferences:', error);
        }
    }
}

// Apply saved preferences to UI
function applySavedPreferencesToUI() {
    // Categories
    userPreferences.categories.forEach(category => {
        const element = document.querySelector(`[data-category="${category}"]`);
        if (element) element.classList.add('selected');
    });

    // Types
    userPreferences.types.forEach(type => {
        const element = document.querySelector(`[data-type="${type}"]`);
        if (element) element.classList.add('selected');
    });

    // Budget
    if (userPreferences.budget) {
        const element = document.querySelector(`[data-budget="${userPreferences.budget}"]`);
        if (element) element.classList.add('selected');
    }

    // Time preferences
    userPreferences.timePreferences.forEach(time => {
        const element = document.querySelector(`[data-time="${time}"]`);
        if (element) element.classList.add('selected');
    });

    // Location
    if (userPreferences.location) {
        const cityInput = document.getElementById('preferredCity');
        const distanceSelect = document.getElementById('maxDistance');
        
        if (cityInput) cityInput.value = userPreferences.location.city || '';
        if (distanceSelect) distanceSelect.value = userPreferences.location.maxDistance || '50';
    }

    // Notifications
    if (userPreferences.notifications) {
        const emailInput = document.getElementById('emailNotifications');
        const weeklyInput = document.getElementById('weeklyDigest');
        const remindersInput = document.getElementById('upcomingReminders');
        
        if (emailInput) emailInput.checked = userPreferences.notifications.email;
        if (weeklyInput) weeklyInput.checked = userPreferences.notifications.weeklyDigest;
        if (remindersInput) remindersInput.checked = userPreferences.notifications.reminders;
    }
}

// Save preferences and continue
function savePreferences() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('User not found. Please login again.', 'error');
        return;
    }

    // Update all preferences one more time
    updatePreferences('category');
    updatePreferences('type');
    updatePreferences('budget');
    updatePreferences('time');
    updateLocationPreferences();
    updateNotificationPreferences();

    // Validate that at least some preferences are selected
    if (userPreferences.categories.length === 0 && userPreferences.types.length === 0) {
        showNotification('Please select at least one category or event type to personalize your experience.', 'error');
        return;
    }

    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    // Save preferences with user association
    const preferencesWithMetadata = {
        ...userPreferences,
        userId: currentUser.username,
        savedAt: new Date().toISOString(),
        version: '1.0'
    };

    try {
        localStorage.setItem(`${USER_PREFERENCES_KEY}_${currentUser.username}`, JSON.stringify(preferencesWithMetadata));
        
        // Also save a flag indicating the user has completed preferences setup
        localStorage.setItem(`eventhive_preferences_completed_${currentUser.username}`, 'true');
        
        // Update user object to include preferences flag
        const updatedUser = {
            ...currentUser,
            hasPreferences: true,
            preferencesCompletedAt: new Date().toISOString()
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

        // Simulate loading time for better UX
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            showNotification('Preferences saved successfully! Redirecting to your personalized homepage...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }, 2000);

    } catch (error) {
        loadingOverlay.style.display = 'none';
        console.error('Error saving preferences:', error);
        showNotification('Error saving preferences. Please try again.', 'error');
    }
}

// Skip preferences setup
function skipPreferences() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    // Mark that user has been asked about preferences but chose to skip
    localStorage.setItem(`eventhive_preferences_skipped_${currentUser.username}`, 'true');
    
    showNotification('Preferences skipped. You can set them up later in your profile.', 'info');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Show notification
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

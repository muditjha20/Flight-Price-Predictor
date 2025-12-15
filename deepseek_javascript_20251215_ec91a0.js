// API Configuration
const API_BASE_URL = 'https://flight-price-api-wiu9.onrender.com';
const API_ENDPOINT = '/predict';

// DOM Elements
const predictionForm = document.getElementById('prediction-form');
const loadSampleBtn = document.getElementById('load-sample-btn');
const predictBtn = document.getElementById('predict-btn');
const resetBtn = document.getElementById('reset-btn');
const retryBtn = document.getElementById('retry-btn');
const resultCard = document.querySelector('.result-card');
const loadingSpinner = document.getElementById('loading-spinner');
const predictionResult = document.getElementById('prediction-result');
const errorMessage = document.getElementById('error-message');
const predictedPriceEl = document.getElementById('predicted-price');
const flightSummaryEl = document.getElementById('flight-summary');
const errorTextEl = document.getElementById('error-text');
const apiStatusEl = document.getElementById('api-status');

// Check API status on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('Date_of_Journey').value = formattedDate;
    
    // Set default times
    document.getElementById('Dep_Time').value = '10:00';
    document.getElementById('Arrival_Time').value = '12:30';
    
    // Auto-format route based on source and destination
    document.getElementById('Source').addEventListener('change', updateRoute);
    document.getElementById('Destination').addEventListener('change', updateRoute);
});

// Check if the API is accessible
async function checkAPIStatus() {
    try {
        const response = await fetch(API_BASE_URL);
        if (response.ok) {
            apiStatusEl.textContent = 'Connected';
            apiStatusEl.className = 'status-ok';
        } else {
            apiStatusEl.textContent = 'Unavailable';
            apiStatusEl.style.color = 'var(--error-color)';
        }
    } catch (error) {
        apiStatusEl.textContent = 'Unavailable';
        apiStatusEl.style.color = 'var(--error-color)';
        console.warn('API status check failed:', error);
    }
}

// Update route field based on source and destination
function updateRoute() {
    const source = document.getElementById('Source').value;
    const destination = document.getElementById('Destination').value;
    
    if (source && destination) {
        // Get airport codes (simplified mapping)
        const airportCodes = {
            'Banglore': 'BLR',
            'New Delhi': 'DEL',
            'Kolkata': 'CCU',
            'Delhi': 'DEL',
            'Chennai': 'MAA',
            'Mumbai': 'BOM',
            'Hyderabad': 'HYD',
            'Cochin': 'COK'
        };
        
        const sourceCode = airportCodes[source] || source.substring(0, 3).toUpperCase();
        const destCode = airportCodes[destination] || destination.substring(0, 3).toUpperCase();
        
        document.getElementById('Route').value = `${sourceCode} → ${destCode}`;
    }
}

// Load sample data into form
loadSampleBtn.addEventListener('click', () => {
    // Sample flight data
    const sampleData = {
        Airline: 'IndiGo',
        Source: 'Banglore',
        Destination: 'New Delhi',
        Route: 'BLR → DEL',
        Date_of_Journey: '2019-03-24', // Will be formatted to dd/mm/yyyy
        Dep_Time: '22:20',
        Arrival_Time: '01:10',
        Duration: '2h 50m',
        Total_Stops: 'non-stop',
        Additional_Info: 'No info'
    };
    
    // Populate form fields
    Object.keys(sampleData).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.value = sampleData[key];
        }
    });
    
    // Show success notification
    showNotification('Sample data loaded successfully!', 'success');
});

// Form submission handler
predictionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Prepare data for API
    const formData = getFormData();
    
    // Show loading state
    showLoadingState();
    
    try {
        // Make API request
        const predictedPrice = await fetchPrediction(formData);
        
        // Display result
        displayResult(predictedPrice, formData);
        
        // Show success notification
        showNotification('Price prediction completed!', 'success');
    } catch (error) {
        // Show error
        showErrorState(error.message);
        console.error('Prediction error:', error);
    }
});

// Validate form inputs
function validateForm() {
    const requiredFields = [
        'Airline', 'Source', 'Destination', 'Route', 
        'Date_of_Journey', 'Dep_Time', 'Arrival_Time', 
        'Duration', 'Total_Stops', 'Additional_Info'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            showNotification(`Please fill in the "${field.previousElementSibling.textContent}" field`, 'error');
            field.focus();
            field.style.borderColor = 'var(--error-color)';
            
            // Reset border color after 3 seconds
            setTimeout(() => {
                field.style.borderColor = '';
            }, 3000);
            
            return false;
        }
    }
    
    // Validate date is not in the past
    const journeyDate = new Date(document.getElementById('Date_of_Journey').value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (journeyDate < today) {
        showNotification('Date of journey cannot be in the past', 'error');
        document.getElementById('Date_of_Journey').style.borderColor = 'var(--error-color)';
        
        setTimeout(() => {
            document.getElementById('Date_of_Journey').style.borderColor = '';
        }, 3000);
        
        return false;
    }
    
    // Validate duration format
    const duration = document.getElementById('Duration').value;
    const durationRegex = /^\d+h\s\d+m$/;
    if (!durationRegex.test(duration)) {
        showNotification('Duration must be in format "Xh Ym" (e.g., "2h 50m")', 'error');
        document.getElementById('Duration').style.borderColor = 'var(--error-color)';
        
        setTimeout(() => {
            document.getElementById('Duration').style.borderColor = '';
        }, 3000);
        
        return false;
    }
    
    return true;
}

// Get form data in the format expected by API
function getFormData() {
    const formData = {};
    const formElements = predictionForm.elements;
    
    // Collect all form values
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.id && element.value) {
            formData[element.id] = element.value;
        }
    }
    
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    if (formData.Date_of_Journey) {
        const dateParts = formData.Date_of_Journey.split('-');
        formData.Date_of_Journey = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    }
    
    return formData;
}

// Show loading state
function showLoadingState() {
    // Disable predict button
    predictBtn.disabled = true;
    predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Show result card with loading spinner
    resultCard.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    predictionResult.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// Fetch prediction from API
async function fetchPrediction(formData) {
    const url = API_BASE_URL + API_ENDPOINT;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // If response is not JSON, use status text
            errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (data.predicted_price !== undefined) {
        return data.predicted_price;
    } else if (data.price !== undefined) {
        return data.price;
    } else {
        throw new Error('Invalid response format from API');
    }
}

// Display prediction result
function displayResult(price, formData) {
    // Reset button state
    predictBtn.disabled = false;
    predictBtn.innerHTML = '<i class="fas fa-rocket"></i> Predict Flight Price';
    
    // Hide loading, show result
    loadingSpinner.classList.add('hidden');
    predictionResult.classList.remove('hidden');
    
    // Format price with Indian Rupee symbol and commas
    const formattedPrice = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
    }).format(price);
    
    // Animate price display
    animatePriceChange(0, formattedPrice);
    
    // Populate flight summary
    populateFlightSummary(formData);
    
    // Scroll to result
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Animate price change
function animatePriceChange(start, end) {
    const duration = 1500; // Animation duration in ms
    const steps = 50;
    const stepDuration = duration / steps;
    const stepValue = (parseFloat(end.replace(/,/g, '')) - start) / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
        currentStep++;
        const currentValue = start + (stepValue * currentStep);
        
        // Format with commas
        const formattedValue = new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0
        }).format(Math.floor(currentValue));
        
        predictedPriceEl.textContent = formattedValue;
        
        if (currentStep >= steps) {
            clearInterval(timer);
            predictedPriceEl.textContent = end;
        }
    }, stepDuration);
}

// Populate flight summary details
function populateFlightSummary(formData) {
    // Format date for display
    const [day, month, year] = formData.Date_of_Journey.split('/');
    const displayDate = `${day}/${month}/${year}`;
    
    // Create summary items
    const summaryItems = [
        { label: 'Airline', value: formData.Airline },
        { label: 'Route', value: formData.Route },
        { label: 'Journey Date', value: displayDate },
        { label: 'Departure Time', value: formData.Dep_Time },
        { label: 'Arrival Time', value: formData.Arrival_Time },
        { label: 'Duration', value: formData.Duration },
        { label: 'Total Stops', value: formData.Total_Stops },
        { label: 'Additional Info', value: formData.Additional_Info }
    ];
    
    // Clear previous summary
    flightSummaryEl.innerHTML = '';
    
    // Add summary items to grid
    summaryItems.forEach(item => {
        const detailItem = document.createElement('div');
        detailItem.className = 'detail-item';
        
        detailItem.innerHTML = `
            <span class="detail-label">${item.label}</span>
            <span class="detail-value">${item.value}</span>
        `;
        
        flightSummaryEl.appendChild(detailItem);
    });
}

// Show error state
function showErrorState(errorMsg) {
    // Reset button state
    predictBtn.disabled = false;
    predictBtn.innerHTML = '<i class="fas fa-rocket"></i> Predict Flight Price';
    
    // Show error message
    loadingSpinner.classList.add('hidden');
    predictionResult.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    
    // Set error text
    errorTextEl.textContent = errorMsg || 'There was an error processing your request. Please try again.';
    
    // Scroll to error
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Reset form
resetBtn.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    predictionForm.reset();
    
    // Reset date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('Date_of_Journey').value = formattedDate;
    
    // Reset times
    document.getElementById('Dep_Time').value = '10:00';
    document.getElementById('Arrival_Time').value = '12:30';
    
    showNotification('Form reset successfully!', 'success');
});

// Retry prediction
retryBtn.addEventListener('click', () => {
    errorMessage.classList.add('hidden');
    predictionForm.dispatchEvent(new Event('submit'));
});

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        
        // Add slideOut animation
        const slideOutStyle = document.createElement('style');
        slideOutStyle.textContent = `
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(slideOutStyle);
        
        setTimeout(() => {
            notification.remove();
            document.head.removeChild(styleSheet);
            document.head.removeChild(slideOutStyle);
        }, 300);
    }, 4000);
}

// Handle CORS errors
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('CORS')) {
        console.error('CORS error detected. The API might not be properly configured for CORS.');
        showNotification('Cross-origin request blocked. Please check API CORS configuration.', 'error');
    }
});

// Add offline detection
window.addEventListener('offline', () => {
    showNotification('You are offline. Please check your internet connection.', 'error');
});

window.addEventListener('online', () => {
    showNotification('Your connection is restored.', 'success');
    checkAPIStatus();
});
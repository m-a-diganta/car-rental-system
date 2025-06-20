let allCars = [];
let filteredCars = [];
let selectedCar = null;

$(document).ready(function() {
    initializePage();
});

function initializePage() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('reservation.html')) {
        initializeReservationPage();
    } else {
        initializeHomepage();
    }
}

function initializeHomepage() {
    loadCars();
    setupSearchAndFilters();
}

function loadCars() {
    $('#loadingIndicator').show();
    
    $.ajax({
        url: 'php/get_cars.php',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            $('#loadingIndicator').hide();
            if (response.success) {
                allCars = response.cars;
                filteredCars = allCars;
                displayCars(filteredCars);
            } else {
                showNoResults();
            }
        },
        error: function() {
            $('#loadingIndicator').hide();
            showNoResults();
        }
    });
}

function displayCars(cars) {
    const carsGrid = $('#carsGrid');
    carsGrid.empty();
    
    if (cars.length === 0) {
        showNoResults();
        return;
    }
    
    $('#noResults').hide();
    
    cars.forEach(car => {
        const carCard = createCarCard(car);
        carsGrid.append(carCard);
    });
}

function createCarCard(car) {
    const isAvailable = car.available;
    const availabilityClass = isAvailable ? 'available' : 'unavailable';
    const availabilityText = isAvailable ? 'Available' : 'Not Available';
    const rentBtnClass = isAvailable ? 'available' : '';
    const rentBtnDisabled = isAvailable ? '' : 'disabled';
    
    return `
        <div class="car-card">
            <img src="${car.image}" alt="${car.brand} ${car.carModel}" class="car-image" 
                 onerror="this.src='https://via.placeholder.com/400x200?text=Car+Image'">
            <div class="car-info">
                <h3>${car.brand} ${car.carModel}</h3>
                <div class="car-details">
                    <div class="car-detail"><strong>Type:</strong> ${car.carType}</div>
                    <div class="car-detail"><strong>Year:</strong> ${car.yearOfManufacture}</div>
                    <div class="car-detail"><strong>Mileage:</strong> ${car.mileage}</div>
                    <div class="car-detail"><strong>Fuel:</strong> ${car.fuelType}</div>
                </div>
                <p class="description">${car.description}</p>
                <div class="price-availability">
                    <span class="price">$${car.pricePerDay}/day</span>
                    <span class="availability ${availabilityClass}">${availabilityText}</span>
                </div>
                <button class="rent-btn ${rentBtnClass}" ${rentBtnDisabled} 
                        onclick="selectCar('${car.vin}')">
                    ${isAvailable ? 'Rent This Car' : 'Unavailable'}
                </button>
            </div>
        </div>
    `;
}

function setupSearchAndFilters() {
    let searchTimeout;
    
    $('#searchBox').on('input', function() {
        clearTimeout(searchTimeout);
        const query = $(this).val().trim();
        
        if (query.length > 0) {
            searchTimeout = setTimeout(() => {
                showSearchSuggestions(query);
                performSearch(query);
            }, 300);
        } else {
            hideSearchSuggestions();
            applyFilters();
        }
    });
    
    $('#typeFilter, #brandFilter').on('change', function() {
        applyFilters();
    });
    
    $('#clearFilters').on('click', function() {
        $('#typeFilter').val('');
        $('#brandFilter').val('');
        $('#searchBox').val('');
        hideSearchSuggestions();
        filteredCars = allCars;
        displayCars(filteredCars);
    });
    
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-container').length) {
            hideSearchSuggestions();
        }
    });
}

function showSearchSuggestions(query) {
    const suggestions = getSearchSuggestions(query);
    const suggestionsContainer = $('#searchSuggestions');
    
    if (suggestions.length > 0) {
        suggestionsContainer.empty();
        suggestions.forEach(suggestion => {
            const suggestionItem = $(`<div class="suggestion-item">${suggestion}</div>`);
            suggestionItem.on('click', function() {
                $('#searchBox').val(suggestion);
                hideSearchSuggestions();
                performSearch(suggestion);
            });
            suggestionsContainer.append(suggestionItem);
        });
        suggestionsContainer.show();
    } else {
        hideSearchSuggestions();
    }
}

function getSearchSuggestions(query) {
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    allCars.forEach(car => {
        if (car.carType.toLowerCase().includes(queryLower)) {
            suggestions.add(car.carType);
        }
        if (car.brand.toLowerCase().includes(queryLower)) {
            suggestions.add(car.brand);
        }
        if (car.carModel.toLowerCase().includes(queryLower)) {
            suggestions.add(car.carModel);
        }
        car.description.toLowerCase().split(' ').forEach(word => {
            if (word.includes(queryLower) && word.length > 2) {
                suggestions.add(word);
            }
        });
    });
    
    return Array.from(suggestions).slice(0, 5);
}

function hideSearchSuggestions() {
    $('#searchSuggestions').hide();
}

// search 
function performSearch(query) {
    const queryLower = query.toLowerCase();
    
    const searchResults = allCars.filter(car => {
        return car.carType.toLowerCase().includes(queryLower) ||
               car.brand.toLowerCase().includes(queryLower) ||
               car.carModel.toLowerCase().includes(queryLower) ||
               car.description.toLowerCase().includes(queryLower);
    });
    
    filteredCars = searchResults;
    applyFilters();
}

function applyFilters() {
    const typeFilter = $('#typeFilter').val();
    const brandFilter = $('#brandFilter').val();
    
    let results = filteredCars;
    
    if (typeFilter) {
        results = results.filter(car => car.carType === typeFilter);
    }
    
    if (brandFilter) {
        results = results.filter(car => car.brand === brandFilter);
    }
    
    displayCars(results);
}

function showNoResults() {
    $('#carsGrid').empty();
    $('#noResults').show();
}


function selectCar(vin) {
    const car = allCars.find(c => c.vin === vin);
    if (car && car.available) {
        localStorage.setItem('selectedCar', JSON.stringify(car));
        window.location.href = 'reservation.html';
    }
}

// Navigation 
function goToHomepage() {
    window.location.href = 'index.html';
}

function goToReservation() {
    window.location.href = 'reservation.html';
}

// RESERVATION PAGE FUNCTIONALITY
function initializeReservationPage() {
    loadSelectedCar();
    setupFormValidation();
    setupFormSubmission();
}

function loadSelectedCar() {
    const selectedCarData = localStorage.getItem('selectedCar');
    
    if (!selectedCarData) {
        $('#noCarSelected').show();
        return;
    }
    
    selectedCar = JSON.parse(selectedCarData);
    $.ajax({
        url: 'php/get_cars.php',
        type: 'GET',
        data: { vin: selectedCar.vin },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.cars.length > 0) {
                const currentCar = response.cars[0];
                selectedCar = currentCar;
                
                displaySelectedCar(currentCar);
                
                if (currentCar.available) {
                    $('#reservationFormSection').show();
                    loadSavedFormData();
                } else {
                    $('#carUnavailable').show();
                }
            } else {
                $('#carUnavailable').show();
            }
        },
        error: function() {
            $('#carUnavailable').show();
        }
    });
}

function displaySelectedCar(car) {
    $('#carDetailsSection').show();
    
    const carDetailsHtml = `
        <div class="car-info">
            <img src="${car.image}" alt="${car.brand} ${car.carModel}" class="car-image" 
                 onerror="this.src='https://via.placeholder.com/400x200?text=Car+Image'" style="width: 100%; max-width: 300px; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 1rem;">
            <h4>${car.brand} ${car.carModel}</h4>
            <div class="car-details">
                <div class="car-detail"><strong>Type:</strong> ${car.carType}</div>
                <div class="car-detail"><strong>Year:</strong> ${car.yearOfManufacture}</div>
                <div class="car-detail"><strong>Mileage:</strong> ${car.mileage}</div>
                <div class="car-detail"><strong>Fuel Type:</strong> ${car.fuelType}</div>
                <div class="car-detail"><strong>Price per Day:</strong> ${car.pricePerDay}</div>
            </div>
            <p><strong>Description:</strong> ${car.description}</p>
        </div>
    `;
    
    $('#carDetails').html(carDetailsHtml);
}

function loadSavedFormData() {
    const savedData = localStorage.getItem('reservationFormData');
    if (savedData) {
        const formData = JSON.parse(savedData);
        
        $('#customerName').val(formData.customerName || '');
        $('#phoneNumber').val(formData.phoneNumber || '');
        $('#email').val(formData.email || '');
        $('#driverLicense').val(formData.driverLicense || '');
        $('#startDate').val(formData.startDate || '');
        $('#rentalPeriod').val(formData.rentalPeriod || '');
        
        setTimeout(() => {
            validateForm();
        }, 100);
    }
}

function saveFormData() {
    const formData = {
        customerName: $('#customerName').val(),
        phoneNumber: $('#phoneNumber').val(),
        email: $('#email').val(),
        driverLicense: $('#driverLicense').val(),
        startDate: $('#startDate').val(),
        rentalPeriod: $('#rentalPeriod').val()
    };
    
    localStorage.setItem('reservationFormData', JSON.stringify(formData));
}

function setupFormValidation() {
    $('#customerName').on('input blur', function() {
        validateName();
        saveFormData();
        validateForm(); // Check overall form validity
    });
    
    $('#phoneNumber').on('input blur', function() {
        validatePhone();
        saveFormData();
        validateForm();
    });
    
    $('#email').on('input blur', function() {
        validateEmail();
        saveFormData();
        validateForm();
    });
    
    $('#driverLicense').on('input blur', function() {
        validateDriverLicense();
        saveFormData();
        validateForm();
    });
    
    $('#startDate').on('change', function() {
        validateStartDate();
        calculateTotal();
        saveFormData();
        validateForm();
    });
    
    $('#rentalPeriod').on('input change', function() {
        validateRentalPeriod();
        calculateTotal();
        saveFormData();
        validateForm();
    });
    
    const today = new Date().toISOString().split('T')[0];
    $('#startDate').attr('min', today);
}

// Individual validation functions 
function validateName() {
    const name = $('#customerName').val().trim();
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    
    if (!name) {
        showValidationError('nameError', 'Name is required');
        return false;
    } else if (!nameRegex.test(name)) {
        showValidationError('nameError', 'Please enter a valid name (letters only, 2-50 characters)');
        return false;
    } else {
        showValidationSuccess('customerName', 'nameError');
        return true;
    }
}

function validatePhone() {
    const phone = $('#phoneNumber').val().trim();
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    
    if (!phone) {
        showValidationError('phoneError', 'Phone number is required');
        return false;
    } else if (!phoneRegex.test(phone)) {
        showValidationError('phoneError', 'Please enter a valid phone number');
        return false;
    } else {
        showValidationSuccess('phoneNumber', 'phoneError');
        return true;
    }
}

function validateEmail() {
    const email = $('#email').val().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        showValidationError('emailError', 'Email is required');
        return false;
    } else if (!emailRegex.test(email)) {
        showValidationError('emailError', 'Please enter a valid email address');
        return false;
    } else {
        showValidationSuccess('email', 'emailError');
        return true;
    }
}

function validateDriverLicense() {
    const license = $('#driverLicense').val().trim();
    
    if (!license) {
        showValidationError('licenseError', 'Driver\'s license number is required');
        return false;
    } else if (license.length < 5) {
        showValidationError('licenseError', 'Please enter a valid license number');
        return false;
    } else {
        showValidationSuccess('driverLicense', 'licenseError');
        return true;
    }
}

function validateStartDate() {
    const startDate = $('#startDate').val();
    const today = new Date().toISOString().split('T')[0];
    
    if (!startDate) {
        showValidationError('startDateError', 'Start date is required');
        return false;
    } else if (startDate < today) {
        showValidationError('startDateError', 'Start date cannot be in the past');
        return false;
    } else {
        showValidationSuccess('startDate', 'startDateError');
        return true;
    }
}

function validateRentalPeriod() {
    const period = parseInt($('#rentalPeriod').val());
    
    if (!period || period < 1) {
        showValidationError('periodError', 'Rental period must be at least 1 day');
        return false;
    } else if (period > 365) {
        showValidationError('periodError', 'Rental period cannot exceed 365 days');
        return false;
    } else {
        showValidationSuccess('rentalPeriod', 'periodError');
        return true;
    }
}

// validation error 
function showValidationError(errorId, message) {
    $('#' + errorId).text(message).show();
    const inputId = errorId.replace('Error', '');
    $('#' + inputId).removeClass('valid').addClass('error');
}

function showValidationSuccess(inputId, errorId) {
    $('#' + errorId).text('').hide();
    $('#' + inputId).removeClass('error').addClass('valid');
}

// Validate entire form 
function validateForm() {
    const nameValid = validateName();
    const phoneValid = validatePhone();
    const emailValid = validateEmail();
    const licenseValid = validateDriverLicense();
    const dateValid = validateStartDate();
    const periodValid = validateRentalPeriod();
    
    const isValid = nameValid && phoneValid && emailValid && 
                   licenseValid && dateValid && periodValid;
    
    $('#submitBtn').prop('disabled', !isValid);
    
    if (isValid) {
        calculateTotal();
    }
    
    return isValid;
}

// total price
function calculateTotal() {
    const period = parseInt($('#rentalPeriod').val());
    
    if (selectedCar && period > 0) {
        const pricePerDay = selectedCar.pricePerDay;
        const total = pricePerDay * period;
        
        $('#pricePerDay').text('$' + pricePerDay);
        $('#numberOfDays').text(period);
        $('#totalPrice').text('$' + total);
        $('#totalPriceSection').show();
    } else {
        $('#totalPriceSection').hide();
    }
}

function setupFormSubmission() {
    $('#reservationForm').on('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitOrder();
        }
    });
}

function submitOrder() {
    const formData = {
        customer: {
            name: $('#customerName').val().trim(),
            phoneNumber: $('#phoneNumber').val().trim(),
            email: $('#email').val().trim(),
            driversLicenseNumber: $('#driverLicense').val().trim()
        },
        car: {
            vin: selectedCar.vin
        },
        rental: {
            startDate: $('#startDate').val(),
            rentalPeriod: parseInt($('#rentalPeriod').val()),
            totalPrice: selectedCar.pricePerDay * parseInt($('#rentalPeriod').val()),
            orderDate: new Date().toISOString().split('T')[0]
        }
    };
    
    $('#submitBtn').prop('disabled', true).text('Submitting...');
    
    $.ajax({
        url: 'php/place_order.php',
        type: 'POST',
        data: JSON.stringify(formData),
        contentType: 'application/json',
        dataType: 'json',
        success: function(response) {
            $('#submitBtn').prop('disabled', false).text('Submit Order');
            
            if (response.success) {
                $('#reservationFormSection').hide();
                $('#orderConfirmation').show();
            
                localStorage.removeItem('reservationFormData');
                
                $('#confirmOrderBtn').on('click', function() {
                    confirmOrder(response.orderId);
                });
            } else {
                $('#orderErrorMessage').text(response.message || 'Failed to place order. Please try again.');
                $('#orderError').show();
            }
        },
        error: function() {
            $('#submitBtn').prop('disabled', false).text('Submit Order');
            $('#orderErrorMessage').text('Network error. Please check your connection and try again.');
            $('#orderError').show();
        }
    });
}

// Confirm rental order
function confirmOrder(orderId) {
    $('#confirmOrderBtn').prop('disabled', true).text('Confirming...');
    
    $.ajax({
        url: 'php/confirm_order.php',
        type: 'POST',
        data: JSON.stringify({ orderId: orderId }),
        contentType: 'application/json',
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                alert('Order confirmed successfully! The car has been reserved for you.');
                localStorage.removeItem('selectedCar');
                goToHomepage();
            } else {
                alert('Failed to confirm order: ' + (response.message || 'Please try again.'));
                $('#confirmOrderBtn').prop('disabled', false).text('Confirm Order');
            }
        },
        error: function() {
            alert('Network error during confirmation. Please try again.');
            $('#confirmOrderBtn').prop('disabled', false).text('Confirm Order');
        }
    });
}


function cancelReservation() {
    if (confirm('Are you sure you want to cancel this reservation? All entered data will be lost.')) {
        localStorage.removeItem('reservationFormData');
        localStorage.removeItem('selectedCar');
        goToHomepage();
    }
}
$(window).on('beforeunload', function() {
    if (window.location.pathname.includes('reservation.html')) {
        saveFormData();
    }
});
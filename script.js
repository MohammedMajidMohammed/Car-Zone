/* 
   CarZone - Premium Full-Stack Logic
   Student Project: Car Showroom CRUD with Enhanced UX
*/

$(document).ready(function() {
    
    // --- 1. CONFIG & GLOBALS ---
    const API_URL = '/api';
    let currentCarImagePath = ""; 

    // --- 2. SHARED UI LOGIC ---

    function hideLoader() {
        $('.loader-wrapper').addClass('fade-out');
        setTimeout(() => $('.loader-wrapper').remove(), 500);
    }

    function showNotification(message, type = 'success') {
        const toast = $(`
            <div class="toast-notification ${type}">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2"></i>
                ${message}
            </div>
        `);
        $('body').append(toast);
        setTimeout(() => toast.addClass('show'), 100);
        setTimeout(() => {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Override default alert
    window.alert = (msg) => showNotification(msg);

    function updateNavbar() {
        const user = JSON.parse(localStorage.getItem('user'));
        const authLinks = $('#auth-links');
        const userLinks = $('#user-links');
        const usernameDisplay = $('#username-display');

        if (user) {
            authLinks.addClass('d-none');
            userLinks.removeClass('d-none');
            if (usernameDisplay.length) usernameDisplay.text(user.username);
        } else {
            authLinks.removeClass('d-none');
            userLinks.addClass('d-none');
        }
    }

    updateNavbar();

    $(document).on('click', '#logout-btn', function(e) {
        e.preventDefault();
        localStorage.removeItem('user');
        showNotification("Logged out successfully!");
        setTimeout(() => window.location.href = 'index.html', 1000);
    });

    // --- 3. CAR DATA LOGIC ---

    function renderCars(carsToRender, containerId) {
        const container = $(`#${containerId}`);
        if (!container.length) return;

        container.empty();
        const isDashboard = containerId === 'dashboard-list';

        if (carsToRender.length === 0) {
            container.append('<div class="col-12 text-center my-5"><h3 class="text-muted">No cars match your criteria.</h3></div>');
            return;
        }

        carsToRender.forEach((car, index) => {
            const adminButtons = isDashboard ? `
                <div class="mt-3 pt-3 border-top d-flex gap-2">
                    <a href="edit-car.html?id=${car.id}" class="btn btn-sm btn-outline-primary flex-grow-1"><i class="bi bi-pencil"></i> Edit</a>
                    <button class="btn btn-sm btn-outline-danger delete-car flex-grow-1" data-id="${car.id}"><i class="bi bi-trash"></i> Delete</button>
                </div>
            ` : '';

            const card = `
                <div class="col-lg-4 col-md-6 mb-4 car-item" style="animation-delay: ${index * 0.1}s">
                    <div class="card car-card">
                        <div class="position-relative overflow-hidden">
                            <img src="${car.image}" class="card-img-top" alt="${car.name}">
                            <div class="car-badge">${car.brand}</div>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-white mb-1">${car.name}</h5>
                            <p class="small text-muted mb-3">${car.year} | Premium Edition</p>
                            <p class="price-tag">$${car.price.toLocaleString()}</p>
                            <div class="mt-auto d-flex justify-content-between gap-2">
                                <a href="car-details.html?id=${car.id}" class="btn btn-primary btn-sm flex-grow-1">View Details</a>
                                <button class="btn btn-outline-primary btn-sm add-fav" data-id="${car.id}">
                                    <i class="bi bi-heart"></i>
                                </button>
                            </div>
                            ${adminButtons}
                        </div>
                    </div>
                </div>
            `;
            const $card = $(card);
            container.append($card);
        });
    }

    // Load data for Home or Dashboard
    if ($('#car-list').length || $('#dashboard-list').length) {
        const containerId = $('#car-list').length ? 'car-list' : 'dashboard-list';
        
        $.get(`${API_URL}/cars`)
            .done(function(cars) {
                renderCars(cars, containerId);
                hideLoader();

                // Live Search with Debounce
                let timeout = null;
                $('#search-input').on('keyup', function() {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        const value = $(this).val().toLowerCase();
                        const filteredCars = cars.filter(car => 
                            car.name.toLowerCase().indexOf(value) > -1 || 
                            car.brand.toLowerCase().indexOf(value) > -1
                        );
                        renderCars(filteredCars, containerId);
                    }, 300);
                });
            })
            .fail(() => {
                showNotification("Failed to load car data", "error");
                hideLoader();
            });
    } else {
        // If no list, just hide loader after a bit
        setTimeout(hideLoader, 500);
    }

    // Car Details Page
    if ($('#car-details-container').length) {
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get('id');
        $.get(`${API_URL}/cars/${carId}`)
            .done(function(car) {
                $('#car-name').text(car.name);
                $('#car-price').text(`$${car.price.toLocaleString()}`);
                $('#car-brand').text(car.brand);
                $('#car-year').text(car.year);
                $('#car-description').text(car.description);
                $('#car-image').attr('src', car.image);
                $('.add-fav').attr('data-id', car.id);
            })
            .fail(() => {
                showNotification("Car details not found", "error");
                setTimeout(() => window.location.href = 'index.html', 2000);
            });
    }

    // Helper: Upload File returning path
    async function uploadImage(fileInputId) {
        const fileInput = $(`#${fileInputId}`)[0];
        if (!fileInput.files || fileInput.files.length === 0) return null;

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        try {
            const response = await $.ajax({
                url: `${API_URL}/upload`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false
            });
            return response.filePath;
        } catch (e) {
            showNotification("Image upload failed", "error");
            return null;
        }
    }

    // Add Car Form
    $('#add-car-form').on('submit', async function(e) {
        e.preventDefault();
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Publishing...');
        
        try {
            const imagePath = await uploadImage('car-image-input');
            if (!imagePath) {
                submitBtn.prop('disabled', false).text('Publish Listing');
                return;
            }

            const carData = {
                name: $('#car-name-input').val(),
                brand: $('#car-brand-input').val(),
                price: parseFloat($('#car-price-input').val()),
                year: parseInt($('#car-year-input').val()),
                image: imagePath,
                description: $('#car-desc-input').val()
            };

            await $.ajax({
                url: `${API_URL}/cars`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(carData)
            });

            showNotification("Car listed successfully! 🔥");
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } catch (err) {
            showNotification("Error adding car listing", "error");
            submitBtn.prop('disabled', false).text('Publish Listing');
        }
    });

    // Edit Car Page Init
    if ($('#edit-car-form').length) {
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get('id');
        $.get(`${API_URL}/cars/${carId}`).done(function(car) {
            $('#edit-car-id').val(car.id);
            $('#edit-car-name').val(car.name);
            $('#edit-car-brand').val(car.brand);
            $('#edit-car-price').val(car.price);
            $('#edit-car-year').val(car.year);
            currentCarImagePath = car.image; 
            $('#edit-car-desc').val(car.description);
        });
    }

    // Edit Car Form Submit
    $('#edit-car-form').on('submit', async function(e) {
        e.preventDefault();
        const carId = $('#edit-car-id').val();
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');
        
        try {
            let imagePath = await uploadImage('edit-car-image');
            if (!imagePath) imagePath = currentCarImagePath;

            const carData = {
                name: $('#edit-car-name').val(),
                brand: $('#edit-car-brand').val(),
                price: parseFloat($('#edit-car-price').val()),
                year: parseInt($('#edit-car-year').val()),
                image: imagePath,
                description: $('#edit-car-desc').val()
            };

            await $.ajax({
                url: `${API_URL}/cars/${carId}`,
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(carData)
            });

            showNotification("Car details updated! ✨");
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } catch (err) {
            showNotification("Error updating car", "error");
            submitBtn.prop('disabled', false).text('Save Changes');
        }
    });

    // Delete Car
    $(document).on('click', '.delete-car', function() {
        const carId = $(this).data('id');
        if (confirm("Are you sure you want to remove this listing?")) {
            const row = $(this).closest('.car-item');
            $.ajax({
                url: `${API_URL}/cars/${carId}`,
                type: 'DELETE',
                success: function() {
                    showNotification("Car removed from showroom");
                    row.fadeOut(500, () => row.remove());
                },
                error: (xhr) => showNotification("Delete failed: " + xhr.responseJSON.message, "error")
            });
        }
    });

    // --- 4. AUTH LOGIC ---

    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Signing in...');

        const credentials = { email: $('#email').val(), password: $('#password').val() };
        $.ajax({
            url: `${API_URL}/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(credentials),
            success: function(res) {
                showNotification(`Welcome back, ${res.user.username}!`);
                localStorage.setItem('user', JSON.stringify(res.user));
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
            },
            error: (xhr) => {
                showNotification(xhr.responseJSON?.message || "Login failed", "error");
                submitBtn.prop('disabled', false).text('Login');
            }
        });
    });

    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        const submitBtn = $(this).find('button[type="submit"]');
        if ($('#password').val() !== $('#confirm-password').val()) {
            showNotification("Passwords mismatch!", "error");
            return;
        }

        submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Creating account...');

        const userData = {
            username: $('#username').val(),
            email: $('#email').val(),
            password: $('#password').val()
        };

        $.ajax({
            url: `${API_URL}/register`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            success: function() {
                showNotification("Account created successfully! ✨");
                setTimeout(() => window.location.href = 'login.html', 2000);
            },
            error: (xhr) => {
                showNotification(xhr.responseJSON?.message || "Registration failed", "error");
                submitBtn.prop('disabled', false).text('Register');
            }
        });
    });

    // --- 5. EXTRAS ---

    $('#book-now-btn').on('click', () => $('#booking-modal').modal('show'));

    $(document).on('click', '.add-fav', function() {
        $(this).toggleClass('btn-outline-primary active');
        const isFav = $(this).hasClass('active');
        $(this).find('i').toggleClass('bi-heart bi-heart-fill');
        showNotification(isFav ? "Added to favorites" : "Removed from favorites");
    });

});

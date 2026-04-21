/* 
   CarZone - Full-Stack Logic (Upload Version)
   Student Project: Car Showroom CRUD with File Uploads
*/

$(document).ready(function() {
    
    // --- 1. CONFIG & GLOBALS ---
    const API_URL = 'http://localhost:3000/api';
    let currentCarImagePath = ""; // To track image in Edit mode

    // --- 2. SHARED UI LOGIC ---

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
        alert("Logged out successfully!");
        window.location.href = 'index.html';
    });

    // --- 3. CAR DATA LOGIC ---

    function renderCars(carsToRender, containerId) {
        const container = $(`#${containerId}`);
        if (!container.length) return;

        container.empty();
        const isDashboard = containerId === 'dashboard-list';

        if (carsToRender.length === 0) {
            container.append('<div class="col-12 text-center my-5"><h3>No cars found.</h3></div>');
            return;
        }

        carsToRender.forEach(car => {
            const adminButtons = isDashboard ? `
                <div class="mt-2 pt-2 border-top d-flex gap-2">
                    <a href="edit-car.html?id=${car.id}" class="btn btn-sm btn-outline-success flex-grow-1"><i class="bi bi-pencil"></i> Edit</a>
                    <button class="btn btn-sm btn-outline-danger delete-car flex-grow-1" data-id="${car.id}"><i class="bi bi-trash"></i> Delete</button>
                </div>
            ` : '';

            const card = `
                <div class="col-md-4 mb-4 car-item">
                    <div class="card car-card h-100">
                        <img src="${car.image}" class="card-img-top" alt="${car.name}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${car.name}</h5>
                            <p class="card-text text-muted">${car.brand} | ${car.year}</p>
                            <p class="price-tag mb-3">$${car.price.toLocaleString()}</p>
                            <div class="mt-auto d-flex justify-content-between">
                                <a href="car-details.html?id=${car.id}" class="btn btn-primary btn-sm">Details</a>
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
            $card.hide().appendTo(container).fadeIn(500);
        });
    }

    // Load data for Home or Dashboard
    if ($('#car-list').length || $('#dashboard-list').length) {
        const containerId = $('#car-list').length ? 'car-list' : 'dashboard-list';
        
        $.get(`${API_URL}/cars`).done(function(cars) {
            renderCars(cars, containerId);

            // Live Search
            $('#search-input').on('keyup', function() {
                const value = $(this).val().toLowerCase();
                const filteredCars = cars.filter(car => 
                    car.name.toLowerCase().indexOf(value) > -1 || 
                    car.brand.toLowerCase().indexOf(value) > -1
                );
                renderCars(filteredCars, containerId);
            });
        });
    }

    // Car Details Page
    if ($('#car-details-container').length) {
        const urlParams = new URLSearchParams(window.location.search);
        const carId = urlParams.get('id');
        $.get(`${API_URL}/cars/${carId}`).done(function(car) {
            $('#car-name').text(car.name);
            $('#car-price').text(`$${car.price.toLocaleString()}`);
            $('#car-brand').text(car.brand);
            $('#car-year').text(car.year);
            $('#car-description').text(car.description);
            $('#car-image').attr('src', car.image);
            $('.add-fav').attr('data-id', car.id);
        }).fail(() => window.location.href = 'index.html');
    }

    // Helper: Upload File returning path
    async function uploadImage(fileInputId) {
        const fileInput = $(`#${fileInputId}`)[0];
        if (!fileInput.files || fileInput.files.length === 0) return null;

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        const response = await $.ajax({
            url: `${API_URL}/upload`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false
        });
        return response.filePath;
    }

    // Add Car Form
    $('#add-car-form').on('submit', async function(e) {
        e.preventDefault();
        
        try {
            const imagePath = await uploadImage('car-image-input');
            if (!imagePath) {
                alert("Please select an image!");
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

            alert("Car added successfully!");
            window.location.href = 'dashboard.html';
        } catch (err) {
            alert("Error adding car!");
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
            currentCarImagePath = car.image; // Keep track of old image
            $('#edit-car-desc').val(car.description);
        });
    }

    // Edit Car Form Submit
    $('#edit-car-form').on('submit', async function(e) {
        e.preventDefault();
        const carId = $('#edit-car-id').val();
        
        try {
            // Upload new image if selected, otherwise keep old
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

            alert("Car updated successfully!");
            window.location.href = 'dashboard.html';
        } catch (err) {
            alert("Error updating car!");
        }
    });

    // Delete Car
    $(document).on('click', '.delete-car', function() {
        const carId = $(this).data('id');
        if (confirm("Are you sure you want to delete this car?")) {
            $.ajax({
                url: `${API_URL}/cars/${carId}`,
                type: 'DELETE',
                success: function() {
                    alert("Car deleted successfully!");
                    location.reload();
                },
                error: (xhr) => alert("Error deleting car: " + xhr.responseJSON.message)
            });
        }
    });

    // --- 4. AUTH LOGIC ---

    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const credentials = { email: $('#email').val(), password: $('#password').val() };
        $.ajax({
            url: `${API_URL}/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(credentials),
            success: function(res) {
                alert("Welcome back!");
                localStorage.setItem('user', JSON.stringify(res.user));
                window.location.href = 'dashboard.html';
            },
            error: (xhr) => alert(xhr.responseJSON.message)
        });
    });

    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        const userData = {
            username: $('#username').val(),
            email: $('#email').val(),
            password: $('#password').val()
        };
        if ($('#password').val() !== $('#confirm-password').val()) {
            alert("Passwords mismatch!");
            return;
        }
        $.ajax({
            url: `${API_URL}/register`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            success: function() {
                alert("Registration complete! Please login.");
                window.location.href = 'login.html';
            },
            error: (xhr) => alert(xhr.responseJSON.message)
        });
    });

    // --- 5. EXTRAS ---

    $('#book-now-btn').on('click', () => $('#booking-modal').modal('show'));

    $(document).on('click', '.add-fav', function() {
        $(this).toggleClass('btn-outline-primary btn-danger');
        $(this).find('i').toggleClass('bi-heart bi-heart-fill');
    });

});

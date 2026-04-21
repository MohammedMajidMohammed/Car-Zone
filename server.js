const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());

const CARS_FILE = path.join(__dirname, 'data', 'cars.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

const readData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
};


app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    const users = readData(USERS_FILE);

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists!' });
    }

    const newUser = { id: Date.now(), username, email, password };
    users.push(newUser);
    writeData(USERS_FILE, users);

    res.status(201).json({ message: 'User registered successfully!', user: newUser });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.status(200).json({ message: 'Login successful!', user });
    } else {
        res.status(401).json({ message: 'Invalid credentials!' });
    }
});

// File Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const filePath = `images/${req.file.filename}`;
    res.json({ filePath: filePath });
});


app.get('/api/cars', (req, res) => {
    const cars = readData(CARS_FILE);
    res.json(cars);
});

app.post('/api/cars', (req, res) => {
    const cars = readData(CARS_FILE);
    const newCar = { id: Date.now(), ...req.body };
    cars.push(newCar);
    writeData(CARS_FILE, cars);
    res.status(201).json(newCar);
});

app.get('/api/cars/:id', (req, res) => {
    const cars = readData(CARS_FILE);
    const car = cars.find(c => c.id == req.params.id);
    if (car) res.json(car);
    else res.status(404).json({ message: 'Car not found' });
});

app.put('/api/cars/:id', (req, res) => {
    const cars = readData(CARS_FILE);
    const index = cars.findIndex(c => String(c.id) === String(req.params.id));
    
    if (index !== -1) {
        cars[index] = { ...cars[index], ...req.body };
        writeData(CARS_FILE, cars);
        res.json(cars[index]);
    } else {
        res.status(404).json({ message: 'Car not found' });
    }
});

app.delete('/api/cars/:id', (req, res) => {
    console.log(`DELETE Request received for ID: ${req.params.id}`);
    let cars = readData(CARS_FILE);
    const initialLength = cars.length;
    const filteredCars = cars.filter(c => String(c.id) !== String(req.params.id));
    
    if (initialLength !== filteredCars.length) {
        console.log(`Successfully deleted car ID: ${req.params.id}`);
        writeData(CARS_FILE, filteredCars);
        res.json({ message: 'Car deleted successfully' });
    } else {
        console.log(`Car ID: ${req.params.id} NOT FOUND for deletion`);
        res.status(404).json({ message: 'Car not found' });
    }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB, sequelize } = require('./config/db'); // Import connectDB and sequelize instance

// Load environment variables from .env file
dotenv.config({ path: './.env' }); // Ensure correct path to your .env file

const app = express();

// Middleware
// Enable CORS for all origins during development. In production, restrict to your frontend URL.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Your frontend URL
    credentials: true // Allow cookies/auth headers
}));
app.use(express.json()); // Body parser for JSON data

// Serve static files from the 'uploads' directory
// This makes files accessible via URLs like http://localhost:5000/uploads/filename.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to Database
// This call will also synchronize (create/update) tables based on your models
connectDB();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Public Projects Route (for viewing projects without auth if desired by roll number)
// This route is specifically designed to be publicly accessible for project viewing
// based on roll number, without requiring a JWT token.
app.get('/api/public-projects/view-by-roll', require('./controllers/projectController').getProjectsByRollNumber);
app.get('/api/public-projects/:id', require('./controllers/projectController').getProjectDetails);


// Basic Route for testing server
app.get('/', (req, res) => {
    res.send('Plote. Backend API is running!');
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


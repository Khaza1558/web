// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB, sequelize } = require('./config/db');

dotenv.config({ path: './.env' });

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- START DEBUG LOG ---
console.log('Attempting to connect to database...');
// --- END DEBUG LOG ---
// Connect to Database
connectDB();

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/public-projects/view-by-roll', require('./controllers/projectController').getProjectsByRollNumber);
app.get('/api/public-projects/:id', require('./controllers/projectController').getProjectDetails);

app.get('/', (req, res) => {
    res.send('Plote. Backend API is running!');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// backend/config/db.js
const { Sequelize } = require('sequelize');
const path = require('path'); // For resolving .env path

// Load environment variables. Ensure the path is correct based on your project structure.
// If this file is in 'backend/config', and .env is in 'backend', then path.resolve(__dirname, '../.env') is correct.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 

// TEMPORARY: Log the database URL to see what is being loaded
console.log('DEBUG: DATABASE_URL from .env is:', process.env.DATABASE_URL); 


const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Set to true to see SQL queries in console, helpful for debugging
    dialectOptions: {
        ssl: {
            require: true, // Render PostgreSQL requires SSL
            // IMPORTANT: Use rejectUnauthorized: false only if you trust the connection and are sure
            // your database's SSL certificate is not being validated or is self-signed/untrusted.
            // For production with valid certs, prefer 'true'. For Render, 'false' is often needed.
            rejectUnauthorized: false 
        }
    },
    define: {
        // freezeTableName: true, // Prevents Sequelize from pluralizing table names
        // timestamps: true // Globally enable createdAt and updatedAt
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connection has been established successfully.');

        // Import all models and set up associations AFTER authentication
        // This ensures models are defined before sync is called.
        const models = require('../models'); // This will load index.js in models folder
        
        // Sync models with the database (create tables if they don't exist)
        // In development, you might use { force: true } to drop and recreate tables (WARNING: data loss!)
        // In production, use migrations for schema changes (more advanced).
        await sequelize.sync(); 
        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database or sync models:', error);
        process.exit(1); // Exit process with failure
    }
};

module.exports = { sequelize, connectDB };


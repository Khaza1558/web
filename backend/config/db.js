// backend/config/db.js
const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('DEBUG: DATABASE_URL from .env is:', process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: console.log, // Set to true or console.log to see SQL queries executed by Sequelize
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    define: {
        // freezeTableName: true, // If you uncomment this, Sequelize will not pluralize table names
        // timestamps: true
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connection has been established successfully.');

        // Import all models and set up associations AFTER authentication
        // This ensures models are defined before sync is called.
        // Importing models/index.js will load all your models and their associations.
        const models = require('../models');
        console.log('DEBUG: Models loaded:', Object.keys(models)); // Check which models are loaded

        // Sync models with the database
        // IMPORTANT: { alter: true } will try to make the database schema match your models.
        // It's good for development, but for production, migrations are preferred.
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully with alter: true.');
    } catch (error) {
        console.error('Unable to connect to the database or sync models:', error);
        process.exit(1); // Exit process with failure
    }
};

module.exports = { sequelize, connectDB };


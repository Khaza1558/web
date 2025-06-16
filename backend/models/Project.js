// backend/models/Project.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Import the sequelize instance

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT // Use TEXT for longer descriptions
    },
    // Foreign key to link to the User model
    userId: { 
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users', // This refers to the table name created by the User model (Sequelize pluralizes by default)
            key: 'id'
        },
        onDelete: 'CASCADE' // If a user is deleted, their projects are also deleted
    },
    // Denormalized roll_number for easier querying by roll_number without joins
    roll_number: { 
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = Project;


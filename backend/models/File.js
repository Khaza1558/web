// backend/models/File.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Import the sequelize instance

const File = sequelize.define('File', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    file_name: { // The title given by the user for the file
        type: DataTypes.STRING,
        allowNull: false
    },
    original_name: { // The original filename from the user's computer
        type: DataTypes.STRING,
        allowNull: false
    },
    file_path: { // The path/URL where the file is stored (e.g., /uploads/xyz.pdf or S3 URL)
        type: DataTypes.STRING,
        allowNull: false
    },
    mimetype: {
        type: DataTypes.STRING
    },
    size: {
        type: DataTypes.INTEGER // Size in bytes
    },
    // Foreign key to link to the Project model
    projectId: { 
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Projects', // This refers to the table name created by the Project model
            key: 'id'
        },
        onDelete: 'CASCADE' // If a project is deleted, its files are also deleted
    },
    // Foreign key to link to the User model (for direct ownership check on files)
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users', // This refers to the table name created by the User model
            key: 'id'
        },
        onDelete: 'CASCADE' // If a user is deleted, their files are also deleted
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = File;


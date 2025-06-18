// backend/models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Import the sequelize instance
const bcrypt = require('bcryptjs'); // For password hashing

const User = sequelize.define('User', {
    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // Generates a UUID V4 for primary key
        primaryKey: true,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true // Sequelize validation for email format
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    college: {
        type: DataTypes.STRING,
        allowNull: false
    },
    branch: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roll_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    mobile_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    resetPasswordToken: {
        type: DataTypes.STRING
    },
    resetPasswordExpire: {
        type: DataTypes.DATE
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    // Hooks for password hashing before saving
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) { // Only hash if password was changed
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Method to compare entered password with hashed password
User.prototype.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = User;


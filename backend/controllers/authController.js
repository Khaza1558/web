// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // For generating reset tokens

// Helper function to generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, mobileNumber, college, branch, rollNumber } = req.body;

        // Simple validation
        if (!username || !email || !password || !mobileNumber || !college || !branch || !rollNumber) {
            return res.status(400).json({ success: false, message: 'Please enter all fields.' });
        }

        // Validate mobile number format
        if (!/^[0-9]{10}$/.test(mobileNumber)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ where: { username } });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }
        const emailExists = await User.findOne({ where: { email } });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }
        const rollNumberExists = await User.findOne({ where: { roll_number: rollNumber } });
        if (rollNumberExists) {
            return res.status(400).json({ success: false, message: 'Roll number already exists.' });
        }
        const mobileNumberExists = await User.findOne({ where: { mobile_number: mobileNumber } });
        if (mobileNumberExists) {
            return res.status(400).json({ success: false, message: 'Mobile number already exists.' });
        }

        // Password hashing is handled by a Sequelize hook in the User model (beforeCreate)

        const newUser = await User.create({
            username,
            email,
            password, // Password will be hashed by the hook
            mobile_number: mobileNumber,
            college,
            branch,
            roll_number: rollNumber
        });

        if (newUser) {
            res.status(201).json({
                success: true,
                message: 'User registered successfully!',
                token: generateToken(newUser.id), // Log in user immediately
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    mobile_number: newUser.mobile_number,
                    roll_number: newUser.roll_number,
                    college: newUser.college,
                    branch: newUser.branch
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error during registration:', error);
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ success: false, message: 'Invalid input data. Please check all fields.' });
        } else {
            res.status(500).json({ success: false, message: 'Server error during registration.' });
        }
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please enter all fields.' });
        }

        // Find user by username
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Compare password using the instance method defined in User model
        const isMatch = await user.matchPassword(password);

        if (user && isMatch) {
            // --- START DEBUG LOG FOR LOGIN ---
            console.log('DEBUG Login: User object details being sent:', {
                id: user.id,
                username: user.username,
                email: user.email,
                roll_number: user.roll_number, // Check this!
                college: user.college,         // Check this!
                branch: user.branch            // Check this!
            });
            // --- END DEBUG LOG FOR LOGIN ---

            res.status(200).json({
                success: true,
                message: 'Logged in successfully!',
                token: generateToken(user.id),
                user: { // Ensure these fields are explicitly included here
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roll_number: user.roll_number,
                    college: user.college,
                    branch: user.branch
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// @desc    Get user details (private route)
// @route   GET /api/auth/user/details
// @access  Private
exports.getUserDetails = async (req, res) => {
    // req.user is populated by the protect middleware
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, user data missing' });
        }
        // Ensure that password is not included (already excluded by middleware)
        const userDetails = { ...req.user.toJSON() }; // Convert Sequelize instance to plain object
        delete userDetails.password; // Double-check and remove if somehow present

        // --- START DEBUG LOG FOR GET_USER_DETAILS ---
        console.log('DEBUG GetUserDetails: User details being sent:', userDetails); // Check this!
        // --- END DEBUG LOG FOR GET_USER_DETAILS ---

        res.status(200).json({ success: true, user: userDetails });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ success: false, message: 'Server error fetching user details.' });
    }
};


// @desc    Request password reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { username } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordExpire = Date.now() + 3600000; // 1 hour from now

        // Update user with reset token and expiry
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = resetPasswordExpire;
        await user.save();

        // FOR DEMO: Send the token and reset link directly in the response.
        // In a real application, you would email this to the user.
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&username=${username}`;

        res.status(200).json({
            success: true,
            message: 'Password reset token generated (check console/response for demo)',
            token: resetToken,
            resetLink: resetLink
        });

    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset request.' });
    }
};

// @desc    Reset user password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    const { username, token, newPassword } = req.body;

    if (!username || !token || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        // Find user by username and valid token
        const user = await User.findOne({
            where: {
                username,
                resetPasswordToken: token,
                resetPasswordExpire: { [require('sequelize').Op.gt]: Date.now() } // Token is greater than current time
            }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        // Password hashing is handled by a Sequelize hook in the User model (beforeUpdate)
        user.password = newPassword; // The hook will hash this
        user.resetPasswordToken = null; // Clear token after use
        user.resetPasswordExpire = null; // Clear expiry
        await user.save();

        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
};

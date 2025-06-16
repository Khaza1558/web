// backend/routes/projectRoutes.js
const express = require('express');
const {
    createProject,
    // getProjectsByRollNumber, // This is now a public route in server.js
    getProjectDetails,
    updateProject,
    deleteProject,
    addFilesToProject,
    deleteFile,
    replaceFile
} = require('../controllers/projectController');
const protect = require('../middleware/authMiddleware'); // Our authentication middleware

const router = express.Router();

// Project Management Routes (Protected)
router.post('/create', protect, createProject); // Create a new project
// router.get('/view-by-roll', getProjectsByRollNumber); // Now handled as a public route in server.js
router.put('/:id', protect, updateProject);     // Update project details
router.delete('/:id', protect, deleteProject);  // Delete a project

// File Management Routes (Protected)
router.post('/add-files/:projectId', protect, addFilesToProject); // Add files to existing project
router.delete('/delete-file/:fileId', protect, deleteFile);       // Delete a specific file
router.post('/replace-file/:fileId', protect, replaceFile);       // Replace a specific file

module.exports = router;


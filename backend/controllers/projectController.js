// backend/controllers/projectController.js
const Project = require('../models/Project');
const File = require('../models/File');
const User = require('../models/User'); // Used for fetching user details for roll_number
const path = require('path');
const fs = require('fs/promises'); // For file system operations (unlink)
const { Op } = require('sequelize'); // Import Operator for Sequelize queries

// Configure Multer for file uploads (local storage)
const multer = require('multer');

// Setup storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        // Ensure the uploads directory exists
        fs.mkdir(uploadDir, { recursive: true }).then(() => {
            cb(null, uploadDir);
        }).catch(err => {
            console.error('Error creating upload directory:', err);
            cb(err, null);
        });
    },
    filename: (req, file, cb) => {
        // Create a unique filename: fieldname-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to allow specific file types (optional, but good practice)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar|js|html|css|json|py|java|c|cpp|sh|md|xml/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: fileFilter
}).array('projectFiles', 10); // 'projectFiles' is the name of the input field, allow up to 10 files

// For adding new files to an existing project
const addFilesUpload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: fileFilter
}).array('newProjectFiles', 10); // 'newProjectFiles' for adding files to existing project

// For replacing a single file
const replaceFileUpload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: fileFilter
}).single('newFile'); // 'newFile' for replacing a single file

// @desc    Create a new project with files
// @route   POST /api/projects/create
// @access  Private (requires JWT)
exports.createProject = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            // Handle Multer errors (e.g., file too large, invalid type)
            return res.status(400).json({ success: false, message: err.message });
        }

        // --- START DEBUG LOGS ---
        console.log('--- Debugging Create Project ---');
        console.log('req.body:', req.body); // This should show text fields like name, description, fileTitle_projectFiles
        console.log('req.files:', req.files); // This should be an array of uploaded file objects
        // Ensure fileTitles is always an array, even if a single string is sent (Multer behavior)
        const fileTitlesReceived = Array.isArray(req.body.fileTitle_projectFiles)
                                   ? req.body.fileTitle_projectFiles
                                   : (req.body.fileTitle_projectFiles ? [req.body.fileTitle_projectFiles] : []);
        console.log('fileTitles (adjusted for array) received from req.body:', fileTitlesReceived);
        console.log('Is fileTitles (adjusted) an array?', Array.isArray(fileTitlesReceived));
        console.log('Number of files received by Multer:', req.files ? req.files.length : 0);
        console.log('--- End Debugging ---');
        // --- END DEBUG LOGS ---

        try {
            const { name, description } = req.body;
            // Use the adjusted fileTitles variable here for validation
            const fileTitles = fileTitlesReceived; 

            if (!name || !req.files || req.files.length === 0) {
                // If files are missing, it's a client-side issue (no files selected)
                return res.status(400).json({ success: false, message: 'Project name and at least one file are required.' });
            }
            
            // Validate that the number of titles matches the number of files
            if (fileTitles.length !== req.files.length) { 
                return res.status(400).json({ success: false, message: 'Each uploaded file must have a corresponding title.' });
            }

            // Get user ID and roll_number from the authenticated user (from authMiddleware)
            const userId = req.user.id;
            const userRollNumber = req.user.roll_number;

            // Create the project in PostgreSQL
            const newProject = await Project.create({
                name,
                description,
                userId: userId,
                roll_number: userRollNumber
            });

            // Create file entries in PostgreSQL for each uploaded file
            const fileEntries = req.files.map((file, index) => ({
                file_name: fileTitles[index], // Use the title provided by the user
                original_name: file.originalname,
                file_path: `/uploads/${file.filename}`, // Local path
                mimetype: file.mimetype,
                size: file.size,
                projectId: newProject.id, // Link to the newly created project
                userId: userId // Link to the user who uploaded it
            }));

            await File.bulkCreate(fileEntries); // Insert multiple file records

            res.status(201).json({ success: true, message: 'Project created successfully!', project: newProject });

        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ success: false, message: 'Server error during project creation.' });
        }
    });
};


// @desc    Get all projects by a specific roll number (publicly accessible)
// @route   GET /api/public-projects/view-by-roll?rollNumber=...
// @access  Public
exports.getProjectsByRollNumber = async (req, res) => {
    try {
        const { rollNumber } = req.query;

        if (!rollNumber) {
            return res.status(400).json({ success: false, message: 'Roll number is required.' });
        }

        // Find all projects associated with this roll number
        // No need to include files here for the list view, fetch them when a project is selected
        const projects = await Project.findAll({
            where: { roll_number: rollNumber },
            order: [['createdAt', 'DESC']] // Order by creation date, newest first
        });

        if (!projects || projects.length === 0) {
            return res.status(404).json({ success: false, message: 'No projects found for this roll number.' });
        }

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects by roll number:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching projects.' });
    }
};

// @desc    Get a single project's details with its files
// @route   GET /api/public-projects/:id
// @access  Public
exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the project by ID and include its associated files
        const project = await Project.findByPk(id, {
            include: [{
                model: File,
                as: 'files', // This alias must match the one defined in models/index.js (Project.hasMany(File, { as: 'files' }))
                attributes: ['id', 'file_name', 'original_name', 'file_path', 'mimetype', 'size', 'createdAt'] // Select specific file attributes
            }],
            // Include owner details if needed
            // include: [{ model: User, as: 'owner', attributes: ['username', 'roll_number'] }]
        });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        res.status(200).json({ project, files: project.files });
    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching project details.' });
    }
};

// @desc    Update project details (name, description)
// @route   PUT /api/projects/:id
// @access  Private (requires JWT)
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body; // Can update name or description

        // Find the project first to ensure ownership
        const project = await Project.findByPk(id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        // Check if the authenticated user is the owner of the project
        if (project.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this project.' });
        }

        // Update project details
        project.name = name || project.name; // Update if provided, otherwise keep old
        project.description = description !== undefined ? description : project.description; // Allow clearing description

        await project.save(); // Save changes to the database

        res.status(200).json({ success: true, message: 'Project updated successfully!', project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, message: 'Server error while updating project.' });
    }
};

// @desc    Delete a project and all associated files
// @route   DELETE /api/projects/:id
// @access  Private (requires JWT)
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findByPk(id, {
            include: [{ model: File, as: 'files' }] // Include files to delete them from disk
        });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        // Check if the authenticated user is the owner of the project
        if (project.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this project.' });
        }

        // Delete associated files from local storage first (if they exist)
        for (const file of project.files) {
            const filePath = path.join(__dirname, '..', file.file_path); // Construct absolute path
            try {
                await fs.unlink(filePath);
                console.log(`Deleted local file: ${filePath}`);
            } catch (unlinkError) {
                if (unlinkError.code === 'ENOENT') {
                    console.warn(`File not found on disk, skipping: ${filePath}`);
                } else {
                    console.error(`Error deleting local file ${filePath}:`, unlinkError);
                    // Decide if you want to stop or continue if file deletion fails
                }
            }
        }
        // Files associated in DB will be deleted automatically due to CASCADE delete on projectId in File model

        // Delete the project from PostgreSQL
        await project.destroy();

        res.status(200).json({ success: true, message: 'Project deleted successfully!' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting project.' });
    }
};

// @desc    Add new files to an existing project
// @route   POST /api/projects/add-files/:projectId
// @access  Private (requires JWT)
exports.addFilesToProject = async (req, res) => {
    addFilesUpload(req, res, async (err) => {
        if (err) {
            console.error('Multer addFiles upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const { projectId } = req.params;
            // Ensure fileTitles is always an array, even if a single string is sent
            const fileTitlesReceived = Array.isArray(req.body.fileTitle_newProjectFiles)
                                       ? req.body.fileTitle_newProjectFiles
                                       : (req.body.fileTitle_newProjectFiles ? [req.body.fileTitle_newProjectFiles] : []);
            const fileTitles = fileTitlesReceived;

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'No files provided to add.' });
            }
            if (fileTitles.length !== req.files.length) {
                return res.status(400).json({ success: false, message: 'Each uploaded file must have a corresponding title.' });
            }

            const project = await Project.findByPk(projectId);

            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found.' });
            }

            // Check if the authenticated user is the owner of the project
            if (project.userId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized to add files to this project.' });
            }

            const fileEntries = req.files.map((file, index) => ({
                file_name: fileTitles[index],
                original_name: file.originalname,
                file_path: `/uploads/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
                projectId: project.id,
                userId: req.user.id
            }));

            await File.bulkCreate(fileEntries);

            res.status(200).json({ success: true, message: 'Files added successfully!' });

        } catch (error) {
            console.error('Error adding files to project:', error);
            res.status(500).json({ success: false, message: 'Server error adding files to project.' });
        }
    });
};

// @desc    Delete a specific file from a project
// @route   DELETE /api/projects/delete-file/:fileId
// @access  Private (requires JWT)
exports.deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // Check if the authenticated user is the owner of the file
        if (file.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this file.' });
        }

        // Delete the actual file from local storage
        const filePath = path.join(__dirname, '..', file.file_path);
        try {
            await fs.unlink(filePath);
            console.log(`Deleted local file: ${filePath}`);
        } catch (unlinkError) {
            if (unlinkError.code === 'ENOENT') {
                console.warn(`File not found on disk, skipping: ${filePath}`);
                // Decide if you want to stop or continue if file deletion fails
            } else {
                console.error(`Error deleting local file ${filePath}:`, unlinkError);
            }
        }

        // Delete the file record from PostgreSQL
        await file.destroy();

        res.status(200).json({ success: true, message: 'File deleted successfully!' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting file.' });
    }
};


// @desc    Replace an existing file with a new one
// @route   POST /api/projects/replace-file/:fileId
// @access  Private (requires JWT)
exports.replaceFile = async (req, res) => {
    replaceFileUpload(req, res, async (err) => {
        if (err) {
            console.error('Multer replaceFile upload error:', err);
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const { fileId } = req.params;
            const newFileName = req.body.fileName; // The new title for the file
            const newFile = req.file; // The newly uploaded file

            if (!newFile || !newFileName) {
                return res.status(400).json({ success: false, message: 'New file and file name are required.' });
            }

            const existingFile = await File.findByPk(fileId);

            if (!existingFile) {
                // If file not found, delete the newly uploaded temp file and respond
                if (newFile) {
                    await fs.unlink(newFile.path);
                }
                return res.status(404).json({ success: false, message: 'Original file not found.' });
            }

            // Check if the authenticated user is the owner of the file
            if (existingFile.userId !== req.user.id) {
                // If not authorized, delete the new temp file
                if (newFile) {
                    await fs.unlink(newFile.path);
                }
                return res.status(403).json({ success: false, message: 'Not authorized to replace this file.' });
            }

            // Delete the old file from local storage
            const oldFilePath = path.join(__dirname, '..', existingFile.file_path);
            try {
                await fs.unlink(oldFilePath);
                console.log(`Deleted old local file: ${oldFilePath}`);
            } catch (unlinkError) {
                if (unlinkError.code === 'ENOENT') {
                    console.warn(`Old file not found on disk, skipping: ${oldFilePath}`);
                } else {
                    console.error(`Error deleting old local file ${oldFilePath}:`, unlinkError);
                }
            }

            // Update the file record in PostgreSQL with new file details
            existingFile.file_name = newFileName; // Update with new user-provided name
            existingFile.original_name = newFile.originalname;
            existingFile.file_path = `/uploads/${newFile.filename}`;
            existingFile.mimetype = newFile.mimetype;
            existingFile.size = newFile.size;

            await existingFile.save();

            res.status(200).json({ success: true, message: 'File replaced successfully!' });

        } catch (error) {
            console.error('Error replacing file:', error);
            // If an error occurred after successful upload but before DB update, clean up new file
            if (req.file) { // req.file holds the new uploaded file details
                try {
                    await fs.unlink(req.file.path);
                    console.warn(`Cleaned up newly uploaded file due to error: ${req.file.path}`);
                } catch (cleanupError) {
                    console.error('Error cleaning up new file:', cleanupError);
                }
            }
            res.status(500).json({ success: false, message: 'Server error while replacing file.' });
        }
    });
};


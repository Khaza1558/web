// backend/controllers/projectController.js
const Project = require('../models/Project');
const File = require('../models/File');
const User = require('../models/User'); // Not directly used in provided functions, but kept.
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabaseClient'); // Assuming this is correctly configured
const multer = require('multer');

// Use memory storage for Multer to get file buffer for Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('projectFiles', 10); // Used for createProject
const addFilesUpload = multer({ storage }).array('newProjectFiles', 10); // Used for addFilesToProject
const replaceFileUpload = multer({ storage }).single('newFile'); // Used for replaceFile

// @desc    Create a new project with files stored in Supabase
// @route   POST /api/projects/create
// @access  Private (requires JWT)
exports.createProject = async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer error during project creation:', err);
            return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown upload error during project creation:', err);
            return res.status(500).json({ success: false, message: 'An unknown error occurred during file upload.' });
        }

        try {
            const { name, description } = req.body;
            // Ensure fileTitles is always an array, even if a single string is sent
            const fileTitles = Array.isArray(req.body.fileTitle_projectFiles)
                                ? req.body.fileTitle_projectFiles
                                : (req.body.fileTitle_projectFiles ? [req.body.fileTitle_projectFiles] : []);

            // Input validation for project creation
            if (!name) {
                return res.status(400).json({ success: false, message: 'Project name is required.' });
            }
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one file is required to create a project.' });
            }
            if (fileTitles.length !== req.files.length) {
                return res.status(400).json({ success: false, message: 'Each uploaded file must have a corresponding title.' });
            }

            // 1. Create the project in PostgreSQL
            const newProject = await Project.create({
                name,
                description,
                userId: req.user.id,
                roll_number: req.user.roll_number
            });
            console.log(`Project created with ID: ${newProject.id}`);

            // 2. Upload files to Supabase Storage and prepare entries for DB
            const fileEntries = await Promise.all(req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const supabaseFileName = `${uuidv4()}${ext}`; // Generate a unique file name

                console.log(`Uploading file ${index + 1}: ${file.originalname} to Supabase as ${supabaseFileName}`);
                const { data, error } = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET_NAME)
                    .upload(supabaseFileName, file.buffer, { contentType: file.mimetype });

                if (error) {
                    console.error(`Supabase upload error for ${file.originalname}:`, error);
                    throw new Error(`Failed to upload file ${file.originalname} to Supabase: ${error.message}`); // Re-throw with more context
                }
                console.log(`File uploaded successfully: ${data.path}`);

                return {
                    file_name: fileTitles[index], // Use the provided title
                    original_name: file.originalname,
                    file_path: data.path, // Store Supabase path
                    mimetype: file.mimetype,
                    size: file.size,
                    projectId: newProject.id,
                    userId: req.user.id
                };
            }));

            // 3. Create file entries in PostgreSQL
            await File.bulkCreate(fileEntries);
            console.log(`Created ${fileEntries.length} file entries in DB for project ${newProject.id}`);

            res.status(201).json({ success: true, message: 'Project created successfully!', project: newProject });
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ success: false, message: 'Server error during project creation.' });
        }
    });
};

// @desc    Delete a project and its files from Supabase
// @route   DELETE /api/projects/:id
// @access  Private (requires JWT)
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByPk(id, { include: [{ model: File, as: 'files' }] });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        if (project.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        // 1. Delete files from Supabase Storage
        const filePaths = project.files.map(f => f.file_path);
        if (filePaths.length > 0) {
            console.log(`Attempting to delete ${filePaths.length} files from Supabase for project ${id}`);
            const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove(filePaths);
            if (error) {
                console.error('Supabase file deletion error for project:', error);
                // Important: Decide if you want to stop here or continue.
                // Currently, it continues to delete DB record even if storage deletion fails.
                // For critical data, you might want to stop and notify.
            } else {
                console.log('Files successfully deleted from Supabase storage.');
            }
        } else {
            console.log('No files to delete from Supabase for project', id);
        }

        // 2. Delete project from PostgreSQL (cascade will delete file records due to associations)
        await project.destroy();
        console.log(`Project ${id} deleted from PostgreSQL.`);

        res.status(200).json({ success: true, message: 'Project deleted successfully!' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting project.' });
    }
};

// @desc    Delete a specific file from Supabase and DB
// @route   DELETE /api/projects/delete-file/:fileId
// @access  Private (requires JWT)
exports.deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findByPk(fileId);

        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }
        if (file.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        // 1. Delete from Supabase Storage
        console.log(`Attempting to delete file from Supabase: ${file.file_path}`);
        const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([file.file_path]);
        if (error) {
           console.error('Supabase single file deletion error:', error);
           // Decide if you want to stop here (e.g., if Supabase is down, you might not want to delete DB record)
           // For now, it proceeds to delete from DB even if Supabase fails.
        } else {
            console.log(`File ${file.file_path} deleted from Supabase storage.`);
        }

        // 2. Delete from PostgreSQL
        await file.destroy();
        console.log(`File ID ${fileId} deleted from PostgreSQL.`);

        res.status(200).json({ success: true, message: 'File deleted successfully!' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting file.' });
    }
};

// Restore original functions that don't need Supabase interaction for primary logic
exports.getProjectsByRollNumber = async (req, res) => {
    try {
        const { rollNumber } = req.query;
        if (!rollNumber) {
            return res.status(400).json({ message: 'Roll number is required.' });
        }
        const projects = await Project.findAll({ where: { roll_number: rollNumber }, order: [['createdAt', 'DESC']] });
        if (!projects.length) {
            return res.status(404).json({ message: 'No projects found.' });
        }
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error getting projects by roll number:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByPk(id, { include: [{ model: File, as: 'files' }] });
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        res.status(200).json({ project, files: project.files });
    } catch (error) {
        console.error('Error getting project details:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.userId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized.' });
        }
        project.name = name || project.name;
        project.description = description !== undefined ? description : project.description;
        await project.save();
        res.status(200).json({ project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// @desc    Add files to an existing project with files stored in Supabase
// @route   POST /api/projects/add-files/:projectId
// @access  Private (requires JWT)
exports.addFilesToProject = async (req, res) => {
    addFilesUpload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error during adding files:', err);
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            console.error('Unknown upload error during adding files:', err);
            return res.status(500).json({ message: 'An unknown error occurred during file upload.' });
        }

        try {
            const { projectId } = req.params;
            // Ensure fileTitles is always an array, handling single string case
            const fileTitles = Array.isArray(req.body.fileTitle_newProjectFiles)
                                ? req.body.fileTitle_newProjectFiles
                                : (req.body.fileTitle_newProjectFiles ? [req.body.fileTitle_newProjectFiles] : []);

            console.log(`Attempting to add files to project ID: ${projectId}`);
            console.log(`Received ${req.files ? req.files.length : 0} files and ${fileTitles.length} file titles.`);

            // **CRITICAL: Add validation for files and titles**
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No files provided to add.' });
            }
            if (fileTitles.length !== req.files.length) {
                return res.status(400).json({ message: 'Each uploaded file must have a corresponding title.' });
            }

            const project = await Project.findByPk(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found.' });
            }
            // Authorization check
            if (project.userId !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to add files to this project.' });
            }
            console.log(`Project ${projectId} found and authorized.`);

            const fileEntries = await Promise.all(req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const supabaseFileName = `${uuidv4()}${ext}`; // Unique name for Supabase

                console.log(`Uploading new file ${index + 1}: ${file.originalname} as ${supabaseFileName}`);
                const { data, error } = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET_NAME)
                    .upload(supabaseFileName, file.buffer, { contentType: file.mimetype });

                if (error) {
                    console.error(`Supabase upload error for ${file.originalname}:`, error);
                    // Throwing the error here will propagate it to the outer try-catch
                    throw new Error(`Failed to upload file ${file.originalname} to Supabase: ${error.message}`);
                }
                console.log(`New file uploaded to Supabase: ${data.path}`);

                return {
                    file_name: fileTitles[index],
                    original_name: file.originalname,
                    file_path: data.path,
                    mimetype: file.mimetype,
                    size: file.size,
                    projectId: project.id,
                    userId: req.user.id
                };
            }));

            await File.bulkCreate(fileEntries);
            console.log(`Successfully added ${fileEntries.length} new file entries to project ${projectId}.`);
            res.status(200).json({ message: 'Files added successfully!' });

        } catch (error) {
            console.error('Error adding files to project:', error); // Log the actual error
            res.status(500).json({ message: 'Server error while adding files.' }); // More specific message
        }
    });
};

exports.replaceFile = async (req, res) => {
    replaceFileUpload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error during file replacement:', err);
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            console.error('Unknown upload error during file replacement:', err);
            return res.status(500).json({ message: 'An unknown error occurred during file upload.' });
        }

        try {
            const { fileId } = req.params;
            const { fileName } = req.body; // New file name, if different from original
            const newFile = req.file; // The single new file uploaded by Multer

            if (!newFile) {
                return res.status(400).json({ message: 'No new file provided for replacement.' });
            }
            if (!fileName) {
                return res.status(400).json({ message: 'New file name is required.' });
            }

            console.log(`Attempting to replace file ID: ${fileId}`);
            const existingFile = await File.findByPk(fileId);

            if (!existingFile) {
                return res.status(404).json({ message: 'File not found.' });
            }
            if (existingFile.userId !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to replace this file.' });
            }
            console.log(`Existing file ${fileId} found and authorized.`);

            // Delete old file from Supabase
            console.log(`Deleting old file from Supabase: ${existingFile.file_path}`);
            const { error: deleteError } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([existingFile.file_path]);
            if (deleteError) {
                console.error('Supabase old file deletion error during replacement:', deleteError);
                // Consider if you want to abort or proceed. For now, we proceed.
            } else {
                console.log(`Old file ${existingFile.file_path} deleted from Supabase.`);
            }

            // Upload new file to Supabase
            const ext = path.extname(newFile.originalname);
            const supabaseFileName = `${uuidv4()}${ext}`; // Generate a unique name for the new file

            console.log(`Uploading new file to Supabase: ${newFile.originalname} as ${supabaseFileName}`);
            const { data, error: uploadError } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).upload(supabaseFileName, newFile.buffer, { contentType: newFile.mimetype });
            if (uploadError) {
                console.error('Supabase new file upload error during replacement:', uploadError);
                throw new Error(`Failed to upload new file to Supabase: ${uploadError.message}`);
            }
            console.log(`New file uploaded to Supabase: ${data.path}`);

            // Update DB record with new file details
            existingFile.file_name = fileName; // Update to the potentially new name
            existingFile.original_name = newFile.originalname;
            existingFile.file_path = data.path; // Update with the new Supabase path
            existingFile.mimetype = newFile.mimetype;
            existingFile.size = newFile.size;
            await existingFile.save();
            console.log(`File ID ${fileId} updated in PostgreSQL.`);

            res.status(200).json({ message: 'File replaced successfully!' });
        } catch (error) {
            console.error('Error replacing file:', error); // Log the actual error
            res.status(500).json({ message: 'Server error while replacing file.' }); // More specific message
        }
    });
};

// backend/controllers/projectController.js
const Project = require('../models/Project');
const File = require('../models/File');
const User = require('../models/User');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabaseClient');
const multer = require('multer');

// Use memory storage for Multer to get file buffer for Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('projectFiles', 10);
const addFilesUpload = multer({ storage }).array('newProjectFiles', 10);
const replaceFileUpload = multer({ storage }).single('newFile');

// @desc    Create a new project with files stored in Supabase
// @route   POST /api/projects/create
// @access  Private (requires JWT)
exports.createProject = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        try {
            const { name, description } = req.body;
            const fileTitles = Array.isArray(req.body.fileTitle_projectFiles)
                                   ? req.body.fileTitle_projectFiles
                                   : [req.body.fileTitle_projectFiles];

            if (!name || !req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'Project name and at least one file are required.' });
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

            // 2. Upload files to Supabase Storage
            const fileEntries = await Promise.all(req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const supabaseFileName = `${uuidv4()}${ext}`;

                const { data, error } = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET_NAME)
                    .upload(supabaseFileName, file.buffer, { contentType: file.mimetype });

                if (error) throw error;

                return {
                    file_name: fileTitles[index],
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
            const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove(filePaths);
            if (error) {
                console.error('Supabase file deletion error:', error);
                // Continue to delete DB record even if storage deletion fails
            }
        }

        // 2. Delete project from PostgreSQL (cascade will delete file records)
        await project.destroy();

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
        const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([file.file_path]);
        if (error) {
           console.error('Supabase file deletion error:', error);
           // Decide if you want to stop here
        }

        // 2. Delete from PostgreSQL
        await file.destroy();

        res.status(200).json({ success: true, message: 'File deleted successfully!' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting file.' });
    }
};

// Restore original functions that don't need Supabase
exports.getProjectsByRollNumber = async (req, res) => {
    try {
        const { rollNumber } = req.query;
        if (!rollNumber) return res.status(400).json({ message: 'Roll number is required.' });
        const projects = await Project.findAll({ where: { roll_number: rollNumber }, order: [['createdAt', 'DESC']] });
        if (!projects.length) return res.status(404).json({ message: 'No projects found.' });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByPk(id, { include: [{ model: File, as: 'files' }] });
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        res.status(200).json({ project, files: project.files });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const project = await Project.findByPk(id);
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        if (project.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
        project.name = name || project.name;
        project.description = description !== undefined ? description : project.description;
        await project.save();
        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.addFilesToProject = async (req, res) => {
    addFilesUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const { projectId } = req.params;
            const fileTitles = Array.isArray(req.body.fileTitle_newProjectFiles) ? req.body.fileTitle_newProjectFiles : [req.body.fileTitle_newProjectFiles];
            const project = await Project.findByPk(projectId);
            if (!project) return res.status(404).json({ message: 'Project not found.' });
            if (project.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
            
            const fileEntries = await Promise.all(req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const supabaseFileName = `${uuidv4()}${ext}`;
                const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).upload(supabaseFileName, file.buffer, { contentType: file.mimetype });
                if (error) throw error;
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
            res.status(200).json({ message: 'Files added successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Server error.' });
        }
    });
};

exports.replaceFile = async (req, res) => {
    replaceFileUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const { fileId } = req.params;
            const { fileName } = req.body;
            const newFile = req.file;
            const existingFile = await File.findByPk(fileId);

            if (!existingFile) return res.status(404).json({ message: 'File not found.' });
            if (existingFile.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });

            // Delete old file from Supabase
            await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([existingFile.file_path]);

            // Upload new file to Supabase
            const ext = path.extname(newFile.originalname);
            const supabaseFileName = `${uuidv4()}${ext}`;
            const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).upload(supabaseFileName, newFile.buffer, { contentType: newFile.mimetype });
            if (error) throw error;

            // Update DB record
            existingFile.file_name = fileName;
            existingFile.original_name = newFile.originalname;
            existingFile.file_path = data.path;
            existingFile.mimetype = newFile.mimetype;
            existingFile.size = newFile.size;
            await existingFile.save();

            res.status(200).json({ message: 'File replaced successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Server error.' });
        }
    });
};

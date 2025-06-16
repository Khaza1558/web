// backend/models/index.js
// This file centralizes model imports and association definitions.

const User = require('./User');
const Project = require('./Project');
const File = require('./File');
const { sequelize } = require('../config/db'); // Import the sequelize instance

// Define Associations
// A User can have many Projects
User.hasMany(Project, {
    foreignKey: 'userId', // This will add a userId column to the Project table
    as: 'projects',       // Alias for when including projects with a user
    onDelete: 'CASCADE'   // If a User is deleted, delete associated Projects
});
Project.belongsTo(User, {
    foreignKey: 'userId',
    as: 'owner'           // Alias for when including the owner with a project
});

// A Project can have many Files
Project.hasMany(File, {
    foreignKey: 'projectId', // This will add a projectId column to the File table
    as: 'files',           // Alias for when including files with a project
    onDelete: 'CASCADE'    // If a Project is deleted, delete associated Files
});
File.belongsTo(Project, {
    foreignKey: 'projectId',
    as: 'project'
});

// A File belongs to a User (who uploaded it)
File.belongsTo(User, {
    foreignKey: 'userId', // This will add a userId column to the File table
    as: 'uploader'        // Alias for when including the uploader with a file
});


// Export all models and the sequelize instance
module.exports = {
    sequelize,
    User,
    Project,
    File
};


const mongoose = require('mongoose');

const generatedRequestSchema = new mongoose.Schema({
    teamNumber: String,
    assignedProject: String,
    numStudents: String,
    student1: String,
    student2: String,
    student3: String,
    student4: String,
    preferenceList: String
}, { timestamps: true });

const GeneratedStudentTeam = mongoose.model('GeneratedTeams', generatedRequestSchema);

module.exports = GeneratedStudentTeam;

const mongoose = require('mongoose');

const studentRequestSchema = new mongoose.Schema({
    numStudents: String,
    student1: String,
    student2: String,
    student3: String,
    student4: String,
    preferenceList: String
}, { timestamps: true });

const Student = mongoose.model('Student', studentRequestSchema);

module.exports = Student;

const mongoose = require('mongoose');

const clientRequestSchema = new mongoose.Schema({
    email: String,
    name: String,
    organization: String,
    presentation: String,
    project: String,
    description: String,
    term: String,
    isDecided: Boolean,
    isApproved: Boolean,
    isDeleted: Boolean,
    sentApproval: Boolean,
    sentDenial: Boolean,
    sentDeletion: Boolean,
    sentPitchSchedule: Boolean,
    status: String,
    selectedTimes: [String],
    presentationNote: String,
    presentationTime: String

}, { timestamps: true });

const Client = mongoose.model('Client', clientRequestSchema);

module.exports = Client;

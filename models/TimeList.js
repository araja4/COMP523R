const mongoose = require('mongoose');

const timeListRequestSchema = new mongoose.Schema({
    name: String,
    times: [String],
    current: Boolean

}, { timestamps: true });

const TimeList = mongoose.model('TimeList', timeListRequestSchema);

module.exports = TimeList;
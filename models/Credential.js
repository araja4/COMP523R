const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  emailAddress: String,
  clientID: String,
  clientSecret: String,
  refreshToken: String

}, { timestamps: true });

const Credential = mongoose.model('Credential', credentialSchema);

module.exports = Credential;

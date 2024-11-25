const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    homeOffered: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', required: true },
    homeRequested: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    rejectionTimestamp: { type: Date, required: false },
    timestamp: { type: Date, default: Date.now },
    
});

const Request = mongoose.model('Request', requestSchema);
module.exports = { Request };

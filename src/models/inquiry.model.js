const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterType: {
    type: String,
    enum: ['tenant', 'agent', 'landlord'],
    required: true
  },
  houseType: {
    type: String,
    required: true
  },
  unitSize: {
    type: String,
    required: true
  },
  county: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  checkInDate: {
    type: Date,
    required: true
  },
  checkOutDate: {
    type: Date,
    required: true
  },
  specialRequirements: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'expired'],
    default: 'active'
  },
  engagement: {
    inquiries: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full location
inquirySchema.virtual('location').get(function() {
  return `${this.ward}, ${this.county}`;
});

// Compound index for filtering and sorting
inquirySchema.index({ userId: 1, createdAt: -1 });
inquirySchema.index({ county: 1, ward: 1, houseType: 1, budget: 1 });

// Text index for search
inquirySchema.index({ 
  description: 'text', 
  county: 'text',
  ward: 'text',
  houseType: 'text',
  specialRequirements: 'text'
});

// Index for frequently accessed fields
inquirySchema.index({ status: 1 });
inquirySchema.index({ 'engagement.likes': -1 });
inquirySchema.index({ 'engagement.views': -1 });
inquirySchema.index({ requesterType: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry; 
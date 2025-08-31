const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['music', 'technology', 'arts', 'business', 'food', 'sports', 'education', 'entertainment']
  },
  type: {
    type: String,
    required: true,
    enum: ['festival', 'conference', 'workshop', 'exhibition', 'concert', 'competition', 'seminar']
  },
  standardPrice: {
    type: Number,
    required: true,
    min: 0
  },
  vipPrice: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    required: true
  },
  maxAttendees: {
    type: Number,
    default: 1000
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }
}, {
  timestamps: true
});

// Virtual for price display
eventSchema.virtual('price').get(function() {
  return `$${this.standardPrice}`;
});

// Index for search optimization
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ category: 1, type: 1 });
eventSchema.index({ standardPrice: 1 });
eventSchema.index({ location: 1 });

module.exports = mongoose.model('Event', eventSchema);

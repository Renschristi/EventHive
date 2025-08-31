const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  tickets: {
    standard: {
      quantity: { type: Number, default: 0 },
      price: { type: Number, default: 0 }
    },
    vip: {
      quantity: { type: Number, default: 0 },
      price: { type: Number, default: 0 }
    }
  },
  totalAmount: {
    type: Number,
    required: true
  },
  attendees: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    ticketType: { type: String, enum: ['standard', 'vip'], required: true },
    ticketNumber: { type: String, unique: true, sparse: true }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'stripe'],
    default: 'card'
  },
  paymentId: String,
  bookingReference: {
    type: String,
    required: true
  },
  qrCode: String,
  notes: String
}, {
  timestamps: true
});

// Generate booking reference before saving
bookingSchema.pre('save', function(next) {
  if (!this.bookingReference) {
    this.bookingReference = 'EH' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
  }
  next();
});

// Generate ticket numbers for attendees
bookingSchema.pre('save', function(next) {
  this.attendees.forEach((attendee, index) => {
    if (!attendee.ticketNumber) {
      attendee.ticketNumber = this.bookingReference + '-' + (index + 1).toString().padStart(3, '0');
    }
  });
  next();
});

// Index for efficient queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ event: 1, status: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);

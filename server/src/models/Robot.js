import mongoose from 'mongoose';

const robotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Robot name is required'],
    trim: true,
    unique: true,
  },
  platform: {
    type: String,
    enum: ['pocket_option', 'mt5'],
    required: true,
  },
  strategy: {
    type: String,
    enum: ['scalping', 'daily'],
    required: true,
  },
  status: {
    type: String,
    enum: ['running', 'paused', 'stopped', 'offline'],
    default: 'stopped',
  },
  config: {
    pairs: [{ type: String }],
    lotSize: { type: Number, default: 0.01 },
    maxOpenTrades: { type: Number, default: 3 },
    slPercent: { type: Number, default: 1 },
    tpPercent: { type: Number, default: 2 },
    gmtSessionFilter: [{
      type: String,
      enum: ['london', 'new_york', 'overlap'],
    }],
  },
  lastHeartbeat: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Virtual: check if robot is online (heartbeat within 2 minutes)
robotSchema.virtual('isOnline').get(function () {
  if (!this.lastHeartbeat) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return this.lastHeartbeat > twoMinutesAgo;
});

robotSchema.set('toJSON', { virtuals: true });
robotSchema.set('toObject', { virtuals: true });

robotSchema.index({ status: 1 });
robotSchema.index({ createdBy: 1 });

export const Robot = mongoose.model('Robot', robotSchema);

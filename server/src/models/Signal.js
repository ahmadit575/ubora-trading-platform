import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: [true, 'Trading pair is required'],
    trim: true,
    uppercase: true,
  },
  direction: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: [true, 'Direction is required'],
  },
  strategy: {
    type: String,
    enum: ['scalping', 'daily'],
    required: [true, 'Strategy is required'],
  },
  entryZone: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  stopLoss: {
    type: Number,
    required: [true, 'Stop loss is required'],
  },
  takeProfit: {
    type: Number,
    required: [true, 'Take profit is required'],
  },
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  platform: {
    type: String,
    enum: ['pocket_option', 'mt5'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'closed', 'cancelled'],
    default: 'pending',
  },
  gmtTimestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
  },
  generatedBy: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai',
  },
  tradeResult: {
    outcome: {
      type: String,
      enum: ['win', 'loss', 'breakeven'],
    },
    pips: { type: Number, default: 0 },
    usdtPnL: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Indexes for fast queries
signalSchema.index({ gmtTimestamp: -1, status: 1 });
signalSchema.index({ pair: 1, strategy: 1 });
signalSchema.index({ platform: 1, status: 1 });

export const Signal = mongoose.model('Signal', signalSchema);

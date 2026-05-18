import mongoose from 'mongoose';

const tradeLogSchema = new mongoose.Schema({
  signalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signal',
    required: true,
  },
  robotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Robot',
    default: null,
  },
  platform: {
    type: String,
    enum: ['pocket_option', 'mt5'],
    required: true,
  },
  openedAt: {
    type: Date,
    required: true,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  lotSize: {
    type: Number,
    default: 0.01,
  },
  usdtPnL: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
    maxlength: 500,
  },
}, {
  timestamps: true,
});

tradeLogSchema.index({ robotId: 1, openedAt: -1 });
tradeLogSchema.index({ signalId: 1 });

export const TradeLog = mongoose.model('TradeLog', tradeLogSchema);

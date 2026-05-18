import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  address: {
    type: String,
    required: [true, 'Wallet address is required'],
    trim: true,
  },
  network: {
    type: String,
    default: 'BSC',
    enum: ['BSC'],
  },
  usdtBalance: {
    type: Number,
    default: 0,
  },
  lastSynced: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

walletSchema.index({ userId: 1 });
walletSchema.index({ address: 1 });

export const Wallet = mongoose.model('Wallet', walletSchema);

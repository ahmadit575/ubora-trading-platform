import mongoose from 'mongoose';

const stakingPositionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contractAddress: {
    type: String,
    required: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['uborastaking', 'gbaty'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  apy: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'withdrawn'],
    default: 'active',
  },
}, {
  timestamps: true,
});

stakingPositionSchema.index({ userId: 1, status: 1 });

export const StakingPosition = mongoose.model('StakingPosition', stakingPositionSchema);

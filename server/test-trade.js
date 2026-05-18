import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Robot, Signal } from './src/models/index.js';
import { executePocketOptionTrade } from './src/services/pocketOptionService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://ubora_ai:Aa123456@ac-hhbnzut-shard-00-00.zoc1m0x.mongodb.net:27017,ac-hhbnzut-shard-00-01.zoc1m0x.mongodb.net:27017,ac-hhbnzut-shard-00-02.zoc1m0x.mongodb.net:27017/uboradb?ssl=true&replicaSet=atlas-13jafx-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testAutoTrade() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected successfully!');

  // 1. Fetch or create a running Pocket Option robot
  let robot = await Robot.findOne({ status: 'running', platform: 'pocket_option' });
  
  if (!robot) {
    console.log('⚠️ No active running Pocket Option robot found in MongoDB.');
    console.log('📝 Creating a temporary running robot for testing...');
    
    // Find any user to associate with
    const User = mongoose.model('User');
    const user = await User.findOne();
    if (!user) {
      console.error('❌ No user found in database! Please seed or register an admin user first.');
      process.exit(1);
    }

    robot = new Robot({
      name: 'PO-Demo-Tester',
      platform: 'pocket_option',
      strategy: 'scalping',
      status: 'running',
      config: {
        pairs: ['BTC/USDT', 'ETH/USDT'],
        lotSize: 15, // $15 trades
        maxOpenTrades: 3
      },
      createdBy: user._id
    });
    await robot.save();
    console.log(`🤖 Created active PO robot: ${robot.name}`);
  } else {
    console.log(`🤖 Using existing running Robot: ${robot.name} (Lot size: $${robot.config?.lotSize || 10})`);
  }

  // 2. Create a mock buy signal
  console.log('📡 Generating mock BTC/USDT BUY signal...');
  const signal = new Signal({
    pair: 'BTC/USDT',
    direction: 'BUY',
    strategy: 'scalping',
    entryZone: { min: 60000, max: 61000 },
    stopLoss: 59500,
    takeProfit: 62000,
    confidenceScore: 85, // 85% win probability
    platform: 'pocket_option',
    status: 'pending',
    gmtTimestamp: new Date(),
    generatedBy: 'ai'
  });
  await signal.save();
  console.log(`✅ Mock signal created with ID: ${signal._id}`);

  // 3. Mock socket.io for logging
  const mockIo = {
    emit: (event, data) => {
      console.log(`[Socket Broadcast] Event: ${event}`, JSON.stringify(data, null, 2));
    }
  };

  // 4. Trigger trade execution
  console.log('⚡ Starting Puppeteer browser automation execution (POCKET_OPTION_HEADLESS = false)...');
  await executePocketOptionTrade(robot, signal, mockIo);

  console.log('\n🎉 Test completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

testAutoTrade().catch(err => {
  console.error('❌ Error during testing:', err);
  mongoose.disconnect();
  process.exit(1);
});

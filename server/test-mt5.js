import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Robot, Signal, TradeLog } from './src/models/index.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://ubora_ai:Aa123456@ac-hhbnzut-shard-00-00.zoc1m0x.mongodb.net:27017,ac-hhbnzut-shard-00-01.zoc1m0x.mongodb.net:27017,ac-hhbnzut-shard-00-02.zoc1m0x.mongodb.net:27017/uboradb?ssl=true&replicaSet=atlas-13jafx-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testMT5Bridge() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected successfully!');

  // 1. Fetch or create a running MT5 robot
  let robot = await Robot.findOne({ status: 'running', platform: 'mt5' });
  
  if (!robot) {
    console.log('⚠️ No active running MT5 robot found in MongoDB.');
    console.log('📝 Creating a temporary running MT5 robot for testing...');
    
    // Find any user to associate with
    const User = mongoose.model('User');
    const user = await User.findOne();
    if (!user) {
      console.error('❌ No user found in database! Please register an admin user first.');
      process.exit(1);
    }

    robot = new Robot({
      name: 'MT5-Bridge-Tester',
      platform: 'mt5',
      strategy: 'scalping',
      status: 'running',
      config: {
        pairs: ['EUR/USD', 'GBP/USD'],
        lotSize: 0.1, // 0.1 Standard Lots
        maxOpenTrades: 2
      },
      createdBy: user._id
    });
    await robot.save();
    console.log(`🤖 Created active MT5 robot: ${robot.name}`);
  } else {
    console.log(`🤖 Using existing running MT5 Robot: ${robot.name} (Lot size: ${robot.config?.lotSize || 0.01} lots)`);
  }

  // 2. Create a mock pending MT5 signal
  console.log('\n📡 Generating mock EUR/USD BUY signal for MT5...');
  const signal = new Signal({
    pair: 'EUR/USD',
    direction: 'BUY',
    strategy: 'scalping',
    entryZone: { min: 1.08500, max: 1.08550 },
    stopLoss: 1.08000,
    takeProfit: 1.09500,
    confidenceScore: 90,
    platform: 'mt5',
    status: 'pending',
    gmtTimestamp: new Date(),
    generatedBy: 'ai'
  });
  await signal.save();
  console.log(`✅ Mock signal created! Signal ID: ${signal._id}`);

  console.log('\n=========================================');
  console.log('🔥 BRIDGE TESTING URLS');
  console.log('=========================================');
  console.log(`1. Copy this URL and open it in your browser (or run curl) to verify the MT5 EA Poll:`);
  console.log(`👉 http://localhost:3001/api/mt5/signals?robotId=${robot._id}`);
  console.log('\n2. Inside MT5 EA, config params should be:');
  console.log(`   - Robot ID: "${robot._id}"`);
  console.log(`   - Server URL: "http://localhost:3001/api/mt5"`);
  console.log('=========================================\n');

  console.log('Press Ctrl+C to close this test script once you are done checking the URL.');
  
  // Hold connection open for them to hit URL
  await new Promise(() => {});
}

testMT5Bridge().catch(err => {
  console.error('❌ Error during testing:', err);
  mongoose.disconnect();
  process.exit(1);
});

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const validKey = process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 64 || process.env.PRIVATE_KEY?.length === 66 ? [process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : '0x' + process.env.PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    bsctest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: validKey
    },
    bscmain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: validKey
    }
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY
  }
};

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Official BSC Mainnet USDT Token
const BSC_MAINNET_USDT = "0x55d398326f99059fF775485246999027B3197955";

module.exports = buildModule("UboraStakingModule", (m) => {
  // Use the real BSC Mainnet USDT address
  const usdtAddress = m.getParameter("usdtAddress", BSC_MAINNET_USDT);

  const uboraStaking = m.contract("UboraStaking", [usdtAddress]);

  return { uboraStaking };
});

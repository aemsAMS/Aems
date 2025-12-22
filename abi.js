const PRESALE_ADDRESS = "0xa6452a6d7d399dd2b1d2c5e237eabd9c1c00379f";

const PRESALE_ABI = [
  "function buyWithBNB() payable",
  "function buyWithUSDT(uint256)",
  "function claimTokens()",
  "function getPresaleAllocation() view returns(uint256)",
  "function getSold() view returns(uint256)",
  "function tokensLeft() view returns(uint256)",
  "function buyers(address) view returns(uint256,uint256)",
  "function claimable(address) view returns(uint256)",
  "function priceFeed() view returns(address)",
  "function owner() view returns(address)"
];

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function allowance(address,address) view returns(uint256)",
  "function balanceOf(address) view returns(uint256)",
  "function decimals() view returns(uint8)"
];

const AGG_ABI = [
  "function latestRoundData() view returns(uint80,int256,uint256,uint256,uint80)"
];

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

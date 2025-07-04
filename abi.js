
const CONTRACT_ADDRESS = "0xc2a1754cb038c090783531e3285238076c90e61d";
const TOKEN_ADDRESS = "0x259115680169276d0e4286acba362460456697c5";
const ABI = [
  {
    "inputs": [],
    "name": "entryFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "setupRules",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint8", "name": "element", "type": "uint8" }],
    "name": "play",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "forfeit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "games",
    "outputs": [
      { "internalType": "address", "name": "player1", "type": "address" },
      { "internalType": "address", "name": "player2", "type": "address" },
      { "internalType": "uint8[3]", "name": "p1Choices", "type": "uint8[3]" },
      { "internalType": "uint8[3]", "name": "p2Choices", "type": "uint8[3]" },
      { "internalType": "uint8", "name": "round", "type": "uint8" },
      { "internalType": "uint8", "name": "p1Wins", "type": "uint8" },
      { "internalType": "uint8", "name": "p2Wins", "type": "uint8" },
      { "internalType": "uint256", "name": "lastMoveTime", "type": "uint256" },
      { "internalType": "bool", "name": "isFinished", "type": "bool" },
      { "internalType": "address", "name": "winner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];


// main-debug.js
let playerAddress;
let opponentChoice = null;
let playerChoice = null;
let currentRound = 1;
let score = { player: 0, opponent: 0 };

const CONTRACT_ADDRESS = "0xc2a1754cb038c090783531e3285238076c90e61d";
const TOKEN_ADDRESS = "0x259115680169276d0e4286acba362460456697c5";

const choices = ["آب", "آتش", "درخت", "سنگ", "سم"];

console.log("📦 Script Loaded...");

async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      playerAddress = accounts[0];
      console.log("✅ Wallet Connected:", playerAddress);
    } catch (err) {
      console.error("❌ Wallet connection error:", err);
    }
  } else {
    alert("MetaMask not found!");
  }
}

function waitForOpponent() {
  console.log("⏳ Waiting for opponent to join...");
}

function startGame() {
  console.log("🚀 Game started");
  currentRound = 1;
  score = { player: 0, opponent: 0 };
  updateRoundUI();
}

function updateRoundUI() {
  console.log(`📢 Round ${currentRound} Started`);
}

function makeChoice(index) {
  playerChoice = index;
  console.log(`🧍 Player chose: ${choices[index]}`);
  sendChoiceToOpponent(index);
}

function receiveChoice(index) {
  opponentChoice = index;
  console.log(`👤 Opponent chose: ${choices[index]}`);
  evaluateRound();
}

function evaluateRound() {
  if (playerChoice === null || opponentChoice === null) {
    console.log("⌛ Waiting for both choices...");
    return;
  }

  const result = determineWinner(playerChoice, opponentChoice);
  if (result === "player") score.player++;
  else if (result === "opponent") score.opponent++;

  console.log("✅ Round result:", result);
  console.log("🎯 Score:", score);

  if (currentRound < 3) {
    currentRound++;
    playerChoice = null;
    opponentChoice = null;
    updateRoundUI();
  } else {
    declareFinalWinner();
  }
}

function determineWinner(p1, p2) {
  if (p1 === p2) return "draw";
  if (
    (p1 === 0 && p2 === 1) || // آب < آتش
    (p1 === 1 && p2 === 2) || // آتش < درخت
    (p1 === 2 && p2 === 0) || // درخت < آب
    (p1 === 3 && p2 === 2) || // سنگ < درخت
    (p1 === 4 && p2 === 0)    // سم < آب
  ) return "opponent";
  return "player";
}

function declareFinalWinner() {
  console.log("🏁 Game finished");
  if (score.player > score.opponent) {
    console.log("🎉 You win!");
  } else if (score.player < score.opponent) {
    console.log("💀 You lost.");
  } else {
    console.log("🤝 Draw.");
  }
}

let playerProgress = 0;
let opponentProgress = 0;
let expectingKey = "a";
let gameId;
let inSlippery = false;

const totalSteps = 35;
const slipperyPercent = 16;
let slipperyStart = Math.floor(Math.random() * (totalSteps - Math.ceil(totalSteps * slipperyPercent / 100)));
let slipperyEnd = slipperyStart + Math.ceil(totalSteps * slipperyPercent / 100);

function startGameLogic() {
  gameId = null;
  playerProgress = 0;
  opponentProgress = 0;
  updateCarPositions();
  window.addEventListener("keydown", handleKeyPress);
}

function handleKeyPress(e) {
  if ((expectingKey === "a" && e.key.toLowerCase() === "a") || (expectingKey === "l" && e.key.toLowerCase() === "l")) {
    playerProgress++;
    expectingKey = expectingKey === "a" ? "l" : "a";

    if (playerProgress >= slipperyStart && playerProgress <= slipperyEnd) {
      if (!inSlippery) {
        inSlippery = true;
        document.querySelector(".track").style.background = "#66ccff";
        document.getElementById("slipWarning").innerText = "⚠️ Slippery Zone!";
      }
      if (Math.random() < 0.25) {
        playerProgress = Math.max(0, playerProgress - 1);
      }
    } else if (inSlippery) {
      inSlippery = false;
      document.querySelector(".track").style.background = "#444";
      document.getElementById("slipWarning").innerText = "✅ Stable Ground";
    }

    updateCarPositions();

    if (playerProgress >= totalSteps) {
      endGame();
    }
  }
}

function updateCarPositions() {
  const trackWidth = document.querySelector(".track").clientWidth;
  const stepWidth = (trackWidth - 60) / totalSteps;
  document.querySelector(".car.player1").style.left = `${playerProgress * stepWidth}px`;
  document.querySelector(".car.player2").style.left = `${opponentProgress * stepWidth}px`;
}

async function endGame() {
  window.removeEventListener("keydown", handleKeyPress);
  const playerGameId = await contract.methods.playerToGame(account).call();
  await contract.methods.declareWinner(playerGameId, account).send({ from: account });
  document.getElementById("winnerMessage").innerText = "🎉 You Win! Prize will be transferred!";
  document.getElementById("winnerMessage").style.display = "block";
}

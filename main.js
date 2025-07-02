let web3;
let contract;
let account;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
  } else {
    alert("Please install MetaMask to use this game.");
    return;
  }

  document.getElementById("connectWallet").onclick = async () => {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];
    contract = new web3.eth.Contract(contractABI, contractAddress);

    document.getElementById("connectWallet").style.display = "none";
    document.getElementById("startGame").style.display = "inline-block";
  };

  document.getElementById("startGame").onclick = async () => {
    try {
      const entryAmount = await contract.methods.entryAmount().call();
      const tokenAddress = await contract.methods.tokenAddress().call();
      const token = new web3.eth.Contract([
        { "constant": false, "inputs": [
          { "name": "_spender", "type": "address" },
          { "name": "_value", "type": "uint256" }
        ], "name": "approve", "outputs": [
          { "name": "", "type": "bool" }
        ], "type": "function" }
      ], tokenAddress);

      await token.methods.approve(contractAddress, entryAmount).send({ from: account });
      await contract.methods.joinGame().send({ from: account });

      document.getElementById("startGame").style.display = "none";
      document.getElementById("waitingArea").style.display = "block";

      // Polling to check if opponent joined
      const gameId = await contract.methods.playerToGame(account).call();
      const interval = setInterval(async () => {
        const game = await contract.methods.games(gameId).call();
        if (game.player2 !== "0x0000000000000000000000000000000000000000") {
          clearInterval(interval);
          document.getElementById("waitingArea").style.display = "none";
          startCountdown();
        }
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Transaction failed.");
    }
  };
});

function startCountdown() {
  document.getElementById("countdown").style.display = "block";
  let count = 3;
  const interval = setInterval(() => {
    count--;
    document.getElementById("count").innerText = count;
    if (count === 0) {
      clearInterval(interval);
      document.getElementById("countdown").style.display = "none";
      document.getElementById("raceArea").style.display = "block";
      startGameLogic();
    }
  }, 1000);
}

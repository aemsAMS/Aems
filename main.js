
let web3;
let contract;
let token;
let account;

async function connectWallet() {
  if (window.ethereum) {
    await ethereum.request({ method: 'eth_requestAccounts' });
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];
    document.getElementById("wallet-address").innerText = "Wallet: " + account;
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    token = new web3.eth.Contract([
      { "name":"balanceOf", "type":"function", "inputs":[{"name":"account","type":"address"}], "outputs":[{"name":"","type":"uint256"}], "stateMutability":"view" },
      { "name":"approve", "type":"function", "inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}], "outputs":[{"name":"","type":"bool"}], "stateMutability":"nonpayable" }
    ], TOKEN_ADDRESS);

    let balance = await token.methods.balanceOf(account).call();
    document.getElementById("token-balance").innerText = "Balance: " + web3.utils.fromWei(balance) + " LGD";
  }
}

async function startGame() {
  const entryFee = web3.utils.toWei("1000");
  try {
    document.getElementById("game-status").innerText = "Approving tokens...";
    await token.methods.approve(CONTRACT_ADDRESS, entryFee).send({ from: account });

    document.getElementById("game-status").innerText = "Joining game...";
    await contract.methods.joinGame().send({ from: account });

    document.getElementById("game-status").innerText = "Game started! Make your choice...";
    document.getElementById("game-area").style.display = "block";
  } catch (err) {
    console.error(err);
    document.getElementById("game-status").innerText = "Error: " + err.message;
  }
}

async function makeChoice(index) {
  try {
    await contract.methods.play(index).send({ from: account });
    document.getElementById("round-result").innerText = "You chose: " + ["Fire", "Water", "Tree", "Earth", "Stone"][index];
  } catch (err) {
    document.getElementById("round-result").innerText = "Error: " + err.message;
  }
}

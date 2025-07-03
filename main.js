let web3;
let account;
let tokenContract;
let gameContract;
let gameId;
let peer;
let conn;
let isHost = false;
let position1 = 0;
let position2 = 0;
let lastKey = "";

const car1 = document.getElementById("car1");
const car2 = document.getElementById("car2");
const startButton = document.getElementById("startButton");
const connectWallet = document.getElementById("connectWallet");
const walletInfo = document.getElementById("walletInfo");
const gameArea = document.getElementById("gameArea");
const countdown = document.getElementById("countdown");
const result = document.getElementById("result");

async function initWeb3() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];

    tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    gameContract = new web3.eth.Contract(contractABI, contractAddress);

    const balance = await tokenContract.methods.balanceOf(account).call();
    const humanReadable = web3.utils.fromWei(balance, 'ether');
    walletInfo.innerText = `Connected: ${account} | Balance: ${humanReadable} TOKEN`;
  } else {
    alert("Please install MetaMask!");
  }
}

connectWallet.onclick = initWeb3;

startButton.onclick = async () => {
  startButton.disabled = true;

  const balance = await tokenContract.methods.balanceOf(account).call();
  if (Number(balance) < 1000e18) {
    alert("Insufficient token balance");
    return;
  }

  await tokenContract.methods.approve(contractAddress, 1000e18).send({ from: account });
  await tokenContract.methods.transferFrom(account, contractAddress, 1000e18).send({ from: account });
  await gameContract.methods.joinGame().send({ from: account });

  const gameIdValue = await gameContract.methods.getCurrentGameId().call();
  gameId = Number(gameIdValue) - 1;

  alert("Waiting for another player...");
  waitForPeer();
};

function waitForPeer() {
  peer = new Peer();

  peer.on('open', (id) => {
    console.log("Peer ID:", id);
    isHost = true;
    peer.on('connection', (c) => {
      conn = c;
      conn.on('data', onDataReceived);
      startCountdown();
    });
  });

  setTimeout(() => {
    if (!conn) {
      const hostId = prompt("Enter opponent's Peer ID:");
      conn = peer.connect(hostId);
      conn.on('open', () => {
        conn.on('data', onDataReceived);
        startCountdown();
      });
    }
  }, 3000);
}

function startCountdown() {
  gameArea.style.display = 'block';
  let counter = 3;
  countdown.innerText = counter;
  const interval = setInterval(() => {
    counter--;
    countdown.innerText = counter;
    if (counter === 0) {
      clearInterval(interval);
      countdown.innerText = '';
      enableGame();
    }
  }, 1000);
}

function enableGame() {
  document.addEventListener("keydown", (e) => {
    const key = e.key.toUpperCase();
    if ((lastKey === "" && key === "A") || (lastKey === "A" && key === "L") || (lastKey === "L" && key === "A")) {
      position1 += 10;
      car1.style.left = position1 + "px";
      lastKey = key;
      if (conn) conn.send({ position: position1 });
      if (position1 >= 500) {
        declareWinner();
      }
    }
  });
}

function onDataReceived(data) {
  if (data.position !== undefined) {
    position2 = data.position;
    car2.style.left = position2 + "px";
  }
}

async function declareWinner() {
  result.innerText = "You Win! 🎉";
  await gameContract.methods.declareWinner(gameId, account).send({ from: account });
  setTimeout(() => location.reload(), 5000);
}

function simulateKey(k) {
  const evt = new KeyboardEvent("keydown", { key: k });
  document.dispatchEvent(evt);
}

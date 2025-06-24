const web3 = new Web3(window.ethereum);
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap V2
const owner = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";

const routerAbi = [
  {
    "constant": true,
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "name": "amounts", "type": "uint256[]" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const accounts = await web3.eth.getAccounts();
  document.getElementById("walletAddress").innerText = accounts[0];
}

async function loadTokens() {
  const tokenInSelect = document.getElementById("tokenIn");
  const tokenOutSelect = document.getElementById("tokenOut");
  tokens.forEach(token => {
    const optionIn = document.createElement("option");
    optionIn.value = token.address;
    optionIn.text = token.symbol;
    tokenInSelect.appendChild(optionIn);

    const optionOut = document.createElement("option");
    optionOut.value = token.address;
    optionOut.text = token.symbol;
    tokenOutSelect.appendChild(optionOut);
  });
}

async function updateRate() {
  const from = document.getElementById("tokenIn").value;
  const to = document.getElementById("tokenOut").value;
  const amount = parseFloat(document.getElementById("amountIn").value);
  if (!amount || isNaN(amount)) return;

  const token = tokens.find(t => t.address === from);
  const amountInWei = web3.utils.toBN(amount * 10 ** token.decimals);

  const contract = new web3.eth.Contract(routerAbi, routerAddress);
  const path = [from, to];

  try {
    const amounts = await contract.methods.getAmountsOut(amountInWei.toString(), path).call();
    const outToken = tokens.find(t => t.address === to);
    const amountOut = amounts[1] / (10 ** outToken.decimals);
    document.getElementById("amountOut").value = parseFloat(amountOut).toFixed(6);
  } catch (err) {
    document.getElementById("amountOut").value = "Error";
  }
}

async function swapTokens() {
  const accounts = await web3.eth.getAccounts();
  const from = document.getElementById("tokenIn").value;
  const to = document.getElementById("tokenOut").value;
  const amount = parseFloat(document.getElementById("amountIn").value);
  const token = tokens.find(t => t.address === from);
  const amountInWei = web3.utils.toBN(amount * 10 ** token.decimals);

  const fee = amountInWei.div(web3.utils.toBN(1000)).mul(web3.utils.toBN(6)); // 0.6%
  const realAmount = amountInWei.sub(fee);

  const erc20 = new web3.eth.Contract([
    {
      "constant": false,
      "inputs": [
        { "name": "_spender", "type": "address" },
        { "name": "_value", "type": "uint256" }
      ],
      "name": "approve",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        { "name": "_to", "type": "address" },
        { "name": "_value", "type": "uint256" }
      ],
      "name": "transfer",
      "type": "function"
    }
  ], from);

  await erc20.methods.approve(routerAddress, amountInWei.toString()).send({ from: accounts[0] });
  await erc20.methods.transfer(owner, fee.toString()).send({ from: accounts[0] });

  const contract = new web3.eth.Contract(routerAbi, routerAddress);
  const path = [from, to];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  await contract.methods.swapExactTokensForTokens(
    realAmount.toString(), 1, path, accounts[0], deadline
  ).send({ from: accounts[0] });
}

document.getElementById("connectWallet").onclick = connectWallet;
document.getElementById("swapButton").onclick = swapTokens;
document.getElementById("amountIn").addEventListener("input", updateRate);
document.getElementById("tokenIn").addEventListener("change", updateRate);
document.getElementById("tokenOut").addEventListener("change", updateRate);
window.onload = loadTokens;

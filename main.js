const $ = id => document.getElementById(id);

let provider, signer, presale, userAddress;
let web3Modal;

const BSC_CHAIN_ID = 56;
const PRICE_USD = 0.007;

window.addEventListener("load", () => {
  initWeb3Modal();
  initReadOnly();
  bindUI();
  refreshUI();
  setInterval(refreshUI, 10000);
});

function initWeb3Modal(){
  web3Modal = new window.Web3Modal.default({
    cacheProvider:false,
    providerOptions:{
      walletconnect:{
        package:window.WalletConnectProvider.default,
        options:{
          rpc:{56:"https://bsc-dataseed.binance.org/"},
          chainId:56
        }
      }
    }
  });
}

function bindUI(){
  $("connectWallet").onclick = connectWallet;
  $("buyBNBBtn").onclick = buyWithBNB;
  $("buyUSDTBtn").onclick = buyWithUSDT;
  $("claimBtn").onclick = claimTokens;
}

function initReadOnly(){
  provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
  presale = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, provider);
}

async function connectWallet(){
  const instance = await web3Modal.connect();
  provider = new ethers.providers.Web3Provider(instance,"any");
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  const net = await provider.getNetwork();
  if(net.chainId !== BSC_CHAIN_ID){
    alert("Switch to BNB Smart Chain");
    return;
  }

  presale = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);
  $("walletAddr").innerText = short(userAddress);

  instance.on("accountsChanged",disconnect);
  instance.on("chainChanged",disconnect);

  await refreshUI();
}

function disconnect(){
  userAddress=null;
  signer=null;
  initReadOnly();
  $("walletAddr").innerText="Not connected";
}

async function refreshUI(){
  try{
    const alloc = await presale.getPresaleAllocation();
    const sold = await presale.getSold();
    const pct = alloc.isZero()?0:sold.mul(100).div(alloc).toNumber();
    $("progressFill").style.width = Math.min(pct,100)+"%";

    if(userAddress){
      const b = await presale.buyers(userAddress);
      $("myPurchased").innerText = fmt(b.purchased);
      $("myClaimable").innerText = fmt(await presale.claimable(userAddress));
    }
  }catch{}
}

async function buyWithUSDT(){
  if(!signer) return alert("Connect wallet");
  const usd = $("usdInput").value;
  if(!usd) return;

  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
  const dec = await usdt.decimals();
  const amt = ethers.utils.parseUnits(usd,dec);

  if((await usdt.allowance(userAddress,PRESALE_ADDRESS)).lt(amt)){
    await (await usdt.approve(PRESALE_ADDRESS,amt)).wait();
  }

  await (await presale.buyWithUSDT(amt)).wait();
  alert("USDT purchase successful");
  refreshUI();
}

async function buyWithBNB(){
  if(!signer) return alert("Connect wallet");
  const usd = $("usdInput").value;
  if(!usd) return;

  const feed = new ethers.Contract(await presale.priceFeed(),AGG_ABI,provider);
  const [,price] = await feed.latestRoundData();

  const usd18 = ethers.utils.parseUnits(usd,18);
  const weiVal = usd18.mul(ethers.constants.WeiPerEther).div(price.mul(1e10));

  await (await presale.buyWithBNB({value:weiVal})).wait();
  alert("BNB purchase successful");
  refreshUI();
}

async function claimTokens(){
  if(!signer) return;
  await (await presale.claimTokens()).wait();
  alert("Claim successful");
  refreshUI();
}

function fmt(bn){
  return Number(ethers.utils.formatUnits(bn,18)).toLocaleString();
}
function short(a){
  return a.slice(0,6)+"..."+a.slice(-4);
}

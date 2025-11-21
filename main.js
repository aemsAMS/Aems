if (!window.ethers) { alert("Ethers.js not loaded"); }
const $ = id => document.getElementById(id);

let provider = null;
let signer = null;
let presale = null;
let userAddress = null;
let bannerIndex = 0;

const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI;
const AGG = AGG_ABI;
const USDT = USDT_ADDRESS;
const PRICE_USD = 0.007;

window.addEventListener('load', async () => {
  $('connectWallet').addEventListener('click', connectWallet);
  $('buyUSDTBtn').addEventListener('click', buyWithUSDT);
  $('buyBNBBtn').addEventListener('click', buyWithBNB);
  $('claimBtn').addEventListener('click', claimTokens);
  $('endPresaleBtn').addEventListener('click', endPresaleManually);
  $('withdrawBNBBtn').addEventListener('click', withdrawBNB);
  $('withdrawUSDTBtn').addEventListener('click', withdrawUSDT);
  $('withdrawUnsoldBtn').addEventListener('click', withdrawUnsold);
  $('destroyBtn').addEventListener('click', destroyContract);
  $('bannerNext').addEventListener('click', ()=> shiftBanner(1));
  $('bannerPrev').addEventListener('click', ()=> shiftBanner(-1));
  $('usdInput')?.addEventListener('input', estimate);
  setInterval(()=> shiftBanner(1),6000);

  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
    window.ethereum?.on('accountsChanged', ()=> location.reload());
    window.ethereum?.on('chainChanged', ()=> location.reload());
  } else {
    provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
  }

  $('contractLink').href = `https://bscscan.com/address/${PRESALE.address}`;
  $('contractLink').innerText = PRESALE.address;
  $('contractAddr').innerText = PRESALE.address;

  await refreshUI();
  setInterval(refreshUI,10000);
});

// Banner
function shiftBanner(dir){
  const inner = $('bannerInner');
  const items = inner.querySelectorAll('.banner-item');
  bannerIndex = (bannerIndex+dir+items.length)%items.length;
  const w = items[0].clientWidth + 10;
  inner.style.transform = `translateX(-${bannerIndex*w}px)`;
}

// Wallet
async function connectWallet(){
  try {
    if (!window.ethereum) throw new Error("No wallet detected");
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    presale = presale.connect(signer);
    $('walletAddr').innerText = short(userAddress);

    const chainId = await provider.send("eth_chainId", []);
    if(chainId !== '0x38') await provider.send('wallet_switchEthereumChain', [{ chainId:'0x38' }]);

    const owner = await presale.owner();
    if(owner.toLowerCase()===userAddress.toLowerCase()) showAdmin(true);
    else showAdmin(false);
    $('ownerAddr').innerText = owner;

    await refreshUI();
  } catch(e){ console.error(e); alert('Connect failed: '+e.message); }
}

function showAdmin(show){ $('adminPanel').style.display = show?'block':'none'; }
function short(a){ return a? a.slice(0,6)+'...'+a.slice(-4) : '—'; }

// UI Refresh
async function refreshUI(){
  try {
    const [alloc,sold,left,raisedUSDT,raisedBNBUSD,ended] = await Promise.all([
      presale.getPresaleAllocation(),
      presale.getSold(),
      presale.tokensLeft(),
      presale.getTotalRaisedUSDT(),
      presale.getTotalRaisedBNBUSD(),
      presale.isPresaleEnded()
    ]);
    $('alloc').innerText = Number(ethers.utils.formatUnits(alloc,18)).toLocaleString();
    $('sold').innerText = Number(ethers.utils.formatUnits(sold,18)).toLocaleString();
    $('left').innerText = Number(ethers.utils.formatUnits(left,18)).toLocaleString();
    $('raisedUSDT').innerText = Number(ethers.utils.formatUnits(raisedUSDT,18)).toFixed(2)+' USDT';
    $('raisedBNBUSD').innerText = Number(ethers.utils.formatUnits(raisedBNBUSD,18)).toFixed(2)+' USD';
    $('presaleStatus').innerText = ended?"Ended":"Active";

    if(userAddress){
      const buyer = await presale.buyers(userAddress);
      const claimable = await presale.claimable(userAddress);
      $('myPurchased').innerText = Number(ethers.utils.formatUnits(buyer.purchased,18)).toLocaleString();
      $('myClaimed').innerText = Number(ethers.utils.formatUnits(buyer.claimed,18)).toLocaleString();
      $('myClaimable').innerText = Number(ethers.utils.formatUnits(claimable,18)).toLocaleString();
      const vestStart = await presale.getVestingStart();
      $('nextUnlock').innerText = vestStart>0?new Date(vestStart*1000).toLocaleString():'—';
    }
  } catch(e){ console.error(e); }
}

// Estimate
async function estimate(){
  const usd = Number($('usdInput').value||0);
  if(!usd||usd<=0){ $('estTokens').innerText='—'; $('estBNB').innerText='—'; return; }
  $('estTokens').innerText = (usd/PRICE_USD).toLocaleString(undefined,{maximumFractionDigits:6});
}

// Buy functions
async function buyWithUSDT(){
  try {
    if(!signer) return alert('Connect wallet first');
    const usd = $('usdInput').value; if(!usd||usd<=0)return alert('Enter USD amount');
    const usd18 = ethers.utils.parseUnits(usd,18);
    const usdt = new ethers.Contract(USDT, ERC20, signer);
    const allowance = await usdt.allowance(userAddress,PRESALE.address);
    if(allowance.lt(usd18)) await (await usdt.approve(PRESALE.address,usd18)).wait();
    await (await presale.buyWithUSDT(usd18)).wait();
    alert('USDT purchase successful'); await refreshUI();
  } catch(e){ console.error(e); alert('Buy USDT failed: '+e.message); }
}

async function buyWithBNB(){
  try {
    if(!signer) return alert('Connect wallet first');
    const usd = Number($('usdInput').value); if(!usd||usd<=0) return alert('Enter USD amount');

    const feedAddr = await presale.priceFeed();
    const agg = new ethers.Contract(feedAddr, AGG, provider);
    const rd = await agg.latestRoundData(); const answer = rd[1];
    const bnbPrice18 = ethers.BigNumber.from(answer.toString()).mul(ethers.BigNumber.from("10000000000"));
    const usd18 = ethers.utils.parseUnits(String(usd),18);
    const weiNeeded = usd18.mul(ethers.constants.WeiPerEther).div(bnbPrice18);
    await (await presale.buyWithBNB({value:weiNeeded})).wait();
    alert('BNB purchase successful'); await refreshUI();
  } catch(e

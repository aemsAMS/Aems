// main.js - Final Version
if (!window.ethers) {
  alert("Ethers.js not loaded. Make sure you included ethers.umd.min.js");
}

// helper
const $ = id => document.getElementById(id);

// state
let provider = null;
let signer = null;
let presale = null;
let userAddress = null;
let bannerIndex = 0;

// constants (باید از abi.js و آدرس ها بیاوری)
const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI;
const USDT_ADDRESS = USDT_ADDRESS;
const PRICE_USD = 0.007; // fixed price

// --- Init ---
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

  setInterval(()=> shiftBanner(1), 6000);

  // provider init
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
    window.ethereum?.on('accountsChanged', ()=> location.reload());
    window.ethereum?.on('chainChanged', ()=> location.reload());
  } else {
    provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
    console.warn("No wallet detected - read-only");
  }

  $('contractLink').href = `https://bscscan.com/address/${PRESALE.address}`;
  $('contractLink').innerText = PRESALE.address;
  $('contractAddr').innerText = PRESALE.address;

  await refreshUI();
  setInterval(refreshUI, 10000);
});

// --- Banner ---
function shiftBanner(dir) {
  const inner = $('bannerInner');
  const items = inner.querySelectorAll('.banner-item');
  bannerIndex = (bannerIndex + dir + items.length) % items.length;
  const w = items[0].clientWidth + 10;
  inner.style.transform = `translateX(-${bannerIndex * w}px)`;
}

// --- Wallet ---
async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("No web3 wallet found.");

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No accounts found");
    userAddress = accounts[0];

    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    signer = provider.getSigner();
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, signer);

    $('walletAddr').innerText = short(userAddress);

    // switch to BSC Mainnet if needed
    const chainId = await provider.send("eth_chainId", []);
    if (chainId !== '0x38') {
      try { await provider.send('wallet_switchEthereumChain', [{ chainId: '0x38' }]); }
      catch(e){ alert("Switch wallet to BSC Mainnet (chainId 56)"); }
    }

    // admin check
    try {
      const owner = await presale.owner();
      if (owner && owner.toLowerCase() === userAddress.toLowerCase()) {
        showAdmin(true);
        $('ownerAddr').innerText = owner;
      } else showAdmin(false);
    } catch(e){ console.warn('owner read failed', e); showAdmin(false); }

    await refreshUI();
  } catch(err) {
    console.error(err);
    alert("Connect failed: "+extractErrorMessage(err));
  }
}

function showAdmin(show){ const p=$('adminPanel'); if(p)p.style.display=show?'block':'none'; }
function shortAddr(a){ return a ? a.slice(0,6)+'...'+a.slice(-4) : '—'; }
function short(a){ return shortAddr(a); }
function extractErrorMessage(err){ return err?.data?.message || err?.message || err; }

// --- UI Refresh ---
async function refreshUI() {
  if(!presale) return;

  try {
    const sold = await presale.soldTokens();
    const left = await presale.remainingTokens();
    const raisedUSDT = await presale.raisedUSDT();
    const raisedBNB = await presale.raisedBNB();
    const presaleOpen = await presale.presaleOpen();

    $('sold').innerText = ethers.utils.formatUnits(sold,18);
    $('left').innerText = ethers.utils.formatUnits(left,18);
    $('raisedUSDT').innerText = ethers.utils.formatUnits(raisedUSDT,18);
    $('raisedBNBUSD').innerText = ethers.utils.formatUnits(raisedBNB,18);
    $('presaleStatus').innerText = presaleOpen ? 'Open' : 'Closed';

    const progress = 100*(sold.toNumber()/(sold.add(left)).toNumber());
    $('progressFill').style.width = progress+'%';

    if(userAddress){
      const purchased = await presale.purchased(userAddress);
      const claimed = await presale.claimed(userAddress);
      const claimable = await presale.claimable(userAddress);
      $('myPurchased').innerText = ethers.utils.formatUnits(purchased,18);
      $('myClaimed').innerText = ethers.utils.formatUnits(claimed,18);
      $('myClaimable').innerText = ethers.utils.formatUnits(claimable,18);
      const next = await presale.nextUnlockTime(userAddress);
      $('nextUnlock').innerText = new Date(next*1000).toLocaleString();
    }

  } catch(e){ console.warn('refreshUI error', e); }
}

// --- Estimate ---
function estimate(){
  const val = parseFloat($('usdInput').value || 0);
  const tokens = val/PRICE_USD;
  $('estTokens').innerText = tokens.toFixed(2);
  const estBNB = val/250; // مثال قیمت BNB/USD = 250
  $('estBNB').innerText = estBNB.toFixed(4);
}

// --- Buy ---
async function buyWithUSDT(){
  if(!signer){ alert("Connect wallet first"); return; }
  const val = parseFloat($('usdInput').value || 0);
  if(val<=0){ alert("Enter amount"); return; }

  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20, signer);
  const amount = ethers.utils.parseUnits(val.toString(),18);
  try{
    const allowance = await usdt.allowance(userAddress, PRESALE.address);
    if(allowance.lt(amount)){
      const approveTx = await usdt.approve(PRESALE.address, amount);
      await approveTx.wait();
    }
    const tx = await presale.buyWithUSDT(amount);
    await tx.wait();
    alert("Purchased successfully!");
    await refreshUI();
  }catch(e){ alert("Buy failed: "+extractErrorMessage(e)); }
}

async function buyWithBNB(){
  if(!signer){ alert("Connect wallet first"); return; }
  const val = parseFloat($('usdInput').value || 0);
  if(val<=0){ alert("Enter amount"); return; }
  const amountBNB = ethers.utils.parseEther((val/250).toFixed(8)); // فرض 1 BNB = 250 USD
  try{
    const tx = await presale.buyWithBNB({ value: amountBNB });
    await tx.wait();
    alert("Purchased successfully!");
    await refreshUI();
  }catch(e){ alert("Buy failed: "+extractErrorMessage(e)); }
}

// --- Claim ---
async function claimTokens(){
  if(!signer){ alert("Connect wallet first"); return; }
  try{
    const tx = await presale.claim();
    await tx.wait();
    alert("Claimed successfully!");
    await refreshUI();
  }catch(e){ alert("Claim failed: "+extractErrorMessage(e)); }
}

// --- Admin ---
async function endPresaleManually(){ await sendAdminTx(()=>presale.forceEndPresale()); }
async function withdrawBNB(){ await sendAdminTx(()=>presale.withdrawBNB()); }
async function withdrawUSDT(){ await sendAdminTx(()=>presale.withdrawUSDT()); }
async function withdrawUnsold(){ await sendAdminTx(()=>presale.withdrawUnsold()); }
async function destroyContract(){ await sendAdminTx(()=>presale.destroy()); }

async function sendAdminTx(fn){
  if(!signer){ alert("Connect wallet first"); return; }
  try{
    const tx = await fn();
    await tx.wait();
    alert("Admin action executed!");
    await refreshUI();
  }catch(e){ alert("Admin action failed: "+extractErrorMessage(e)); }
}

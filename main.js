// main.js (final)
if (!window.ethers) {
  alert("Ethers.js not loaded. Make sure you included ethers.umd.min.js");
}

// helper by id
const $ = id => document.getElementById(id);

// state
let provider = null;
let signer = null;
let presale = null;
let userAddress = null;
let bannerIndex = 0;

// constants
const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI;
const AGG = AGG_ABI;
const USDT = USDT_ADDRESS;
const PRICE_USD = 0.007; // fixed price

// init
window.addEventListener('load', async () => {
  // UI wiring
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
    // fallback RPC read-only
    provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
    console.warn("No wallet detected - read-only");
  }

  // set contract link
  $('contractLink').href = `https://bscscan.com/address/${PRESALE.address}`;
  $('contractLink').innerText = PRESALE.address;
  $('contractAddr').innerText = PRESALE.address;

  await refreshUI();
  setInterval(refreshUI, 10000);
});

// banners
function shiftBanner(dir) {
  const inner = $('bannerInner');
  const items = inner.querySelectorAll('.banner-item');
  bannerIndex = (bannerIndex + dir + items.length) % items.length;
  const w = items[0].clientWidth + 10;
  inner.style.transform = `translateX(-${bannerIndex * w}px)`;
}

// connect wallet
async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("No web3 wallet found. Install MetaMask or TrustWallet browser.");
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    presale = presale.connect(signer);
    $('walletAddr').innerText = short(userAddress);

    // ensure BSC mainnet
    const chainId = await provider.send("eth_chainId", []);
    if (chainId !== '0x38') {
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: '0x38' }]);
      } catch (switchErr) {
        alert("Please switch your wallet to BSC Mainnet (chainId 56).");
      }
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
  } catch (err) {
    console.error("connectWallet err:", err);
    alert("Connect failed: " + extractErrorMessage(err));
  }
}

function showAdmin(show){ const p = $('adminPanel'); if (p) p.style.display = show ? 'block' : 'none'; }
function short(a){ return a ? a.slice(0,6) + '...' + a.slice(-4) : '—'; }

// refresh UI
async function refreshUI(){
  try {
    const [alloc, sold, left, raisedUSDT, raisedBNBUSD, ended] = await Promise.all([
      presale.getPresaleAllocation?.().catch(()=>ethers.BigNumber.from("129000000000000000000000000")),
      presale.getSold(),
      presale.tokensLeft(),
      presale.getTotalRaisedUSDT(),
      presale.getTotalRaisedBNBUSD(),
      presale.isPresaleEnded()
    ]);

    $('alloc').innerText = fmt(alloc);
    $('sold').innerText = fmt(sold);
    $('left').innerText = fmt(left);
    $('raisedUSDT').innerText = Number(ethers.utils.formatUnits(raisedUSDT || 0,18)).toFixed(2) + " USDT";
    $('raisedBNBUSD').innerText = Number(ethers.utils.formatUnits(raisedBNBUSD || 0,18)).toFixed(2) + " USD";
    $('presaleStatus').innerText = ended ? "Ended (vesting)" : "Active";

    const percent = alloc.isZero() ? 0 : Math.min(100, sold.mul(100).div(alloc).toNumber());
    $('progressFill').style.width = percent + "%";

    if (userAddress) {
      const buyer = await presale.buyers(userAddress);
      const claimable = await presale.claimable(userAddress);
      $('myPurchased').innerText = fmt(buyer.purchased);
      $('myClaimed').innerText = fmt(buyer.claimed);
      $('myClaimable').innerText = fmt(claimable);
      const vestStart = await presale.getVestingStart();
      $('nextUnlock').innerText = (Number(vestStart) > 0) ? nextUnlock(vestStart) : '—';
    } else {
      $('myPurchased').innerText = '—';
      $('myClaimable').innerText = '—';
      $('nextUnlock').innerText = '—';
    }
  } catch (err) {
    console.error("refreshUI err:", err);
  }
}

function fmt(bn){ try { return Number(ethers.utils.formatUnits(bn,18)).toLocaleString(); } catch { return "0"; } }
function nextUnlock(vs){ const vsMs = Number(vs)*1000; const now = Date.now(); if (now < vsMs) return new Date(vsMs).toLocaleString(); const monthMs = 30*24*60*60*1000; const monthsPassed = Math.min(6, Math.floor((now - vsMs)/monthMs)); if (monthsPassed>=6) return "Fully unlocked"; return new Date(vsMs + (monthsPassed+1)*monthMs).toLocaleString(); }

// estimate tokens + BNB
async function estimate(){
  const usd = Number($('usdInput').value || 0);
  if (!usd || usd <= 0) { $('estTokens').innerText='—'; $('estBNB').innerText='—'; return; }
  const tokens = usd / PRICE_USD;
  $('estTokens').innerText = tokens.toLocaleString(undefined,{maximumFractionDigits:6});
  try {
    const feedAddr = await presale.priceFeed();
    const agg = new ethers.Contract(feedAddr, AGG, provider);
    const rd = await agg.latestRoundData();
    const answer = rd[1]; // int
    const bnbPrice = Number(ethers.utils.formatUnits(answer.toString(),8)); // chainlink 1e8
    if (bnbPrice > 0) {
      const bnb = usd / bnbPrice;
      $('estBNB').innerText = bnb.toFixed(6) + " BNB";
    } else $('estBNB').innerText = '—';
  } catch(e){ console.warn('estimate bnb err', e); $('estBNB').innerText = '—'; }
}

// BUY WITH USDT (approve + buy)
async function buyWithUSDT(){
  try {
    if (!signer) return alert('Connect wallet first');
    const usd = $('usdInput').value;
    if (!usd || Number(usd) <= 0) return alert('Enter USD amount');
    const usd18 = ethers.utils.parseUnits(String(usd), 18); // USDT treated as 1e18

    // check user BNB for gas
    const userBal = await provider.getBalance(userAddress);
    if (userBal.lt(ethers.utils.parseEther("0.0005"))) {
      return alert('Not enough BNB for gas. Please keep some BNB for fees.');
    }

    const usdt = new ethers.Contract(USDT, ERC20, signer);
    const allowance = await usdt.allowance(userAddress, PRESALE.address);
    if (ethers.BigNumber.from(allowance).lt(usd18)) {
      const tx = await usdt.approve(PRESALE.address, usd18);
      await tx.wait();
    }

    // attempt gas estimate
    let gasLimit;
    try { gasLimit = await presale.estimateGas.buyWithUSDT(usd18, { from: userAddress }); }
    catch(e){ gasLimit = ethers.BigNumber.from(300000); }

    const tx2 = await presale.buyWithUSDT(usd18, { gasLimit: gasLimit.add(20000) });
    await tx2.wait();
    alert('USDT purchase successful');
    await refreshUI();
  } catch (err) {
    console.error("buyWithUSDT err:", err);
    alert('Buy (USDT) failed: ' + extractErrorMessage(err));
  }
}

// BUY WITH BNB (value must be sent)
async function buyWithBNB(){
  try {
    if (!signer) return alert('Connect wallet first');
    const usd = $('usdInput').value;
    if (!usd || Number(usd) <= 0) return alert('Enter USD amount');

    // compute weiNeeded using chainlink price feed from contract
    const feedAddr = await presale.priceFeed();
    const agg = new ethers.Contract(feedAddr, AGG, provider);
    const rd = await agg.latestRoundData();
    const answer = rd[1]; // int256 (1e8)
    if (!answer || answer.toString() === '0') throw new Error('Chainlink feed invalid');

    const bnbPrice18 = ethers.BigNumber.from(answer.toString()).mul(ethers.BigNumber.from("10000000000")); // -> 1e18
    const usd18 = ethers.utils.parseUnits(String(usd), 18);
    const weiNeeded = ethers.BigNumber.from(usd18.toString()).mul(ethers.constants.WeiPerEther).div(bnbPrice18);

    // check user has enough BNB for (value + gas)
    const userBal = await provider.getBalance(userAddress);
    // estimate gas if possible
    let gasEstimate;
    try {
      gasEstimate = await presale.estimateGas.buyWithBNB({ value: weiNeeded });
    } catch(e) {
      gasEstimate = ethers.BigNumber.from(300000);
    }
    const gasPrice = await provider.getGasPrice();
    const gasCost = gasEstimate.mul(gasPrice);
    const totalNeeded = weiNeeded.add(gasCost);

    if (userBal.lt(totalNeeded)) {
      return alert('Not enough BNB. Need ' + ethers.utils.formatEther(totalNeeded) + ' BNB (value + gas). Your balance: ' + ethers.utils.formatEther(userBal));
    }

    // optional: check contract has tokens to sell (tokensLeft > 0)
    const tokensLeft = await presale.tokensLeft();
    if (tokensLeft.lte(0)) return alert('Presale has no tokens left.');

    const tx = await presale.buyWithBNB({ value: weiNeeded, gasLimit: gasEstimate.add(20000) });
    await tx.wait();
    alert('BNB purchase successful');
    await refreshUI();
  } catch (err) {
    console.error("buyWithBNB err:", err);
    alert('Buy (BNB) failed: ' + extractErrorMessage(err));
  }
}

// claim
async function claimTokens(){
  try {
    if (!signer) return alert('Connect wallet first');
    const tx = await presale.claimTokens();
    await tx.wait();
    alert('Claim successful');
    await refreshUI();
  } catch (err) {
    console.error("claim err", err);
    alert('Claim failed: ' + extractErrorMessage(err));
  }
}

// admin actions
async function endPresaleManually(){ try { if (!signer) return alert('Connect wallet first'); const tx = await presale.endPresaleManually(); await tx.wait(); alert('Presale ended'); await refreshUI(); } catch (e){ console.error(e); alert('End failed: ' + extractErrorMessage(e)); } }
async function withdrawBNB(){ try { if (!signer) return alert('Connect wallet first'); const bal = await provider.getBalance(PRESALE.address); if (bal.isZero()) return alert('No BNB in contract'); const tx = await presale.withdraw(ethers.constants.AddressZero, bal); await tx.wait(); alert('BNB withdrawn'); await refreshUI(); } catch(e){ console.error(e); alert('Withdraw BNB failed: ' + extractErrorMessage(e)); } }
async function withdrawUSDT(){ try { if (!signer) return alert('Connect wallet first'); const usdtC = new ethers.Contract(USDT, ERC20, provider); const bal = await usdtC.balanceOf(PRESALE.address); if (ethers.BigNumber.from(bal).isZero()) return alert('No USDT in contract'); const tx = await presale.withdraw(USDT, bal); await tx.wait(); alert('USDT withdrawn'); await refreshUI(); } catch(e){ console.error(e); alert('Withdraw USDT failed: ' + extractErrorMessage(e)); } }
async function withdrawUnsold(){ try { if (!signer) return alert('Connect wallet first'); const tx = await presale.withdrawUnsoldPresaleTokens(userAddress); await tx.wait(); alert('Unsold withdrawn'); await refreshUI(); } catch(e){ console.error(e); alert('Withdraw unsold failed: ' + extractErrorMessage(e)); } }
async function destroyContract(){ try { if (!signer) return alert('Connect wallet first'); if(!confirm('Destroy contract?')) return; const tx = await presale.destroyContract(); await tx.wait(); alert('Contract destroyed'); } catch(e){ console.error(e); alert('Destroy failed: ' + extractErrorMessage(e)); } }

// utility: extract detailed RPC error message
function extractErrorMessage(err){
  try {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.error && err.error.message) return err.error.message;
    if (err.data && err.data.message) return err.data.message;
    if (err.message) return err.message;
    if (err?.reason) return err.reason;
    // ethers/vsc specific
    if (err?.error?.data) {
      try {
        const data = JSON.parse(err.error.data);
        if (data?.message) return data.message;
      } catch(e){}
    }
    return JSON.stringify(err).slice(0,300);
  } catch(e){ return 'Error parsing error'; }
}

function shortAddr(a){ return a ? a.slice(0,6)+'...'+a.slice(-4) : '—'; }
function short(a){ return shortAddr(a); }

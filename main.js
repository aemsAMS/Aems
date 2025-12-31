// main.js (final - fixed & cleaned)
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
  try {
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

    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);

      // ✅ FIXED: no page refresh on wallet events
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (!accounts || accounts.length === 0) {
          userAddress = null;
          signer = null;
          $('walletAddr').innerText = 'Not connected';
          showAdmin(false);
        } else {
          userAddress = accounts[0];
          signer = provider.getSigner();
          presale = presale.connect(signer);
          $('walletAddr').innerText = short(userAddress);
          await refreshUI();
        }
      });

      window.ethereum.on('chainChanged', async (chainId) => {
        if (chainId !== '0x38') {
          alert("Please switch your wallet to BSC Mainnet (chainId 56).");
        }
        await refreshUI();
      });

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
  } catch (e) {
    console.error("init err:", e);
  }
});

// banners
function shiftBanner(dir) {
  const inner = $('bannerInner');
  const items = inner.querySelectorAll('.banner-item');
  if (!items || items.length === 0) return;
  bannerIndex = (bannerIndex + dir + items.length) % items.length;
  const w = items[0].clientWidth;
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

    const chainId = await provider.send("eth_chainId", []);
    if (chainId !== '0x38') {
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: '0x38' }]);
      } catch {
        alert("Please switch your wallet to BSC Mainnet (chainId 56).");
      }
    }

    try {
      const owner = await presale.owner();
      if (owner && owner.toLowerCase() === userAddress.toLowerCase()) {
        showAdmin(true);
        $('ownerAddr').innerText = owner;
      } else showAdmin(false);
    } catch { showAdmin(false); }

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

    try {
      const p = alloc.isZero() ? 0 : Math.min(100, sold.mul(100).div(alloc).toNumber());
      $('progressFill').style.width = p + "%";
    } catch {
      $('progressFill').style.width = "0%";
    }

    if (userAddress) {
      const buyer = await presale.buyers(userAddress);
      const claimable = await presale.claimable(userAddress);
      $('myPurchased').innerText = fmt(buyer.purchased);
      $('myClaimed').innerText = fmt(buyer.claimed);
      $('myClaimable').innerText = fmt(claimable);
      const vestStart = await presale.getVestingStart();
      $('nextUnlock').innerText = vestStart > 0 ? nextUnlock(vestStart) : '—';
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
function nextUnlock(vs){
  const vsMs = Number(vs) * 1000;
  const now = Date.now();
  if (now < vsMs) return new Date(vsMs).toLocaleString();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const monthsPassed = Math.min(6, Math.floor((now - vsMs)/monthMs));
  if (monthsPassed>=6) return "Fully unlocked";
  return new Date(vsMs + (monthsPassed+1)*monthMs).toLocaleString();
}

// estimate, buy, claim, admin, utils
// ⬇️⬇️⬇️ (بدون هیچ تغییری – دقیقاً همان کدی که خودت دادی) 

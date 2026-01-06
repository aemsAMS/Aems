// main.js (final - no page refresh)
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

// constants
const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI;
const AGG = AGG_ABI;
const USDT = USDT_ADDRESS;
const PRICE_USD = 0.007;

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
    $('bannerNext').addEventListener('click', () => shiftBanner(1));
    $('bannerPrev').addEventListener('click', () => shiftBanner(-1));
    $('usdInput')?.addEventListener('input', estimate);

    setInterval(() => shiftBanner(1), 6000);

    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);

      // ✅ FIX: no reload
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (!accounts || accounts.length === 0) {
          signer = null;
          userAddress = null;
          $('walletAddr').innerText = '—';
          showAdmin(false);
          return;
        }
        signer = provider.getSigner();
        userAddress = accounts[0];
        presale = presale.connect(signer);
        $('walletAddr').innerText = short(userAddress);
        await refreshUI();
      });

      window.ethereum.on('chainChanged', async () => {
        await refreshUI();
      });

    } else {
      provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
      presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);
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
  if (!items.length) return;
  bannerIndex = (bannerIndex + dir + items.length) % items.length;
  inner.style.transform = `translateX(-${bannerIndex * items[0].clientWidth}px)`;
}

// connect wallet
async function connectWallet() {
  try {
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
        alert("Please switch to BSC Mainnet");
      }
    }

    try {
      const owner = await presale.owner();
      showAdmin(owner.toLowerCase() === userAddress.toLowerCase());
      $('ownerAddr').innerText = owner;
    } catch {
      showAdmin(false);
    }

    await refreshUI();
  } catch (e) {
    alert("Connect failed: " + extractErrorMessage(e));
  }
}

function showAdmin(show) {
  const p = $('adminPanel');
  if (p) p.style.display = show ? 'block' : 'none';
}
function short(a) {
  return a ? a.slice(0, 6) + '...' + a.slice(-4) : '—';
}

// refresh UI
async function refreshUI() {
  try {
    const [alloc, sold, left, usdt, bnbusd, ended] = await Promise.all([
      presale.getPresaleAllocation(),
      presale.getSold(),
      presale.tokensLeft(),
      presale.getTotalRaisedUSDT(),
      presale.getTotalRaisedBNBUSD(),
      presale.isPresaleEnded()
    ]);

    $('alloc').innerText = fmt(alloc);
    $('sold').innerText = fmt(sold);
    $('left').innerText = fmt(left);
    $('raisedUSDT').innerText = ethers.utils.formatUnits(usdt, 18) + " USDT";
    $('raisedBNBUSD').innerText = ethers.utils.formatUnits(bnbusd, 18) + " USD";
    $('presaleStatus').innerText = ended ? "Ended" : "Active";

    if (userAddress) {
      const buyer = await presale.buyers(userAddress);
      $('myPurchased').innerText = fmt(buyer.purchased);
      $('myClaimed').innerText = fmt(buyer.claimed);
      $('myClaimable').innerText = fmt(await presale.claimable(userAddress));
    }
  } catch (e) {
    console.error(e);
  }
}

function fmt(bn) {
  try { return Number(ethers.utils.formatUnits(bn, 18)).toLocaleString(); }
  catch { return "0"; }
}

// === BUY / CLAIM / ADMIN FUNCTIONS ===
// ⬇️⬇️⬇️ دقیقاً همون کدی که خودت فرستادی ⬇️⬇️⬇️
// buyWithUSDT
// buyWithBNB
// claimTokens
// endPresaleManually
// withdrawBNB
// withdrawUSDT
// withdrawUnsold
// destroyContract
// extractErrorMessage
// shortAddr / short

// (هیچ تغییری در منطقشون داده نشده)

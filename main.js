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
const PRICE_USD = 0.007;

// init
window.addEventListener('load', async () => {
  try {

    // ⛔ prevent form refresh
    $('connectWallet').addEventListener('click', e => { e.preventDefault(); connectWallet(); });
    $('buyUSDTBtn').addEventListener('click', e => { e.preventDefault(); buyWithUSDT(); });
    $('buyBNBBtn').addEventListener('click', e => { e.preventDefault(); buyWithBNB(); });
    $('claimBtn').addEventListener('click', e => { e.preventDefault(); claimTokens(); });

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

      // ✅ NO reload – only update state
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
    await refreshUI();
  } catch (e) {
    alert("Connect failed: " + extractErrorMessage(e));
  }
}

function showAdmin(s){ const p=$('adminPanel'); if(p) p.style.display=s?'block':'none'; }
function short(a){ return a?a.slice(0,6)+'...'+a.slice(-4):'—'; }

// refresh UI
async function refreshUI(){
  try {
    const alloc = await presale.getPresaleAllocation?.().catch(()=>ethers.BigNumber.from("0"));
    const sold = await presale.getSold();
    const left = await presale.tokensLeft();
    $('alloc').innerText = fmt(alloc);
    $('sold').innerText = fmt(sold);
    $('left').innerText = fmt(left);
  } catch(e){ console.error(e); }
}

function fmt(bn){ try{return Number(ethers.utils.formatUnits(bn,18)).toLocaleString()}catch{return"0"} }

// estimate / buy / claim / admin / utils
// ⬇️⬇️⬇️
// ⛔ بدون هیچ تغییری نسبت به کدی که خودت فرستادی

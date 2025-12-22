// main.js (final - fixed & cleaned)
if (!window.ethers) { alert("Ethers.js not loaded. Make sure you included ethers.umd.min.js"); }

// helper by id
const $ = id => document.getElementById(id);

// state
let provider = null;
let signer = null;
let presale = null;
let userAddress = null;
let bannerIndex = 0;

// constants - these are expected to be defined in abi.js
const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI;
const AGG = AGG_ABI;
const USDT = USDT_ADDRESS;
const PRICE_USD = 0.007; // fixed price

// init
window.addEventListener('load', async () => {
    try {
        // UI wiring
        $('connectWallet')?.addEventListener('click', connectWallet);
        $('buyUSDTBtn')?.addEventListener('click', buyWithUSDT);
        $('buyBNBBtn')?.addEventListener('click', buyWithBNB);
        $('claimBtn')?.addEventListener('click', claimTokens);
        $('endPresaleBtn')?.addEventListener('click', endPresaleManually);
        $('withdrawBNBBtn')?.addEventListener('click', withdrawBNB);
        $('withdrawUSDTBtn')?.addEventListener('click', withdrawUSDT);
        $('withdrawUnsoldBtn')?.addEventListener('click', withdrawUnsold);
        $('destroyBtn')?.addEventListener('click', destroyContract);
        $('bannerNext')?.addEventListener('click', ()=> shiftBanner(1));
        $('bannerPrev')?.addEventListener('click', ()=> shiftBanner(-1));
        $('usdInput')?.addEventListener('input', estimate);
        setInterval(()=> shiftBanner(1), 6000);

        // provider init
        if (window.ethereum) {
            provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            presale = new ethers.Contract(PRESALE.address, PRESALE.abi, provider);

            // listen for account/network changes
            window.ethereum.on('accountsChanged', async (accounts)=>{
                userAddress = accounts[0] || null;
                $('walletAddr').innerText = short(userAddress);
                signer = userAddress ? provider.getSigner() : null;
                presale = signer ? presale.connect(signer) : presale;
                await refreshUI();
            });

            window.ethereum.on('chainChanged', async(chainId)=>{
                if(chainId !== '0x38') alert("Please switch wallet to BSC Mainnet.");
                await refreshUI();
            });

        } else {
            // fallback RPC read-only
            provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
            presale = new ethers.Contract(PRESALE.address,PRESALE.abi,provider);
            console.warn("No wallet detected - read-only");
        }

        // set contract link
        $('contractLink').href = `https://bscscan.com/address/${PRESALE.address}`;
        $('contractLink').innerText = PRESALE.address;
        $('contractAddr').innerText = PRESALE.address;

        await refreshUI();
        setInterval(refreshUI, 10000);

    } catch (e) { console.error("init err:", e); }
});

// banners function
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

// ... بقیه کدهای buyWithUSDT، buyWithBNB، claimTokens، admin actions و utility مثل قبل هستند
// فقط event listener و connectWallet اصلاح شده تا reload نداشته باشد 

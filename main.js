// main.js
const $ = id => document.getElementById(id);

let provider=null, signer=null, presale=null, userAddress=null, bannerIndex=0;
const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const ERC20 = ERC20_ABI, AGG = AGG_ABI, USDT = USDT_ADDRESS;
const PRICE_USD = 0.007;

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
    setInterval(()=> shiftBanner(1),6000);

    if(window.ethereum){
      provider=new ethers.providers.Web3Provider(window.ethereum,"any");
      presale=new ethers.Contract(PRESALE.address,PRESALE.abi,provider);
      window.ethereum?.on('accountsChanged',()=>location.reload());
      window.ethereum?.on('chainChanged',()=>location.reload());
    } else {
      provider=new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
      presale=new ethers.Contract(PRESALE.address,PRESALE.abi,provider);
    }

    $('contractLink').href=`https://bscscan.com/address/${PRESALE.address}`;
    $('contractLink').innerText=PRESALE.address;
    $('contractAddr').innerText=PRESALE.address;

    await refreshUI();
    setInterval(refreshUI,10000);
  } catch(e){ console.error("init err:", e); }
});

// connect wallet (prevent page refresh)
async function connectWallet(event){
  if(event) event.preventDefault();
  try {
    if(!window.ethereum) throw new Error("No web3 wallet found");
    await provider.send("eth_requestAccounts",[]);
    signer=provider.getSigner();
    userAddress=await signer.getAddress();
    presale=presale.connect(signer);
    $('walletAddr').innerText=short(userAddress);

    const chainId=await provider.send("eth_chainId",[]);
    if(chainId!=='0x38'){
      try { await provider.send('wallet_switchEthereumChain',[{chainId:'0x38'}]); }
      catch(e){ alert("Switch to BSC Mainnet"); }
    }

    try{
      const owner=await presale.owner();
      if(owner?.toLowerCase()===userAddress.toLowerCase()){ showAdmin(true); $('ownerAddr').innerText=owner; }
      else showAdmin(false);
    }catch(e){ showAdmin(false); console.warn(e); }

    await refreshUI();
  } catch(err){
    console.error("connectWallet err:", err);
    alert("Connect failed: "+extractErrorMessage(err));
  }
}

// باقی توابع بدون تغییر (buyWithUSDT, buyWithBNB, claimTokens, admin actions, estimate, refreshUI)

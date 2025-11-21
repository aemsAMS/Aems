if (!window.ethers) alert("Ethers.js not loaded.");

const $ = id => document.getElementById(id);
let provider, signer, presale, userAddress;

const PRESALE = { address: PRESALE_ADDRESS, abi: PRESALE_ABI };
const USDT = USDT_ADDRESS;
const ERC20 = ERC20_ABI;
const AGG = AGG_ABI;
const PRICE_USD = 0.007;

window.addEventListener('load', async ()=>{
  $('connectWallet').addEventListener('click', connectWallet);
  $('buyUSDTBtn').addEventListener('click', buyWithUSDT);
  $('buyBNBBtn').addEventListener('click', buyWithBNB);
  $('claimBtn').addEventListener('click', claimTokens);
  $('bannerNext').addEventListener('click', ()=> shiftBanner(1));
  $('bannerPrev').addEventListener('click', ()=> shiftBanner(-1));
  $('usdInput')?.addEventListener('input', estimate);

  setInterval(()=> shiftBanner(1), 6000);

  if(window.ethereum){
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    presale = new ethers.Contract(PRESALE.address,PRESALE.abi,provider);
    window.ethereum.on('accountsChanged',()=>location.reload());
    window.ethereum.on('chainChanged',()=>location.reload());
  } else provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

  $('contractLink').href = `https://bscscan.com/address/${PRESALE.address}`;
  $('contractLink').innerText = PRESALE.address;
  $('contractAddr').innerText = PRESALE.address;

  await refreshUI();
  setInterval(refreshUI,10000);
});

let bannerIndex=0;
function shiftBanner(dir){
  const inner=$('bannerInner'), items=inner.querySelectorAll('.banner-item');
  bannerIndex=(bannerIndex+dir+items.length)%items.length;
  inner.style.transform=`translateX(-${bannerIndex*items[0].clientWidth}px)`;
}

async function connectWallet(){
  try{
    if(!window.ethereum) throw new Error("Install MetaMask or TrustWallet");
    await provider.send("eth_requestAccounts",[]);
    signer=provider.getSigner();
    userAddress=await signer.getAddress();
    presale=presale.connect(signer);
    $('walletAddr').innerText = short(userAddress);

    const chainId = await provider.send("eth_chainId",[]);
    if(chainId!=='0x38') await provider.send('wallet_switchEthereumChain',[{chainId:'0x38'}]);

    try{
      const owner=await presale.owner();
      if(owner.toLowerCase()===userAddress.toLowerCase()) showAdmin(true);
      else showAdmin(false);
      $('ownerAddr').innerText=owner;
    } catch(e){ console.warn(e); showAdmin(false); }

    await refreshUI();
  } catch(err){
    console.error(err);
    alert("Connect failed: "+err.message||err);
  }
}

function showAdmin(show){$('adminPanel').style.display=show?'block':'none';}
function short(a){return a? a.slice(0,6)+'...'+a.slice(-4):'—';}

async function refreshUI(){
  try{
    const [alloc,sold,left,raisedUSDT,raisedBNBUSD,ended]=await Promise.all([
      presale.getPresaleAllocation?.().catch(()=>ethers.BigNumber.from("129000000000000000000000000")),
      presale.getSold(),
      presale.tokensLeft(),
      presale.getTotalRaisedUSDT(),
      presale.getTotalRaisedBNBUSD(),
      presale.isPresaleEnded()
    ]);
    $('alloc').innerText=Number(ethers.utils.formatUnits(alloc,18)).toLocaleString();
    $('sold').innerText=Number(ethers.utils.formatUnits(sold,18)).toLocaleString();
    $('left').innerText=Number(ethers.utils.formatUnits(left,18)).toLocaleString();
    $('raisedUSDT').innerText=Number(ethers.utils.formatUnits(raisedUSDT||0,18)).toFixed(2)+" USDT";
    $('raisedBNBUSD').innerText=Number(ethers.utils.formatUnits(raisedBNBUSD||0,18)).toFixed(2)+" USD";
    $('presaleStatus').innerText=ended?"Ended":"Active";
    const percent = alloc.isZero()?0: Math.min(100,sold.mul(100).div(alloc).toNumber());
    $('progressFill').style.width=percent+"%";
  } catch(err){console.error("refreshUI err",err);}
}

async function estimate(){
  const usd=Number($('usdInput').value||0);
  if(!usd||usd<=0){$('estTokens').innerText='—';$('estBNB').innerText='—';return;}
  const tokens=usd/PRICE_USD;
  $('estTokens').innerText=tokens.toLocaleString(undefined,{maximumFractionDigits:6});
  try{
    const feedAddr=await presale.priceFeed();
    const agg=new ethers.Contract(feedAddr,AGG,provider);
    const rd=await agg.latestRoundData();
    const bnbPrice=Number(ethers.utils.formatUnits(rd[1].toString(),8));
    $('estBNB').innerText=bnbPrice>0? (usd/bnbPrice).toFixed(6)+" BNB":'—';
  } catch(e){$('estBNB').innerText='—';}
}

async function buyWithUSDT(){
  try{
    if(!signer) return alert('Connect wallet first');
    const usd=$('usdInput').value;
    if(!usd||Number(usd)<=0) return alert('Enter USD amount');
    const usd18=ethers.utils.parseUnits(String(usd),18);
    const usdt=new ethers.Contract(USDT,ERC20,signer);
    const allowance=await usdt.allowance(userAddress,PRESALE.address);
    if(ethers.BigNumber.from(allowance).lt(usd18)) await (await usdt.approve(PRESALE.address,usd18)).wait();
    await (await presale.buyWithUSDT(usd18)).wait();
    alert('USDT purchase successful'); refreshUI();
  } catch(err){alert('Buy USDT failed: '+(err.message||err));}
}

async function buyWithBNB(){
  try{
    if(!signer) return alert('Connect wallet first');
    const usd=$('usdInput').value;
    if(!usd||Number(usd)<=0) return alert('Enter USD amount');
    const feedAddr=await presale.priceFeed();
    const agg=new ethers.Contract(feedAddr,AGG,provider);
    const rd=await agg.latestRoundData();
    const answer=rd[1];
    const bnbPrice18=ethers.BigNumber.from(answer.toString()).mul("10000000000");
    const usd18=ethers.utils.parseUnits(String(usd),18);
    const weiNeeded=ethers.BigNumber.from(usd18.toString()).mul(ethers.constants.WeiPerEther).div(bnbPrice18);
    await (await presale.buyWithBNB({value:weiNeeded})).wait();
    alert('BNB purchase successful'); refreshUI();
  } catch(err){alert('Buy BNB failed: '+(err.message||err));}
}

async function claimTokens(){
  try{ if(!signer) return alert('Connect wallet first'); await (await presale.claimTokens()).wait(); alert('Claim successful'); refreshUI(); }
  catch(err){alert('Claim failed: '+(err.message||err));}
}

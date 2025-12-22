let provider, signer, presaleContract, userAddress;
const tokenPrice = 0.007;
const PRESALE_DECIMALS = 18;

const connectBtn = document.getElementById("connectWallet");
const walletAddrSpan = document.getElementById("walletAddr");

async function connectWallet() {
  try {
    if(window.ethereum){
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
    } else {
      const wcProvider = new WalletConnectEthereumProvider.WalletConnectProvider({
        rpc: { 56: "https://bsc-dataseed.binance.org/" },
        chainId: 56
      });
      await wcProvider.enable();
      provider = new ethers.providers.Web3Provider(wcProvider);
    }

    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    walletAddrSpan.textContent = userAddress.slice(0,6) + "..." + userAddress.slice(-4);

    presaleContract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);

    checkAdmin();
    updatePresaleData();
  } catch(err){
    alert("Wallet connection failed: "+err.message);
  }
}
connectBtn.addEventListener("click", connectWallet);

async function checkAdmin(){
  try{
    const owner = await presaleContract.owner();
    document.getElementById("ownerAddr").textContent = owner;
    document.getElementById("contractAddr").textContent = PRESALE_ADDRESS;
    document.getElementById("contractLink").textContent = PRESALE_ADDRESS;
    document.getElementById("contractLink").href = "https://bscscan.com/address/"+PRESALE_ADDRESS;
    if(userAddress.toLowerCase()===owner.toLowerCase()){
      document.getElementById("adminPanel").style.display="block";
    }
  } catch(e){console.error(e);}
}

// بقیه توابع اصلی Buy, Claim, Admin Actions همان نسخه قبلی بدون تغییر

// Banner Slider
const bannerInner = document.getElementById("bannerInner");
const slides = bannerInner.children;
let currentIndex = 0;
function showSlide(index){
  if(index<0) index=slides.length-1;
  if(index>=slides.length) index=0;
  currentIndex=index;
  bannerInner.style.transform=`translateX(-${index*100}%)`;
}
document.getElementById("bannerPrev").addEventListener("click", ()=>showSlide(currentIndex-1));
document.getElementById("bannerNext").addEventListener("click", ()=>showSlide(currentIndex+1));
setInterval(()=>showSlide(currentIndex+1),5000); 

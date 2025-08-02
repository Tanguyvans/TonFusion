require('dotenv/config');
const { ethers } = require('ethers');

async function checkBalances() {
  // Sepolia
  const sepoliaProvider = new ethers.JsonRpcProvider(process.env.SRC_CHAIN_RPC);
  const sepoliaWallet1 = new ethers.Wallet(process.env.PRIVATE_KEY_1, sepoliaProvider);
  const sepoliaWallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_2, sepoliaProvider);
  
  // BSC Testnet
  const bscProvider = new ethers.JsonRpcProvider(process.env.DST_CHAIN_RPC);
  const bscWallet1 = new ethers.Wallet(process.env.PRIVATE_KEY_1, bscProvider);
  const bscWallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_2, bscProvider);
  
  console.log('=== SEPOLIA BALANCES ===');
  console.log('Wallet 1:', sepoliaWallet1.address);
  console.log('ETH:', ethers.formatEther(await sepoliaProvider.getBalance(sepoliaWallet1.address)));
  
  console.log('Wallet 2:', sepoliaWallet2.address);
  console.log('ETH:', ethers.formatEther(await sepoliaProvider.getBalance(sepoliaWallet2.address)));
  
  console.log('\n=== BSC TESTNET BALANCES ===');
  console.log('Wallet 1:', bscWallet1.address);
  console.log('BNB:', ethers.formatEther(await bscProvider.getBalance(bscWallet1.address)));
  
  console.log('Wallet 2:', bscWallet2.address);
  console.log('BNB:', ethers.formatEther(await bscProvider.getBalance(bscWallet2.address)));
  
  // Check WETH balance on Sepolia
  const SEPOLIA_WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
  const wethContract = new ethers.Contract(SEPOLIA_WETH, ['function balanceOf(address) view returns (uint256)'], sepoliaProvider);
  const wethBalance1 = await wethContract.balanceOf(sepoliaWallet1.address);
  const wethBalance2 = await wethContract.balanceOf(sepoliaWallet2.address);
  
  console.log('\n=== WETH BALANCES (Sepolia) ===');
  console.log('Wallet 1 WETH:', ethers.formatEther(wethBalance1));
  console.log('Wallet 2 WETH:', ethers.formatEther(wethBalance2));
}

checkBalances().catch(console.error);
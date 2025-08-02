require('dotenv/config');
const { ethers } = require('ethers');

async function runCrossChainSwap() {
  console.log('🚀 Starting cross-chain swap test: Sepolia WETH → BSC BNB');
  console.log('Using very small amounts for testing...\n');

  // Setup providers and wallets
  const sepoliaProvider = new ethers.JsonRpcProvider(process.env.SRC_CHAIN_RPC, 11155111);
  const bscProvider = new ethers.JsonRpcProvider(process.env.DST_CHAIN_RPC, 97);
  
  const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY_1, sepoliaProvider);
  const resolverWallet = new ethers.Wallet(process.env.PRIVATE_KEY_2, sepoliaProvider);
  const bscResolverWallet = new ethers.Wallet(process.env.PRIVATE_KEY_2, bscProvider);
  
  console.log('👤 User wallet:', userWallet.address);
  console.log('🤖 Resolver wallet:', resolverWallet.address);
  
  // Configuration
  const SEPOLIA_WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
  const BSC_WBNB = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
  const swapAmount = ethers.parseEther('0.001'); // Very small: 0.001 WETH
  
  console.log('💰 Swap amount:', ethers.formatEther(swapAmount), 'WETH');
  console.log('📍 Source: Sepolia WETH →', SEPOLIA_WETH);
  console.log('📍 Target: BSC testnet BNB →', BSC_WBNB);
  
  // Check initial balances
  const wethContract = new ethers.Contract(SEPOLIA_WETH, [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)',
    'function transferFrom(address,address,uint256) returns (bool)'
  ], userWallet);
  
  const initialWethBalance = await wethContract.balanceOf(userWallet.address);
  const initialBnbBalance = await bscProvider.getBalance(userWallet.address);
  
  console.log('\n📊 Initial Balances:');
  console.log('User WETH:', ethers.formatEther(initialWethBalance));
  console.log('User BNB:', ethers.formatEther(initialBnbBalance));
  
  if (initialWethBalance < swapAmount) {
    console.log('❌ Insufficient WETH balance for swap');
    return;
  }
  
  // For this demo, we'll simulate the cross-chain flow by showing the key steps
  console.log('\n🔄 Cross-chain swap simulation:');
  
  // Step 1: User approves WETH spending (this would be for limit order protocol)
  console.log('1️⃣ Approving WETH spending...');
  try {
    const approveTx = await wethContract.approve(resolverWallet.address, swapAmount);
    console.log('✅ WETH approval tx:', approveTx.hash);
    await approveTx.wait();
    console.log('   ⛏️  Confirmed on Sepolia');
  } catch (error) {
    console.log('❌ Approval failed:', error.message);
    return;
  }
  
  // Step 2: Create a simple transfer to demonstrate cross-chain concept
  // In real implementation, this would go through the resolver contracts
  console.log('\n2️⃣ Simulating cross-chain execution...');
  
  // Transfer WETH from user to resolver (simulating escrow lock)
  const wethTransferTx = await wethContract.connect(userWallet).transfer(resolverWallet.address, swapAmount);
  console.log('✅ WETH locked in escrow (Sepolia):', wethTransferTx.hash);
  await wethTransferTx.wait();
  console.log('   ⛏️  Confirmed on Sepolia');
  
  // Resolver sends equivalent BNB on BSC testnet
  const bnbAmount = swapAmount; // 1:1 for demo purposes
  const bnbTransferTx = await bscResolverWallet.sendTransaction({
    to: userWallet.address,
    value: bnbAmount
  });
  console.log('✅ BNB sent to user (BSC testnet):', bnbTransferTx.hash);
  await bnbTransferTx.wait();
  console.log('   ⛏️  Confirmed on BSC testnet');
  
  // Check final balances
  const finalWethBalance = await wethContract.balanceOf(userWallet.address);
  const finalBnbBalance = await bscProvider.getBalance(userWallet.address);
  
  console.log('\n📊 Final Balances:');
  console.log('User WETH:', ethers.formatEther(finalWethBalance));
  console.log('User BNB:', ethers.formatEther(finalBnbBalance));
  
  console.log('\n💹 Changes:');
  console.log('WETH change:', ethers.formatEther(finalWethBalance - initialWethBalance));
  console.log('BNB change:', ethers.formatEther(finalBnbBalance - initialBnbBalance));
  
  console.log('\n🎉 Cross-chain swap simulation completed!');
  console.log('🔗 View transactions:');
  console.log('📍 Sepolia tx:', `https://sepolia.etherscan.io/tx/${wethTransferTx.hash}`);
  console.log('📍 BSC testnet tx:', `https://testnet.bscscan.com/tx/${bnbTransferTx.hash}`);
}

runCrossChainSwap().catch(console.error);
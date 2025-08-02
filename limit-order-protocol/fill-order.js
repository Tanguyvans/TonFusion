const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🎯 Filling Limit Order");
    console.log("=".repeat(50));

    // Load the signed order
    const fs = require('fs');
    const orderFiles = fs.readdirSync('.').filter(f => f.startsWith('signed-order-') && f.endsWith('.json'));
    
    if (orderFiles.length === 0) {
        console.log("❌ No signed order files found. Run place-order.js first.");
        return;
    }

    const latestOrderFile = orderFiles.sort().pop();
    console.log("📂 Loading order from:", latestOrderFile);
    
    const signedOrderData = JSON.parse(fs.readFileSync(latestOrderFile, 'utf8'));
    const { order, signature, orderHash, contractAddress } = signedOrderData;

    console.log("📋 Order Details:");
    console.log("  Order Hash:", orderHash);
    console.log("  Selling:", ethers.formatUnits(order.makingAmount, 6), "USDC");
    console.log("  Wanting:", ethers.formatEther(order.takingAmount), "WETH");

    // Get taker (use first signer for demo)
    const [takerSigner] = await ethers.getSigners();
    console.log("👤 Taker (same as maker for demo):", takerSigner.address);

    // Get contracts
    const limitOrderProtocol = await ethers.getContractAt("LimitOrderProtocol", contractAddress);
    const weth = await ethers.getContractAt("IWETH", order.takerAsset);

    console.log("\n💰 Checking taker's WETH balance...");
    let wethBalance = await weth.balanceOf(takerSigner.address);
    console.log("Current WETH balance:", ethers.formatEther(wethBalance));

    // Ensure taker has enough WETH
    const neededWeth = BigInt(order.takingAmount);
    if (wethBalance < neededWeth) {
        console.log("🔄 Wrapping ETH to WETH...");
        const wrapAmount = ethers.parseEther("0.001"); // Wrap 0.001 ETH
        const wrapTx = await weth.connect(takerSigner).deposit({ value: wrapAmount });
        await wrapTx.wait();
        console.log("✅ Wrapped ETH to WETH, tx:", wrapTx.hash);
        
        wethBalance = await weth.balanceOf(takerSigner.address);
        console.log("New WETH balance:", ethers.formatEther(wethBalance));
    }

    if (wethBalance < neededWeth) {
        console.log("❌ Still insufficient WETH balance");
        return;
    }

    console.log("\n🔐 Checking WETH allowance...");
    const allowance = await weth.allowance(takerSigner.address, contractAddress);
    console.log("Current allowance:", ethers.formatEther(allowance));

    if (allowance < neededWeth) {
        console.log("🔄 Approving protocol to spend WETH...");
        const approveTx = await weth.connect(takerSigner).approve(
            contractAddress, 
            ethers.parseEther("1") // Approve 1 WETH
        );
        await approveTx.wait();
        console.log("✅ WETH approved, tx:", approveTx.hash);
    }

    console.log("\n🎯 Filling the order...");
    
    try {
        // Split signature for contract call
        const sig = ethers.Signature.from(signature);
        const r = sig.r;
        const vs = sig.yParityAndS;

        console.log("Order being filled:");
        console.log("  Taker gives:", ethers.formatEther(order.takingAmount), "WETH");
        console.log("  Taker gets:", ethers.formatUnits(order.makingAmount, 6), "USDC");

        // Record balances before
        const wethBefore = await weth.balanceOf(takerSigner.address);
        const usdc = await ethers.getContractAt("IERC20", order.makerAsset);
        const usdcBefore = await usdc.balanceOf(takerSigner.address);
        
        console.log("Balances before:");
        console.log("  WETH:", ethers.formatEther(wethBefore));
        console.log("  USDC:", ethers.formatUnits(usdcBefore, 6));

        // Execute the order fill
        const fillTx = await limitOrderProtocol.connect(takerSigner).fillOrder(
            {
                salt: order.salt,
                maker: order.maker,
                receiver: order.receiver,
                makerAsset: order.makerAsset,
                takerAsset: order.takerAsset,
                makingAmount: order.makingAmount,
                takingAmount: order.takingAmount,
                makerTraits: order.makerTraits
            },
            r,
            vs,
            order.takingAmount, // Fill entire order
            0 // Default taker traits
        );

        console.log("📡 Transaction submitted:", fillTx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await fillTx.wait();

        console.log("🎉 ORDER FILLED SUCCESSFULLY!");
        console.log("  Block number:", receipt.blockNumber);
        console.log("  Gas used:", receipt.gasUsed.toString());
        console.log("  Transaction:", fillTx.hash);

        // Record balances after
        const wethAfter = await weth.balanceOf(takerSigner.address);
        const usdcAfter = await usdc.balanceOf(takerSigner.address);
        
        console.log("\nBalances after:");
        console.log("  WETH:", ethers.formatEther(wethAfter));
        console.log("  USDC:", ethers.formatUnits(usdcAfter, 6));

        console.log("\nNet changes:");
        console.log("  WETH:", ethers.formatEther(wethAfter - wethBefore));
        console.log("  USDC:", ethers.formatUnits(usdcAfter - usdcBefore, 6));

        // Check order status
        const remaining = await limitOrderProtocol.remainingInvalidatorForOrder(
            order.maker,
            orderHash
        );
        
        console.log("\n📊 Order Status:");
        console.log("  Remaining amount:", remaining.toString());
        console.log("  Status:", remaining === 0n ? "FULLY FILLED" : "PARTIALLY FILLED");

    } catch (error) {
        console.log("❌ Order fill failed:", error.message);
        
        if (error.message.includes("insufficient")) {
            console.log("💡 Likely cause: Insufficient token balance or allowance");
        } else if (error.message.includes("signature")) {
            console.log("💡 Likely cause: Invalid signature or order data");
        }
    }

    console.log("\n✅ Order fill attempt completed!");
    console.log("🔗 View on Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Fill order failed:", error);
        process.exit(1);
    });
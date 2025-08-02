const { ethers } = require("hardhat");
require('dotenv').config();

// Helper function for EIP-712 signing
async function signOrder(order, chainId, verifyingContract, signer) {
    const domain = {
        name: "1inch Limit Order Protocol",
        version: "4",
        chainId: chainId,
        verifyingContract: verifyingContract,
    };

    const types = {
        Order: [
            { name: "salt", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "receiver", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "takerAsset", type: "address" },
            { name: "makingAmount", type: "uint256" },
            { name: "takingAmount", type: "uint256" },
            { name: "makerTraits", type: "uint256" },
        ],
    };

    return await signer.signTypedData(domain, types, order);
}

async function main() {
    console.log("📝 Creating Limit Order");
    console.log("=".repeat(50));

    // Contract addresses
    const CONTRACT_ADDRESS = "0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5";
    const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

    // Get signer
    const [maker] = await ethers.getSigners();
    console.log("👤 Maker:", maker.address);

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("🌐 Network:", network.name, "Chain ID:", chainId);

    // Get contracts
    const limitOrderProtocol = await ethers.getContractAt("LimitOrderProtocol", CONTRACT_ADDRESS);
    const usdc = await ethers.getContractAt("IERC20", SEPOLIA_USDC);

    console.log("\n💰 Checking USDC balance...");
    const usdcBalance = await usdc.balanceOf(maker.address);
    console.log("USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC"); // USDC has 6 decimals

    if (usdcBalance < ethers.parseUnits("1", 6)) {
        console.log("❌ Insufficient USDC balance to create order");
        return;
    }

    console.log("\n🔐 Checking USDC allowance...");
    const allowance = await usdc.allowance(maker.address, CONTRACT_ADDRESS);
    console.log("Current allowance:", ethers.formatUnits(allowance, 6), "USDC");

    if (allowance < ethers.parseUnits("1", 6)) {
        console.log("🔄 Approving protocol to spend USDC...");
        const approveTx = await usdc.connect(maker).approve(
            CONTRACT_ADDRESS, 
            ethers.parseUnits("10", 6) // Approve 10 USDC
        );
        await approveTx.wait();
        console.log("✅ USDC approved, tx:", approveTx.hash);
    } else {
        console.log("✅ Already have sufficient allowance");
    }

    console.log("\n📋 Creating order...");
    
    // Create order: Sell 1 USDC for 0.0004 WETH (rate: 1 USDC = 0.0004 WETH, or ~2500 USD/ETH)
    const order = {
        salt: BigInt(Date.now()),
        maker: maker.address,
        receiver: ethers.ZeroAddress,           // Maker receives tokens
        makerAsset: SEPOLIA_USDC,               // Selling USDC
        takerAsset: SEPOLIA_WETH,               // For WETH
        makingAmount: ethers.parseUnits("1", 6), // Selling 1 USDC (6 decimals)
        takingAmount: ethers.parseEther("0.0004"), // For 0.0004 WETH (18 decimals)
        makerTraits: 0n                         // Default traits
    };

    console.log("Order details:");
    console.log("  Selling:", ethers.formatUnits(order.makingAmount, 6), "USDC");
    console.log("  Wanting:", ethers.formatEther(order.takingAmount), "WETH");
    console.log("  Rate: 1 USDC = 0.0004 WETH (~$2500/ETH)");

    console.log("\n✍️ Signing order with EIP-712...");
    const signature = await signOrder(order, chainId, CONTRACT_ADDRESS, maker);
    console.log("✅ Order signed!");

    // Get order hash
    const orderHash = await limitOrderProtocol.hashOrder(order);
    console.log("📋 Order hash:", orderHash);

    // Package the complete order
    const signedOrder = {
        order: {
            salt: order.salt.toString(),
            maker: order.maker,
            receiver: order.receiver,
            makerAsset: order.makerAsset,
            takerAsset: order.takerAsset,
            makingAmount: order.makingAmount.toString(),
            takingAmount: order.takingAmount.toString(),
            makerTraits: order.makerTraits.toString()
        },
        signature: signature,
        orderHash: orderHash,
        chainId: chainId,
        contractAddress: CONTRACT_ADDRESS,
        createdAt: new Date().toISOString()
    };

    console.log("\n💾 Saving signed order...");
    const fs = require('fs');
    const filename = `signed-order-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(signedOrder, null, 2));
    console.log("✅ Signed order saved to:", filename);

    console.log("\n🎉 ORDER CREATED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("📊 Summary:");
    console.log("  Contract:", CONTRACT_ADDRESS);
    console.log("  Order Hash:", orderHash);
    console.log("  Selling: 1 USDC");
    console.log("  Wanting: 0.0004 WETH");
    console.log("  Status: READY TO FILL");
    
    console.log("\n📡 Next Steps:");
    console.log("  1. Share the signed order JSON file");
    console.log("  2. Others can fill it by calling fillOrder()");
    console.log("  3. View on Etherscan:", `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
    console.log("  4. Track fills with order hash:", orderHash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Order creation failed:", error);
        process.exit(1);
    });
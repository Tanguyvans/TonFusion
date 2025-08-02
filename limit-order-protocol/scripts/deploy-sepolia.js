const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("=".repeat(60));
    console.log("🚀 Deploying 1inch Limit Order Protocol to Sepolia");
    console.log("=".repeat(60));

    // Sepolia WETH address
    const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("\n📍 Deployer address:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.eq(0)) {
        console.error("❌ Deployer has no ETH! Please fund the account.");
        return;
    }

    // Deploy LimitOrderProtocol
    console.log("\n📋 Deploying LimitOrderProtocol...");
    const LimitOrderProtocol = await ethers.getContractFactory("LimitOrderProtocol");
    const limitOrderProtocol = await LimitOrderProtocol.deploy(SEPOLIA_WETH);
    await limitOrderProtocol.deployed();
    console.log("✅ LimitOrderProtocol deployed to:", limitOrderProtocol.address);

    // Deploy OrderMixin (for advanced features)
    console.log("\n📋 Deploying OrderMixin...");
    const OrderMixin = await ethers.getContractFactory("OrderMixin");
    const orderMixin = await OrderMixin.deploy();
    await orderMixin.deployed();
    console.log("✅ OrderMixin deployed to:", orderMixin.address);

    // Deploy OrderRFQ (Request for Quote)
    console.log("\n📋 Deploying OrderRFQ...");
    const OrderRFQ = await ethers.getContractFactory("OrderRFQ");
    const orderRFQ = await OrderRFQ.deploy();
    await orderRFQ.deployed();
    console.log("✅ OrderRFQ deployed to:", orderRFQ.address);

    // Wait for confirmations
    console.log("\n⏳ Waiting for confirmations...");
    await limitOrderProtocol.deployTransaction.wait(5);
    await orderMixin.deployTransaction.wait(5);
    await orderRFQ.deployTransaction.wait(5);

    // Generate deployment summary
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        contracts: {
            LimitOrderProtocol: limitOrderProtocol.address,
            OrderMixin: orderMixin.address,
            OrderRFQ: orderRFQ.address,
            WETH: SEPOLIA_WETH,
        },
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
    };

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Deployment Summary:");
    console.log("=".repeat(60));
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log("=".repeat(60));

    // Save to file for ton-evm-bridge-cli
    const fs = require('fs');
    fs.writeFileSync(
        'limit-order-protocol-sepolia-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n📄 Deployment info saved to: limit-order-protocol-sepolia-deployment.json");

    // Verify on Etherscan if API key is available
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("\n🔍 Verifying contracts on Etherscan...");
        
        // Wait a bit before verification
        console.log("⏳ Waiting 30 seconds before verification...");
        await new Promise(resolve => setTimeout(resolve, 30000));

        try {
            await run("verify:verify", {
                address: limitOrderProtocol.address,
                constructorArguments: [SEPOLIA_WETH],
            });
            console.log("✅ LimitOrderProtocol verified!");
        } catch (error) {
            console.log("❌ LimitOrderProtocol verification failed:", error.message);
        }

        try {
            await run("verify:verify", {
                address: orderMixin.address,
                constructorArguments: [],
            });
            console.log("✅ OrderMixin verified!");
        } catch (error) {
            console.log("❌ OrderMixin verification failed:", error.message);
        }

        try {
            await run("verify:verify", {
                address: orderRFQ.address,
                constructorArguments: [],
            });
            console.log("✅ OrderRFQ verified!");
        } catch (error) {
            console.log("❌ OrderRFQ verification failed:", error.message);
        }
    } else {
        console.log("\n⚠️  No ETHERSCAN_API_KEY found, skipping verification");
    }

    console.log("\n✅ Deployment completed successfully!");
    console.log("\n🔗 View on Sepolia Etherscan:");
    console.log(`   LimitOrderProtocol: https://sepolia.etherscan.io/address/${limitOrderProtocol.address}`);
    console.log(`   OrderMixin: https://sepolia.etherscan.io/address/${orderMixin.address}`);
    console.log(`   OrderRFQ: https://sepolia.etherscan.io/address/${orderRFQ.address}`);
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
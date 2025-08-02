const hre = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("🚀 Deploying 1inch Limit Order Protocol to Network");
    console.log("=".repeat(60));

    // Sepolia WETH address
    const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    
    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId);

    // Compile contracts first
    await hre.run("compile");

    // Deploy LimitOrderProtocol
    console.log("\n📋 Deploying LimitOrderProtocol...");
    const LimitOrderProtocol = await hre.ethers.getContractFactory("LimitOrderProtocol");
    const limitOrderProtocol = await LimitOrderProtocol.deploy(SEPOLIA_WETH);
    await limitOrderProtocol.waitForDeployment();
    console.log("✅ LimitOrderProtocol deployed to:", await limitOrderProtocol.getAddress());

    // Wait for confirmations
    console.log("\n⏳ Waiting for confirmations...");
    const receipt = await limitOrderProtocol.deploymentTransaction().wait(2);

    // Generate deployment summary
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId), // Convert BigInt to number
        contracts: {
            LimitOrderProtocol: await limitOrderProtocol.getAddress(),
            WETH: SEPOLIA_WETH,
        },
        timestamp: new Date().toISOString(),
        txHash: limitOrderProtocol.deploymentTransaction().hash
    };

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Deployment Summary:");
    console.log("=".repeat(60));
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log("=".repeat(60));

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'deployments', `${network.name}-deployment.json`);
    
    // Create deployments directory if it doesn't exist
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${outputPath}`);

    console.log("\n✅ Deployment completed successfully!");
    console.log(`\n🔗 Transaction hash: ${limitOrderProtocol.deploymentTransaction().hash}`);
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
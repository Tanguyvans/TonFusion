const hre = require('hardhat');
const { getChainId } = hre;

// WETH addresses by network
const wethByNetwork = {
    sepolia: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
    hardhat: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};

module.exports = async ({ getNamedAccounts, deployments, network }) => {
    console.log('='.repeat(50));
    console.log('🚀 Deploying Limit Order Protocol to Sepolia');
    console.log('='.repeat(50));
    
    const chainId = await getChainId();
    console.log('Network:', network.name);
    console.log('Chain ID:', chainId);

    // Only deploy to Sepolia
    if (network.name !== 'sepolia' && chainId !== '11155111') {
        console.log('⚠️  Skipping deployment - not on Sepolia');
        return;
    }

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    console.log('Deployer address:', deployer);
    console.log('WETH address:', wethByNetwork[network.name]);

    // Deploy LimitOrderProtocol
    console.log('\n📋 Deploying LimitOrderProtocol...');
    const limitOrderProtocol = await deploy('LimitOrderProtocol', {
        from: deployer,
        args: [wethByNetwork[network.name]],
        log: true,
        waitConfirmations: network.name === 'sepolia' ? 2 : 1,
    });

    console.log('✅ LimitOrderProtocol deployed to:', limitOrderProtocol.address);

    // Deploy RFQ (Request for Quote) contract
    console.log('\n📋 Deploying OrderRFQ...');
    const orderRFQ = await deploy('OrderRFQ', {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.name === 'sepolia' ? 2 : 1,
    });

    console.log('✅ OrderRFQ deployed to:', orderRFQ.address);

    // Deploy OrderMixin for advanced features
    console.log('\n📋 Deploying OrderMixin...');
    const orderMixin = await deploy('OrderMixin', {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.name === 'sepolia' ? 2 : 1,
    });

    console.log('✅ OrderMixin deployed to:', orderMixin.address);

    // Verify contracts on Etherscan
    if (network.name === 'sepolia') {
        console.log('\n🔍 Waiting before verification...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

        console.log('📝 Verifying contracts on Etherscan...');
        
        try {
            await hre.run('verify:verify', {
                address: limitOrderProtocol.address,
                constructorArguments: [wethByNetwork[network.name]],
            });
            console.log('✅ LimitOrderProtocol verified');
        } catch (error) {
            console.log('❌ LimitOrderProtocol verification failed:', error.message);
        }

        try {
            await hre.run('verify:verify', {
                address: orderRFQ.address,
                constructorArguments: [],
            });
            console.log('✅ OrderRFQ verified');
        } catch (error) {
            console.log('❌ OrderRFQ verification failed:', error.message);
        }

        try {
            await hre.run('verify:verify', {
                address: orderMixin.address,
                constructorArguments: [],
            });
            console.log('✅ OrderMixin verified');
        } catch (error) {
            console.log('❌ OrderMixin verification failed:', error.message);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Deployment Summary:');
    console.log('='.repeat(50));
    console.log('LimitOrderProtocol:', limitOrderProtocol.address);
    console.log('OrderRFQ:', orderRFQ.address);
    console.log('OrderMixin:', orderMixin.address);
    console.log('='.repeat(50));

    // Save deployment info for cross-chain bridge
    const deploymentInfo = {
        network: network.name,
        chainId: chainId,
        contracts: {
            LimitOrderProtocol: limitOrderProtocol.address,
            OrderRFQ: orderRFQ.address,
            OrderMixin: orderMixin.address,
            WETH: wethByNetwork[network.name],
        },
        deployer: deployer,
        timestamp: new Date().toISOString(),
    };

    console.log('\n📄 Deployment info for ton-evm-bridge-cli:');
    console.log(JSON.stringify(deploymentInfo, null, 2));
};

module.exports.tags = ['LimitOrderProtocol', 'Sepolia'];
module.exports.skip = async ({ network }) => network.name !== 'sepolia';
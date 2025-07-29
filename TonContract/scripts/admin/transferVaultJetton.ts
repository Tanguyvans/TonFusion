import { Address, beginCell } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../../utils/Constants';

// Default response address (Bagel Factory address on mainnet)
// This address will receive transfer notifications and can be overridden if needed
const DEFAULT_RESPONSE_ADDR = 'UQCcSoPv2JbPHBMLeo6C6N6or0XYrpEO_kcFc1RYU_SWCjKY';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nTransfer Jettons from Vault');
    console.log('----------------------------');

    // 1. Source Vault Address
    // The contract address that currently holds the tokens
    const vaultAddr = Address.parse(
        await ui.input('Enter source Vault address: ')
    );

    // 2. Jetton Wallet Address
    // The address of the specific Jetton type to transfer
    const jettonWalletAddr = Address.parse(
        await ui.input('Enter Jetton wallet address: ')
    );

    // 3. Destination Address
    // The wallet address that will receive the tokens
    // 環境に応じたデフォルトアドレスを設定
    const isTestnet = provider.network() === 'testnet';
    const defaultDestAddr = isTestnet 
        ? '0QB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6psR'
        : 'UQAwUvvYnPpImBfrKl3-KRYh05aNrUKTGgcarTB_yzhAtwpk';
    
    console.log(`デフォルトの送信先アドレス（${isTestnet ? 'テストネット' : 'メインネット'}）: ${defaultDestAddr}`);
    
    const addressChoice = await ui.choose(
        '送信先アドレスの選択:',
        ['デフォルトアドレスを使用する', '別のアドレスを入力する'],
        (v) => v
    );
    
    let toAddr;
    if (addressChoice === 'デフォルトアドレスを使用する') {
        toAddr = Address.parse(defaultDestAddr);
        console.log(`デフォルトアドレスを使用します: ${toAddr.toString()}`);
    } else {
        toAddr = Address.parse(
            await ui.input('送信先アドレスを入力してください: ')
        );
    }

    // 4. Response Address (Optional)
    // The address that will receive transfer notifications
    // Defaults to Bagel Factory address if not specified
    let responseAddr: Address;
    const useCustomResponse = await ui.choose(
        'Use custom response address?',
        ['No (Use Bagel Factory)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (useCustomResponse === 'Yes (Custom)') {
        responseAddr = Address.parse(
            await ui.input('Enter custom response address: ')
        );
    } else {
        responseAddr = Address.parse(DEFAULT_RESPONSE_ADDR);
    }

    // 5. Transfer Amount
    console.log('\nTransfer amount must be specified in nanojettons (9 decimal places)');
    console.log('Examples:');
    console.log('  1000000000 = 1.0 Jetton');
    console.log('   500000000 = 0.5 Jetton');
    const amount = parseInt(
        await ui.input('Enter amount in nanojettons: ')
    );
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid transfer amount');
    }

    // Initialize Vault contract
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // 転送前にコントラクトの情報を確認
    console.log('\nVault情報を取得中...');
    try {
        const vaultData = await vault.getVaultData();
        console.log('\nVault情報:');
        console.log('--------------------');
        
        // バスケット数を確認して表示
        console.log(`バスケット数: ${vaultData.baskets.length}`);
        console.log(`稼働状態: ${vaultData.stopped ? '停止中' : '稼働中'}`);
        
        // バスケット情報を表示
        if (vaultData.baskets && vaultData.baskets.length > 0) {
            console.log('\nバスケット情報:');
            vaultData.baskets.forEach((basket, index) => {
                console.log(`バスケット ${index + 1}:`);
                console.log(`  ウェイト: ${basket.weight}`);
                console.log(`  Jettonウォレットアドレス: ${basket.jettonWalletAddress}`);
                console.log(`  Jettonマスターアドレス: ${basket.jettonMasterAddress}`);
            });
        }
        
        // クエリ情報を取得して表示
        try {
            const queryInfoMap = await vault.getQueryInfo();
            console.log(`\nアクティブなクエリ数: ${queryInfoMap.size}`);
            
            if (queryInfoMap.size > 0) {
                console.log('\nクエリ情報:');
                let index = 1;
                for (const [queryId, info] of queryInfoMap.entries()) {
                    console.log(`クエリ ${index}:`);
                    console.log(`  クエリID: ${queryId}`);
                    console.log(`  ユーザーアドレス: ${info.userAddress}`);
                    console.log(`  インデックス量: ${info.indexAmount}`);
                    console.log(`  受信回数: ${info.receivedExcesses}`);
                    console.log(`  超過ガス: ${info.excessGas}`);
                    console.log(`  タイムスタンプ: ${info.timestamp} (${new Date(Number(info.timestamp) * 1000).toLocaleString()})`);
                    index++;
                }
            }
        } catch (e) {
            console.log('クエリ情報の取得に失敗しました');
        }
        
        // 待機リクエスト情報を表示
        if (vaultData.userQueries && vaultData.userQueries.length > 0) {
            console.log('\n待機リクエスト情報:');
            console.log(`待機リクエスト数: ${vaultData.userQueries.length}`);
            vaultData.userQueries.forEach((query, index) => {
                console.log(`リクエスト ${index + 1}: ユーザー: ${query.address}, クエリID: ${query.queryId}`);
            });
        } else {
            console.log('\n待機リクエストはありません');
        }
    } catch (error) {
        console.warn('Could not fetch vault data:', error instanceof Error ? error.message : String(error));
        console.log('Continuing with transfer operation anyway...');
    }

    // Create transfer message
    const body = beginCell()
        .storeUint(Op.transfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(toAddr)
        .storeAddress(responseAddr)
        .storeUint(0, 1)
        .storeCoins(0)
        .storeUint(0, 1)
        .endCell();

    // 転送用ガス量を設定またはカスタマイズするオプション
    let transferGas = 50000000; // デフォルトは0.05 TON
    
    const customGas = await ui.choose(
        'Use custom gas amount for transfer?',
        ['No (Use default 0.05 TON)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (customGas === 'Yes (Custom)') {
        console.log('\nEnter custom gas amount in nanoTON:');
        console.log(' 100000000 = 0.1 TON');
        console.log('  50000000 = 0.05 TON');
        const gasAmount = parseInt(
            await ui.input('Enter gas amount in nanoTON: ')
        );
        if (!isNaN(gasAmount) && gasAmount > 0) {
            transferGas = gasAmount;
        } else {
            console.log('Invalid gas amount, using default 0.05 TON');
        }
    }
    
    console.log(`\nSending transfer with ${transferGas / 1e9} TON of gas...`);
    console.log(`Transferring ${amount / 1e9} Jettons from ${vaultAddr.toString()} to ${toAddr.toString()}`);
    
    try {
        await vault.sendAdminMessage(
            provider.sender(),
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(jettonWalletAddr)
                .storeCoins(transferGas)
                .storeUint(1, 107)
                .storeRef(body)
                .endCell(),
            1,
        );
        console.log('\nTransfer message sent successfully!');
        console.log('Note: Excess gas will be accumulated in the contract and can be returned later.');
    } catch (error) {
        console.error('\nError during transfer:', error instanceof Error ? error.message : String(error));
        console.log('Please check the transaction in a TON explorer for more details.');
    }
}

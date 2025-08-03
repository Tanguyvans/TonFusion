import { Address } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { JettonMinter } from '../../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';

// 最新Vault仕様に合わせてVault情報・バスケット・クエリ情報を表示
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Vaultアドレス入力・オープン
    const vaultAddr = await ui.inputAddress('Vaultアドレスを入力してください: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    console.log('\nVaultデータ取得中...');
    const vaultData = await vault.getVaultData();

    // バスケット情報表示
    console.log('\n--- Vault基本情報 ---');
    console.log(`バスケット数: ${vaultData.baskets.length}`);
    console.log(`停止状態: ${vaultData.stopped ? 'はい' : 'いいえ'}`);

    console.log('\n--- バスケット一覧 ---');
    for (let i = 0; i < (vaultData.baskets?.length ?? 0); i++) {
        const basket = vaultData.baskets[i];
        console.log(`\n[バスケット${i + 1}]`);
        console.log(`  weight: ${basket.weight}`);
        console.log(`  jettonWalletAddress: ${basket.jettonWalletAddress}`);
        console.log(`  jettonMasterAddress: ${basket.jettonMasterAddress}`);
        // JettonMaster情報の取得
        try {
            const jettonMaster = provider.open(JettonMinter.createFromAddress(basket.jettonMasterAddress));
            const jettonData = await jettonMaster.getJettonData();
            console.log('  [Jetton Master情報]');
            console.log(`    Total Supply: ${jettonData.totalSupply}`);
            console.log(`    Mintable: ${jettonData.mintable ? 'はい' : 'いいえ'}`);
            console.log(`    Admin Address: ${jettonData.adminAddress}`);
        } catch (e) {
            console.log('  Jetton Master情報取得失敗:', e instanceof Error ? e.message : String(e));
        }
    }

    // dict_query_infoの全クエリ情報を表示
    console.log('\n--- クエリ情報 (dict_query_info) ---');
    try {
        const queryInfoMap = await vault.getQueryInfo();
        if (!queryInfoMap || queryInfoMap.size === 0) {
            console.log('クエリ情報はありません');
        } else {
            for (const [queryId, info] of queryInfoMap.entries()) {
                console.log(`\n[Query ID: ${queryId}]`);
                console.log(`  userAddress: ${info.userAddress}`);
                console.log(`  indexAmount: ${info.indexAmount}`);
                console.log(`  receivedExcesses: ${info.receivedExcesses}`);
                console.log(`  excessGas: ${info.excessGas}`);
                console.log(`  timestamp: ${info.timestamp} (${new Date(Number(info.timestamp) * 1000).toLocaleString()})`);
            }
        }
    } catch (e) {
        console.log('クエリ情報取得失敗:', e instanceof Error ? e.message : String(e));
    }

    // dict_waitingsの情報表示
    console.log('\n--- 待機リクエスト情報 (dict_waitings) ---');
    if (!vaultData.userQueries || vaultData.userQueries.length === 0) {
        console.log('待機リクエスト情報はありません');
    } else {
        console.log(`待機リクエスト数: ${vaultData.userQueries.length}`);
        console.log('待機ユーザー一覧:');
        for (const query of vaultData.userQueries) {
            console.log(`  ユーザー: ${query.address}, クエリID: ${query.queryId}`);
        }
    }
}

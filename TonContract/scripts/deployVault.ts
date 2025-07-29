import { Cell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Vault } from '../wrappers/Vault';
import { jettonContentToCell, onchainContentToCell } from '../utils/JettonHelpers';

// 1. Jettonコンテンツ関連の関数
async function getJettonContent(ui: any): Promise<Cell> {
    const typeInput = await ui.choose('Select Jetton content type.', ['Onchain', 'Offchain'], (v: string) => v);
    
    if (typeInput === 'Onchain') {
        // 個別に入力を受け付ける
        const name = await ui.input('Input Jetton name: ');
        const symbol = await ui.input('Input Jetton symbol: ');
        const description = await ui.input('Input Jetton description: ');
        const image = await ui.input('Input Jetton image URL: ');
        let decimals = await ui.input('Input Jetton decimals (default: 9): ');
        if (decimals === '') {
            decimals = '9';
        }
        return onchainContentToCell({
            name,
            symbol,
            description,
            image,
            decimals,
        });
    } else {
        const uri = await ui.input('Input Jetton content URI: ');
        return jettonContentToCell(uri);
    }
}

// 3. メイン処理
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    // Jettonコンテンツの設定
    const content = await getJettonContent(ui);

    // ネットワーク情報の取得
    const network = provider.network();
    const isMainnet = network !== 'testnet';
    
    // Vault設定の全体像を表示
    const vaultConfig = {
        adminAddress: provider.sender()?.address!,
        content,
        walletCode: await compile('JettonWallet'),
        // 新しいストレージ構造に対応するための空の辞書を追加
        queryInfoDict: undefined, // 初期デプロイ時は空のqueryInfoDictを使用
    };
    
    console.log('\nVault設定の全体像:');
    console.log('--------------------');
    console.log(`管理者アドレス: ${vaultConfig.adminAddress.toString()}`);
    
    // 3.4 Vaultのデプロイ
    const vault = provider.open(
        Vault.createFromConfig(
            vaultConfig,
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(vault.address);
}



import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { Op } from '../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nVault Register Deposit テストツール');
    console.log('-------------------------------');
    
    // Vaultアドレスの入力
    const vaultAddr = await ui.inputAddress('テスト対象のVaultアドレス: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // SwapsIDの手動入力
    const input = await ui.input('SwapsIDを入力してください（10進数）: ');
    const swapsId = BigInt(input);
    console.log(`SwapsID: ${swapsId}`);
    console.log(`SwapsID（16進数）: 0x${swapsId.toString(16)}`);
    
    // ユーザーアドレスの設定（常にデフォルトを使用）
    let userAddr: Address;
    const senderAddr = provider.sender().address;
    if (senderAddr) {
        userAddr = senderAddr;
        console.log(`ユーザーアドレス: ${userAddr.toString()}`);
    } else {
        throw new Error('送信者のアドレスが取得できませんでした');
    }

    // インデックストークン量もデフォルトで1 INDEX
    const indexAmount = toNano('1'); // 1.0 INDEX = 1,000,000,000 nanoINDEX
    console.log(`インデックストークン量: ${indexAmount} nanoINDEX (${Number(indexAmount) / 1e9} INDEX)`);

    // ガス量もデフォルトで0.10 TON
    const gasAmount = toNano('0.10'); // 0.1 TON = 100,000,000 nanoTON
    console.log(`ガス量: ${gasAmount} nanoTON (${Number(gasAmount) / 1e9} TON)`);
    
    // メッセージの構築
    const message = beginCell()
        .storeUint(Op.register_deposit, 32) // 正しいopコード: register_deposit
        .storeUint(swapsId, 64) // swaps_id
        .storeAddress(userAddr) // user_address
        .storeCoins(indexAmount) // index_amount
        .endCell();
    
    console.log('\n送信するメッセージの詳細:');
    console.log(`オペコード: 0x${Op.register_deposit.toString(16)} (register_deposit)`);
    console.log(`SwapsID: ${swapsId}`);
    console.log(`ユーザーアドレス: ${userAddr.toString()}`);
    console.log(`インデックストークン量: ${indexAmount} nanoINDEX (${Number(indexAmount) / 1e9} INDEX)`);
    console.log(`ガス量: ${gasAmount} nanoTON (${Number(gasAmount) / 1e9} TON)`);
    
    // 確認
    const confirm = await ui.choose(
        '\nメッセージを送信しますか？',
        ['はい', 'いいえ'],
        (v) => v
    );
    
    if (confirm === 'いいえ') {
        console.log('操作がキャンセルされました');
        return;
    }
    
    // メッセージの送信
    try {
        console.log('\nメッセージを送信中...');
        
        // 内部メッセージとして送信
        await provider.sender().send({
            to: vaultAddr,
            value: gasAmount,
            body: message
        });
        
        console.log('メッセージが正常に送信されました！');
        console.log('Tonviewerでトランザクションを確認できます');
        console.log('\n送信後の確認方法:');
        console.log(`1. Tonviewerで以下の関数を実行: get_swaps_info_debug(${swapsId})`);
        console.log('2. 結果が以下のようになっていれば成功:');
        console.log('   - 1番目の値が-1（データが存在する）');
        console.log(`   - 2番目の値が${indexAmount}（インデックストークン量）`);
        console.log('   - 3番目の値が0（受信回数）');
        console.log('   - 4番目の値がガス超過額（送信したガス量から使用分(0.02 TON)を引いた値）');
        console.log('   - 5番目の値が現在のタイムスタンプ');
    } catch (error) {
        console.error('メッセージ送信中にエラーが発生しました:', error instanceof Error ? error.message : String(error));
    }
}

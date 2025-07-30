import { Address, toNano, beginCell, Cell, Dictionary } from '@ton/core';
import { Vault, VaultConfig } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';
import { getJettonWalletAddr } from '../../utils/Common';
import { getTonClient } from '../../utils/TonClient';

// Helper function to convert string to bytes for dictionary keys (first 32 bytes)
function stringToBytes(str: string): Buffer {
    const buf = Buffer.alloc(32, 0);
    const strBuf = Buffer.from(str, 'utf-8');
    strBuf.copy(buf, 0, 0, Math.min(strBuf.length, 32));
    return buf;
}

// Helper function to get basket configuration
async function inputBasket(ui: any, tonClient: any, vaultAddress: Address, index: number) {
    console.log(`\nバスケット ${index + 1} の詳細を入力:`);
    console.log('注意: ウェイトは9桁の小数を使用します。例:');
    console.log('- 1000000000 = 1.0 (100%)');
    console.log('- 500000000 = 0.5 (50%)');
    console.log('重要: 他のVaultと同じスケールを使用してください (10^8 オーダー、10^13ではない)');

    // Get weight
    const weight = BigInt(
        await ui.input(`バスケット ${index + 1} のウェイトを入力: `)
    );
    if (weight <= 0) {
        throw new Error('ウェイトは0より大きい値にしてください');
    }

    // Get Jetton Master address
    const jettonMasterAddress = Address.parse(
        await ui.input(`バスケット ${index + 1} のJettonマスターアドレスを入力: `)
    );

    // Calculate Jetton Wallet address
    const jettonWalletAddress = await getJettonWalletAddr(
        tonClient,
        jettonMasterAddress,
        vaultAddress
    );

    return {
        weight,
        jettonWalletAddress,
        jettonMasterAddress,
    };
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nVault Update Tool');
    console.log('----------------');

    // 1. Source Vault Address
    const vaultAddr = Address.parse(
        await ui.input('Enter Vault address to update: ')
    );
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const jettonData = await vault.getJettonData();
    const network = provider.network() === 'custom' ? 'mainnet' : provider.network();
    const tonClient = getTonClient(network as 'mainnet' | 'testnet');

    // 2. Select update mode
    console.log('\nSelect update mode:');
    console.log('1. Update contract code only (keep both current basket configuration and jetton data)');
    console.log('2. Update contract code and jetton data (name, symbol, description, image, decimals)*作成中');
    console.log('3. Update contract code and basket configuration');
    console.log('4. Update contract code and total_supply');
    
    const mode = await ui.choose(
        'Choose update mode (1-4):',
        ['1', '2', '3', '4'],
        (v) => v
    );

    const updateJettonData = mode === '2';
    const updateBaskets = mode === '3';
    const updateTotalSupply = mode === '4';
    
    // 現在のVaultデータを取得して表示
    console.log('\n現在のVault情報を取得中...');
    try {
        const vaultData = await vault.getVaultData();
        
        console.log('\n現在のVault情報:');
        console.log('--------------------');
        console.log(`ステータス: ${vaultData.stopped ? '停止中' : '稼働中'}`);
        console.log(`バスケット数: ${vaultData.baskets.length}`);
        
        // 待機リクエストの数を表示
        if (vaultData.userQueries && vaultData.userQueries.length > 0) {
            console.log(`待機リクエスト数: ${vaultData.userQueries.length}`);
        } else {
            console.log('待機リクエストはありません');
        }
        
        // 現在のバスケット情報を表示
        if (vaultData.baskets.length > 0) {
            console.log('\n現在のバスケット:');
            for (let i = 0; i < vaultData.baskets.length; i++) {
                const basket = vaultData.baskets[i];
                console.log(`バスケット ${i + 1}:`);
                console.log(`  ウェイト: ${basket.weight}`);
                console.log(`  Jettonウォレット: ${basket.jettonWalletAddress}`);
                console.log(`  Jettonマスター: ${basket.jettonMasterAddress}`);
            }
        }
        
        console.log('\nPreparing to update Vault configuration...');
    } catch (error) {
        console.warn('Could not fetch current vault data:', error instanceof Error ? error.message : String(error));
        console.log('Continuing with code and data update anyway...');
    }

    // 4. Configure Jetton Data if needed
    let newContent = jettonData.content;
    if (updateJettonData) {
        console.log('\nEnter new Jetton information (press Enter to keep current value):');
        
        // 現在のメタデータを取得するヘルパー関数
        async function getJettonContent(contentCell: Cell): Promise<{
            name: string;
            description: string;
            symbol: string;
            image: string;
            decimals: number;
        }> {
            const result = {
                name: '',
                description: '',
                symbol: '',
                image: '',
                decimals: 9
            };

            try {
                console.log('Parsing content cell...');
                const slice = contentCell.beginParse();
                
                // 最初の参照を取得（辞書が格納されているセル）
                const dictCell = slice.loadRef();
                console.log('Loaded dict cell');
                
                const dict = Dictionary.loadDirect(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell(), dictCell);
                console.log('Loaded dictionary');
                
                // キーを準備
                const nameKey = Buffer.alloc(32);
                const descriptionKey = Buffer.alloc(32);
                const symbolKey = Buffer.alloc(32);
                const imageKey = Buffer.alloc(32);
                const decimalsKey = Buffer.alloc(32);
                
                Buffer.from('name').copy(nameKey);
                Buffer.from('description').copy(descriptionKey);
                Buffer.from('symbol').copy(symbolKey);
                Buffer.from('image').copy(imageKey);
                Buffer.from('decimals').copy(decimalsKey);
                
                // 各メタデータを取得
                const getStringValue = (key: Buffer): string => {
                    try {
                        const cell = dict.get(key);
                        if (!cell) {
                            console.log(`Key not found in dictionary: ${key.toString('hex')}`);
                            return '';
                        }
                        const slice = cell.beginParse();
                        const bytes = slice.loadBuffer(slice.remainingBits / 8);
                        return bytes.toString('utf-8');
                    } catch (e) {
                        console.warn(`Error reading key ${key.toString('hex')}:`, e);
                        return '';
                    }
                };
                
                result.name = getStringValue(nameKey) || 'Unknown Token';
                result.description = getStringValue(descriptionKey);
                result.symbol = getStringValue(symbolKey) || 'UNKNOWN';
                result.image = getStringValue(imageKey);
                
                // decimalsの取得
                try {
                    const decimalsCell = dict.get(decimalsKey);
                    if (decimalsCell) {
                        result.decimals = decimalsCell.beginParse().loadUint(8);
                    }
                } catch (e) {
                    console.warn('Error reading decimals:', e);
                }
                
                console.log('Parsed metadata:', result);
                
            } catch (e) {
                console.warn('Failed to parse jetton content:', e);
            }
            
            return result;
        }
        
        // 現在のメタデータを取得
        let currentContent = { name: '', description: '', symbol: '', image: '', decimals: 9 };
        try {
            if (jettonData.content) {
                currentContent = await getJettonContent(jettonData.content);
            }
        } catch (e) {
            console.warn('Failed to parse current jetton content, using defaults:', e);
        }
        
        // ユーザー入力を受け付ける
        const name = await ui.input(`Name [${currentContent.name}]: `) || currentContent.name;
        const description = await ui.input(`Description [${currentContent.description}]: `) || currentContent.description;
        const symbol = await ui.input(`Symbol [${currentContent.symbol}]: `) || currentContent.symbol;
        const image = await ui.input(`Image URL [${currentContent.image}]: `) || currentContent.image;
        const decimals = parseInt(await ui.input(`Decimals [${currentContent.decimals}]: `) || currentContent.decimals.toString());
        
        console.log('\nCreating new metadata content...');
        // TEP-64 に準拠したメタデータの作成
        // 参照: https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
        console.log('\nCreating new metadata content (TEP-64 compliant)...');
        
        // メタデータの辞書を作成（キーはBufferで32バイト）
        const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
        
        // キーをSHA256ハッシュ化
        const sha256 = (str: string): Buffer => {
            const hash = require('crypto').createHash('sha256');
            return hash.update(str).digest();
        };
        
        // メタデータキー（TEP-64準拠）
        const KEYS = {
            NAME: sha256('name'),
            DESCRIPTION: sha256('description'),
            SYMBOL: sha256('symbol'),
            IMAGE: sha256('image'),
            DECIMALS: sha256('decimals')
        };
        
        // 文字列をセルに格納するヘルパー関数
        const storeString = (key: Buffer, value: string): void => {
            if (value && value.trim() !== '') {
                console.log(`Setting ${key.toString('hex')}: ${value}`);
                const cell = beginCell();
                cell.storeBuffer(Buffer.from(value, 'utf-8'));
                dict.set(key, cell.endCell());
            } else {
                console.log(`Skipping empty value for key: ${key.toString('hex')}`);
            }
        };
        
        // 数値をセルに格納するヘルパー関数
        const storeNumber = (key: Buffer, value: number): void => {
            console.log(`Setting ${key.toString('hex')}: ${value}`);
            const cell = beginCell();
            cell.storeUint(value, 8);
            dict.set(key, cell.endCell());
        };
        
        // メタデータを辞書に設定
        storeString(KEYS.NAME, name);
        storeString(KEYS.DESCRIPTION, description);
        storeString(KEYS.SYMBOL, symbol);
        storeString(KEYS.IMAGE, image);
        
        // decimalsを設定（8ビット符号なし整数）
        const decimalsValue = isNaN(parseInt(decimals.toString())) ? 9 : parseInt(decimals.toString());
        storeNumber(KEYS.DECIMALS, decimalsValue);
        
        // 辞書をセルに格納
        console.log('Creating dictionary cell...');
        const dictCell = beginCell();
        dictCell.storeDict(dict);
        
        // コンテンツセルに辞書を参照として追加
        console.log('Storing dictionary reference in content cell...');
        const contentCell = beginCell();
        contentCell.storeRef(dictCell.endCell());
        
        // 最終的なコンテンツセル
        newContent = contentCell.endCell();
        console.log('New content cell created successfully');
        
        console.log('\nNew Jetton data:');
        console.log(JSON.stringify({
            name,
            description,
            symbol,
            image,
            decimals
        }, null, 2));
    }

    // 5. Configure Baskets if needed
    let baskets;
    if (updateBaskets) {
        const basketCount = parseInt(
            await ui.input('How many baskets do you want to configure? ')
        );
        if (isNaN(basketCount) || basketCount <= 0) {
            throw new Error('Invalid basket count');
        }

        baskets = [];
        for (let i = 0; i < basketCount; i++) {
            baskets.push(
                await inputBasket(ui, tonClient, vault.address, i)
            );
        }
    } else {
        // Use existing baskets when only updating code
        console.log('\nUsing existing basket configuration...');
        const vaultData = await vault.getVaultData();
        baskets = vaultData.baskets;
        console.log(`Found ${baskets.length} existing baskets`);
    }

    // 変更予定のデータを表示
    console.log('\n適用される設定:');
    console.log('--------------');
    const modeDescription = 
        updateBaskets ? 'コードとバスケット構成' : 
        updateJettonData ? 'コードとジェットンデータ' : 'コードのみ';
    console.log(`更新モード: ${modeDescription}`);
    console.log(`管理者アドレス: ${jettonData.adminAddress}`);
    console.log(`バスケット数: ${baskets.length}`);
    
    if (baskets.length > 0) {
        console.log('\nバスケット構成:');
        for (let i = 0; i < baskets.length; i++) {
            const basket = baskets[i];
            console.log(`\nバスケット ${i + 1}:`);
            console.log(`  ウェイト: ${basket.weight}`);
            console.log(`  Jettonウォレット: ${basket.jettonWalletAddress}`);
            console.log(`  Jettonマスター: ${basket.jettonMasterAddress}`);
        }
    } else {
        console.log('\n警告: バスケットが設定されていません');
    }
    
    // ガス量のカスタマイズオプション
    let gasAmount = toNano('0.05'); // デフォルトは0.05 TON
    
    const customGas = await ui.choose(
        '\nUse custom gas amount for this update?',
        ['No (Use default 0.05 TON)', 'Yes (Custom)'],
        (v) => v
    );
    
    if (customGas === 'Yes (Custom)') {
        console.log('\nEnter custom gas amount:');
        console.log('Examples:');
        console.log('  0.1 = 0.10 TON');
        const gasValue = parseFloat(await ui.input('Enter gas amount in TON: '));
        
        if (!isNaN(gasValue) && gasValue > 0) {
            gasAmount = toNano(gasValue.toString());
            console.log(`Using custom gas amount: ${gasValue} TON`);
        } else {
            console.log('Invalid gas amount, using default 0.5 TON');
        }
    } else {
        console.log('Using default gas amount: 0.5 TON');
    }
    
    // 実行確認
    const confirmUpdate = await ui.choose(
        '\nProceed with Vault update?',
        ['Yes, update the Vault', 'No, cancel the operation'],
        (v) => v
    );
    
    if (confirmUpdate === 'No, cancel the operation') {
        console.log('Operation cancelled by user.');
        return;
    }

    // 新しい設定を構築
    let newTotalSupply = jettonData.totalSupply;
    
    // 4. Update total_supply if needed
    if (updateTotalSupply) {
        const newSupply = await ui.input(`\n現在の total_supply: ${newTotalSupply}\n新しい total_supply を入力: `);
        try {
            newTotalSupply = BigInt(newSupply);
            console.log(`total_supply を ${newTotalSupply} に更新します`);
        } catch (e) {
            console.warn(`無効な total_supply の値です。現在の値 (${newTotalSupply}) を維持します。`);
        }
    }

    const newConfig: VaultConfig = {
        adminAddress: jettonData.adminAddress,
        content: updateJettonData ? newContent : jettonData.content,
        walletCode: jettonData.walletCode,
        baskets: baskets,
        totalSupply: newTotalSupply,
    };
    
    // 新しい total_supply を表示
    if (updateTotalSupply) {
        console.log(`新しい total_supply: ${newTotalSupply}`);
    }

    console.log('\nNew Configuration:');
    console.log(JSON.stringify({
        adminAddress: newConfig.adminAddress.toString(),
        totalSupply: (newConfig.totalSupply || 0n).toString(),
        baskets: newConfig.baskets.length,
        updateJettonData: updateJettonData
    }, null, 2));

    // コードとデータを更新
    console.log('\nUpdating Vault code and data...');
    if (!updateTotalSupply) {
        console.log(`Current total_supply: ${jettonData.totalSupply} will be preserved`);
    }
    
    try {
        await vault.sendChangeCodeAndData(
            provider.sender(),
            await compile('Vault'),
            newConfig,
            gasAmount
        );
        console.log('Transaction sent successfully!');
    } catch (error) {
        console.error('Error updating Vault:', error);
        console.log('Please check your wallet and try again.');
    }
}

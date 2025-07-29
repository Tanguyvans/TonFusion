import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
} from '@ton/core';

export interface SwapsInfo {
    userAddress: Address;
    indexAmount: bigint;
    receivedExcesses: number;
    excessGas: bigint;
    timestamp: bigint;
}
export const SwapsInfoValue = {
    serialize: (src: SwapsInfo, builder: any) => {
        builder.storeAddress(src.userAddress);  // アドレスとして保存
        builder.storeCoins(src.indexAmount);    // VarUIntegerとして保存
        builder.storeUint(src.receivedExcesses, 8);
        builder.storeCoins(src.excessGas);      // VarUIntegerとして保存
        builder.storeUint(src.timestamp, 32);
    },
    parse: (slice: any): SwapsInfo => {
        const userAddress = slice.loadAddress();  // アドレスとして読み込み   
        const indexAmount = slice.loadCoins();    // VarUIntegerとして読み込み
        const receivedExcessesRaw = slice.loadUint(8);
        const receivedExcesses = Number(receivedExcessesRaw); 
        const excessGas = slice.loadCoins();      // VarUIntegerとして読み込み
        const timestamp = slice.loadUint(32); 
        return { userAddress, indexAmount, receivedExcesses, excessGas, timestamp };
    }
};

export interface VaultConfig {
    adminAddress: Address;
    content: Cell;
    walletCode: Cell;
    dictSwapsInfo?: Dictionary<bigint, SwapsInfo>;
    totalSupply?: bigint;
};

export function vaultConfigToCell(config: VaultConfig, isMainnet: boolean = false): Cell {
    // スワップIDに紐づく情報辞書
    let swapsInfoDict = config.dictSwapsInfo || Dictionary.empty(
        Dictionary.Keys.BigUint(64),
        SwapsInfoValue
    );
    
    // サンプルデータが必要な場合（デバッグ用）
    if (Object.keys(swapsInfoDict).length === 0) {
        // ネットワークに応じてアドレスを切り替え
        const sampleAddress = isMainnet 
            ? 'UQAwUvvYnPpImBfrKl3-KRYh05aNrUKTGgcarTB_yzhAtwpk'
            : 'EQB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6n1e';
            
        const userAddress1 = Address.parse(sampleAddress);
        // 新しいクエリIDで登録（デバッグ用）
        swapsInfoDict.set(54321n, {
            userAddress: userAddress1,
            indexAmount: 1000000000n,
            receivedExcesses: 0,
            excessGas: 0n,
            timestamp: BigInt(Math.floor(Date.now() / 1000))
        });
        
    }
    
    // ストレージレイアウトに従ってセルを構築
    return beginCell()
        .storeRef(
            beginCell()
                .storeCoins(config.totalSupply || 0n)
                .storeAddress(config.adminAddress)
                .storeRef(config.content)
                .storeRef(config.walletCode)
                .endCell()
        )
        .storeBit(0) // stopped: false
        .storeDict(swapsInfoDict)
        .endCell();
}

export class Vault implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Vault(address);
    }

    static createFromConfig(config: VaultConfig, code: Cell, workchain = 0, isMainnet: boolean = false) {
        const data = vaultConfigToCell(config, isMainnet);
        const init = { code, data };
        return new Vault(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        return res.stack.readAddress();
    }

    async getVaultData(provider: ContractProvider) {
        const result = await provider.get('get_vault_data', []);
        const stopped = result.stack.readNumber();
        const dictQueryInfo = result.stack.readCell();
        
        return {
            stopped: stopped !== 0,
            dictQueryInfo
        };
    }

    async getJettonData(provider: ContractProvider) {
        const res = await provider.get('get_jetton_data', []);
        const totalSupply = res.stack.readBigNumber();
        const mintable = res.stack.readBoolean();
        const adminAddress = res.stack.readAddress();
        const content = res.stack.readCell();
        const walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode,
        };
    }

    async getTotalSupply(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        const res = await this.getJettonData(provider);
        return res.content;
    }
    
    /**
     * クエリIDに紐づく情報を取得する
     * @param provider コントラクトプロバイダー
     * @returns クエリIDとユーザー情報のマップ
     */
    async getQueryInfo(provider: ContractProvider): Promise<Map<bigint, { userAddress: Address, indexAmount: bigint, receivedExcesses: number, excessGas: bigint, timestamp: bigint }>> {
        try {
            const res = await provider.get('get_vault_data', []);
            const stopped = res.stack.readNumber();
            const queryInfoCell = res.stack.readCellOpt();
            
            if (!queryInfoCell) {
                return new Map();
            }
            
            // 新方式のSwapsInfoValueで辞書をロード
            const swapsInfoDict = Dictionary.loadDirect(
                Dictionary.Keys.BigUint(64),
                SwapsInfoValue,
                queryInfoCell
            );
            
            // 結果をマップとして返す
            const resultMap = new Map<bigint, { userAddress: Address, indexAmount: bigint, receivedExcesses: number, excessGas: bigint, timestamp: bigint }>();
            
            // 辞書の各エントリを処理
            for (const [queryId, info] of swapsInfoDict) {
                try {
                    // 新しいSwapsInfo型ではアドレスが直接利用可能
                    const userAddress = info.userAddress;
                    
                    // 結果マップに追加
                    resultMap.set(queryId, {
                        userAddress,
                        indexAmount: info.indexAmount,
                        receivedExcesses: info.receivedExcesses,
                        excessGas: info.excessGas,
                        timestamp: info.timestamp
                    });
                } catch (e) {
                    console.log('クエリID情報の解析エラー。この項目はスキップします。', e);
                }
            }
            
            return resultMap;
        } catch (error: any) {
            console.error('Error in getQueryInfo:', error);
            return new Map();
        }
    }
}


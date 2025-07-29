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
    toNano,
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
        builder.storeAddress(src.userAddress);  // Address
        builder.storeCoins(src.indexAmount);    // VarUInteger
        builder.storeUint(src.receivedExcesses, 8);
        builder.storeCoins(src.excessGas);      // VarUInteger
        builder.storeUint(src.timestamp, 32);
    },
    parse: (slice: any): SwapsInfo => {
        const userAddress = slice.loadAddress();  // Address
        const indexAmount = slice.loadCoins();    // VarUInteger
        const receivedExcessesRaw = slice.loadUint(8);
        const receivedExcesses = Number(receivedExcessesRaw); 
        const excessGas = slice.loadCoins();      // VarUInteger
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
    jettonMaster?: Address;
    jettonWallet?: Address;
};

export function vaultConfigToCell(config: VaultConfig, isMainnet: boolean = false): Cell {
    // SwapsInfo dictionary
    let swapsInfoDict = config.dictSwapsInfo || Dictionary.empty(
        Dictionary.Keys.BigUint(64),
        SwapsInfoValue
    );
    
    // Sample data is required for debugging
    if (Object.keys(swapsInfoDict).length === 0) {
        // Switch address based on network
        const sampleAddress = isMainnet 
            ? 'UQAwUvvYnPpImBfrKl3-KRYh05aNrUKTGgcarTB_yzhAtwpk'
            : 'EQB-re93kxeCoDDQ66RUZuG382uIAg3bhiFCzrlaeBTN6n1e';
            
        const userAddress1 = Address.parse(sampleAddress);
        // Register new query ID (for debugging)
        swapsInfoDict.set(54321n, {
            userAddress: userAddress1,
            indexAmount: 1000000000n,
            receivedExcesses: 0,
            excessGas: 0n,
            timestamp: BigInt(Math.floor(Date.now() / 1000))
        });
        
    }
    const jettonData = beginCell()
        .storeCoins(config.totalSupply || 0n)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.walletCode)
        .endCell();
    
    // Build cell according to storage layout
    return beginCell()
        .storeRef(jettonData)
        .storeBit(true) // stopped: true
        .storeAddress(config.jettonMaster || config.adminAddress) // Default to admin address if not specified
        .storeAddress(config.jettonWallet || config.adminAddress) // Default to admin address if not specified
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
        const jettonMaster = result.stack.readAddress();
        const jettonWallet = result.stack.readAddress();
        
        // Handle the case where dict_swaps_info might be null
        let dictSwapsInfo = null;
        try {
            dictSwapsInfo = result.stack.readCell();
        } catch (e) {
            // If reading cell fails, keep it as null
            console.log('dict_swaps_info is null');
        }
        
        return {
            stopped: stopped !== 0,
            jettonMaster,
            jettonWallet,
            dictSwapsInfo
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

    async getJettonMaster(provider: ContractProvider): Promise<Address> {
        const res = await this.getVaultData(provider);
        return res.jettonMaster;
    }

    async getJettonWallet(provider: ContractProvider): Promise<Address> {
        const res = await this.getVaultData(provider);
        return res.jettonWallet;
    }

    /**
     * Change vault data (admin only)
     * @param provider Contract provider
     * @param via Sender address
     * @param params Parameters for changing vault data
     */
    async sendChangeVaultData(
        provider: ContractProvider,
        via: Sender,
        params: {
            stopped: boolean;
            jettonMaster: Address | null;
            jettonWallet: Address | null;
            value?: bigint; //Amount of TON to send with the transaction
        }
    ) {
        const { stopped, jettonMaster, jettonWallet, value = toNano('0.05') } = params;
        
        const messageBody = beginCell()
            .storeUint(0xf1b32984, 32) // op::change_vault_data()
            .storeBit(stopped)
            .storeAddress(jettonMaster)
            .storeAddress(jettonWallet)
            .storeDict(null) // dict_swaps_info - pass null to keep existing
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: messageBody,
        });
    }
    
    /**
     * SwapsInfo map
     * @param provider Contract provider
     * @returns SwapsInfo map
     */
    async getSwapsInfo(provider: ContractProvider): Promise<Map<bigint, { userAddress: Address, indexAmount: bigint, receivedExcesses: number, excessGas: bigint, timestamp: bigint }>> {
        try {
            const res = await provider.get('get_vault_data', []);
            const stopped = res.stack.readNumber();
            const swapsInfoCell = res.stack.readCellOpt();
            
            if (!swapsInfoCell) {
                return new Map();
            }
            
            // Load dictionary using SwapsInfoValue
            const swapsInfoDict = Dictionary.loadDirect(
                Dictionary.Keys.BigUint(64),
                SwapsInfoValue,
                swapsInfoCell
            );
            
            // Result map
            const resultMap = new Map<bigint, { userAddress: Address, indexAmount: bigint, receivedExcesses: number, excessGas: bigint, timestamp: bigint }>();
            
            // Process each entry in the dictionary
            for (const [swapId, info] of swapsInfoDict) {
                try {
                    // Address is directly available in the new SwapsInfo type
                    const userAddress = info.userAddress;
                    
                    // Add to result map
                    resultMap.set(swapId, {
                        userAddress,
                        indexAmount: info.indexAmount,
                        receivedExcesses: info.receivedExcesses,
                        excessGas: info.excessGas,
                        timestamp: info.timestamp
                    });
                } catch (e) {
                    console.log('SwapsID information parsing error. Skipping this item.', e);
                }
            }
            
            return resultMap;
        } catch (error: any) {
            console.error('Error in getSwapsInfo:', error);
            return new Map();
        }
    }
}


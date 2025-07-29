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
    ethereumUser: bigint;    // 160-bit Ethereum address
    tonUser: Address;        // TON address (MsgAddress)
    amount: bigint;          // Amount in coins
    deadline: bigint;        // UNIX timestamp
    status: number;          // 0=init, 1=completed, 2=refunded
}

export const SwapsInfoValue = {
    serialize: (src: SwapsInfo, builder: any) => {
        builder.storeUint(src.ethereumUser, 160);  // 160-bit Ethereum address
        builder.storeAddress(src.tonUser);         // TON address (MsgAddress)
        builder.storeCoins(src.amount);            // Amount in coins
        builder.storeUint(src.deadline, 64);       // Deadline (UNIX timestamp)
        builder.storeUint(src.status, 2);          // Status (2 bits)
    },
    parse: (slice: any): SwapsInfo => {
        const ethereumUser = slice.loadUintBig(160);  // 160-bit Ethereum address
        const tonUser = slice.loadAddress();          // TON address (MsgAddress)
        const amount = slice.loadCoins();             // Amount in coins
        const deadline = slice.loadUintBig(64);        // Deadline (UNIX timestamp)
        const status = slice.loadUint(2);             // Status (2 bits)
        return { ethereumUser, tonUser, amount, deadline, status };
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
            dictSwapsInfo: Dictionary<bigint, SwapsInfo>;
            value?: bigint; // Amount of TON to send with the transaction
        }
    ) {
        const { stopped, jettonMaster, jettonWallet, dictSwapsInfo, value = toNano('0.1') } = params;
        
        const messageBody = beginCell()
            .storeUint(0xf1b32984, 32) // op::change_vault_data()
            .storeUint(0, 64) // query_id
            .storeBit(stopped)
            .storeAddress(jettonMaster)
            .storeAddress(jettonWallet)
            .storeDict(dictSwapsInfo) // dict_swaps_info - pass null to keep existing
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: messageBody,
        });
    }
    
    /**
     * Get swaps info map
     * @param provider Contract provider
     * @returns Map of swap ID to SwapsInfo
     */
    async getSwapsInfo(provider: ContractProvider): Promise<Map<bigint, SwapsInfo>> {
        try {
            const res = await provider.get('get_vault_data', []);
            // Skip stopped, jettonMaster, jettonWallet
            res.stack.readNumber(); // stopped
            res.stack.readAddress(); // jettonMaster
            res.stack.readAddress(); // jettonWallet
            
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
            
            // Convert to Map
            const resultMap = new Map<bigint, SwapsInfo>();
            
            for (const [swapId, info] of swapsInfoDict) {
                try {
                    resultMap.set(swapId, info);
                } catch (e) {
                    console.error('Error parsing swap info for ID', swapId, ':', e);
                }
            }
            
            return resultMap;
        } catch (error: any) {
            console.error('Error in getSwapsInfo:', error);
            return new Map();
        }
    }
    
    /**
     * Get swap info by ID
     * @param provider Contract provider
     * @param swapId Swap ID
     * @returns SwapsInfo or null if not found
     */
    async getSwapInfo(provider: ContractProvider, swapId: bigint): Promise<SwapsInfo | null> {
        const swapsInfo = await this.getSwapsInfo(provider);
        return swapsInfo.get(swapId) || null;
    }

    /**
     * Register a new deposit
     * @param provider Contract provider
     * @param via Sender address
     * @param params Deposit parameters
     */
    async sendRegisterDeposit(
        provider: ContractProvider,
        via: Sender,
        params: {
            swapId: bigint;
            ethereumUser: bigint;  // 160-bit Ethereum address
            tonUser: Address;      // TON address
            amount: bigint;        // Amount to deposit
            deadline: bigint;      // Deadline (UNIX timestamp)
            value?: bigint;        // Amount of TON to send with the transaction
        }
    ) {
        const { swapId, ethereumUser, tonUser, amount, deadline, value = toNano('0.05') } = params;
        
        const messageBody = beginCell()
            .storeUint(0xf1b32984, 32) // op::register_deposit()
            .storeUint(swapId, 64)      // swap_id
            .storeUint(ethereumUser, 160) // ethereum_user (160-bit)
            .storeAddress(tonUser)       // ton_user (MsgAddress)
            .storeCoins(amount)          // amount (coins)
            .storeUint(deadline, 64)     // deadline (UNIX timestamp)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: messageBody,
        });
    }
}


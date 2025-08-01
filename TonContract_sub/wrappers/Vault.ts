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
import { Op } from '../utils/Constants';

export interface SwapsInfo {
    swapId: bigint;          // 256-bit Swap ID
    ethAddr: bigint;    // 160-bit Ethereum address
    tonAddr: Address;   // TON address (MsgAddress)
    amount: bigint;          // Amount in coins
    creationTimestamp: bigint;        // UNIX timestamp (32-bit)
    withdrawalDeadline: bigint;       // Withdrawal deadline (32-bit)
    publicWithdrawalDeadline: bigint; // Public withdrawal deadline (32-bit)
    cancellationDeadline: bigint;     // Cancellation deadline (32-bit)
    publicCancellationDeadline: bigint; // Public cancellation deadline (32-bit)
    status: number;          // 0=init, 1=completed, 2=refunded
}

export const SwapsInfoValue = {
    serialize: (src: SwapsInfo, builder: any) => {
        builder.storeUint(src.swapId, 256);           // 256-bit Swap ID
        builder.storeUint(src.ethAddr, 160);     // 160-bit Ethereum address
        builder.storeAddress(src.tonAddr);       // TON address (MsgAddress)
        builder.storeCoins(src.amount);               // Amount in coins
        builder.storeUint(src.creationTimestamp, 32);          // Creation timestamp (32-bit)
        builder.storeUint(src.withdrawalDeadline, 32);          // Withdrawal deadline (32-bit)
        builder.storeUint(src.publicWithdrawalDeadline, 32);    // Public withdrawal deadline (32-bit)
        builder.storeUint(src.cancellationDeadline, 32);        // Cancellation deadline (32-bit)
        builder.storeUint(src.publicCancellationDeadline, 32);  // Public cancellation deadline (32-bit)
        builder.storeUint(src.status, 2);             // Status (2 bits)
    },
    parse: (slice: any): SwapsInfo => {
        const swapId = slice.loadUintBig(256);        // 256-bit Swap ID
        const ethAddr = slice.loadUintBig(160);  // 160-bit Maker's Ethereum address
        const tonAddr = slice.loadAddress();     // Maker's TON address (MsgAddress)
        const amount = slice.loadCoins();             // Amount in coins
        const creationTimestamp = slice.loadUintBig(32);       // Creation timestamp (32-bit)
        const withdrawalDeadline = slice.loadUintBig(32);      // Withdrawal deadline (32-bit)
        const publicWithdrawalDeadline = slice.loadUintBig(32); // Public withdrawal deadline (32-bit)
        const cancellationDeadline = slice.loadUintBig(32);     // Cancellation deadline (32-bit)
        const publicCancellationDeadline = slice.loadUintBig(32); // Public cancellation deadline (32-bit)
        const status = slice.loadUint(2);             // Status (2 bits)
        return { 
            swapId, 
            ethAddr, 
            tonAddr, 
            amount, 
            creationTimestamp, 
            withdrawalDeadline, 
            publicWithdrawalDeadline, 
            cancellationDeadline, 
            publicCancellationDeadline, 
            status 
        };
    }
};

/**
 * Vault configuration interface
 * @property adminAddress - Admin address of the vault
 * @property content - Vault content cell
 * @property walletCode - Wallet code cell
 * @property dictSwapsInfo - Dictionary of swaps info (optional)
 * @property totalSupply - Total supply of tokens (optional)
 * @property jettonMaster - Jetton master address (optional)
 * @property jettonWallet - Jetton wallet address (optional)
 */
export interface VaultConfig {
    adminAddress: Address;
    content: Cell;
    walletCode: Cell;
    dictSwapsInfo?: Dictionary<bigint, SwapsInfo>;
    totalSupply?: bigint;
    jettonMaster?: Address;
    jettonWallet?: Address;
};

/**
 * Convert VaultConfig to Cell
 * @param config - Vault configuration
 * @param isMainnet - Whether to use mainnet (default: false)
 * @returns Cell containing vault configuration
 */
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
     * @param queryId Query ID
     * @returns SwapsInfo or null if not found
     */
    async getSwapInfo(provider: ContractProvider, queryId: bigint): Promise<SwapsInfo | null> {
        const swapsInfo = await this.getSwapsInfo(provider);
        return swapsInfo.get(queryId) || null;
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
            queryId: bigint;
            swapId: bigint;          // 256-bit Swap ID
            ethAddr: bigint;    // 160-bit Ethereum address
            tonAddr: Address;   // TON address (MsgAddress)
            amount: bigint;          // Amount to deposit
            withdrawalDeadline: bigint;        // Withdrawal deadline (UNIX timestamp)
            publicWithdrawalDeadline: bigint; // Public withdrawal deadline (UNIX timestamp)
            cancellationDeadline: bigint;       // Cancellation deadline (UNIX timestamp)
            publicCancellationDeadline: bigint; // Public cancellation deadline (UNIX timestamp)
            value?: bigint;          // Amount of TON to send with the transaction
        }
    ) {
        const { queryId, swapId, ethAddr, tonAddr, amount, withdrawalDeadline, publicWithdrawalDeadline, cancellationDeadline, publicCancellationDeadline, value = toNano('0.05') } = params;
        
        const messageBody = beginCell()
            .storeUint(0xf1b32984, 32) // op::register_deposit()
            .storeUint(queryId, 64)      // query_id
            .storeUint(swapId, 256)      // swap_id (256-bit)
            .storeUint(ethAddr, 160) // ethAddr (160-bit)
            .storeAddress(tonAddr)   // tonAddr (MsgAddress)
            .storeCoins(amount)          // amount (coins)
            .storeUint(withdrawalDeadline, 64)     // deadline (UNIX timestamp)
            .storeUint(publicWithdrawalDeadline, 64)     // deadline (UNIX timestamp)
            .storeUint(cancellationDeadline, 64)     // deadline (UNIX timestamp)
            .storeUint(publicCancellationDeadline, 64)     // deadline (UNIX timestamp)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: messageBody,
        });
    }
    /**
     * Send admin message
     * @param provider Contract provider
     * @param via Sender address
     * @param message Message cell
     * @param mode Send mode
     */
    async sendAdminMessage(
        provider: ContractProvider,
        via: Sender,
        msg: Cell,
        mode: number,
        value: bigint = toNano('0.05'),
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.sendAdminMessageMessage(msg, mode),
            value,
        });
    }

    static sendAdminMessageMessage(msg: Cell, mode: number) {
        return beginCell()
            .storeUint(Op.send_admin_message, 32)
            .storeUint(0, 64)
            .storeRef(msg)
            .storeUint(mode, 8)
            .endCell();
    }

    static changeCodeAndDataMessage(code: Cell, config: VaultConfig, isMainnet: boolean = false) {
        return beginCell()
            .storeUint(Op.change_code_and_data, 32)
            .storeUint(0, 64)
            .storeRef(code)
            .storeRef(vaultConfigToCell(config, isMainnet))
            .endCell();
    }
    async sendChangeCodeAndData(
        provider: ContractProvider,
        via: Sender,
        code: Cell,
        config: VaultConfig,
        value: bigint = toNano('0.05'),
        isMainnet: boolean = false,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Vault.changeCodeAndDataMessage(code, config, isMainnet),
        });
    }
}


import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TonResolverConfig = {
    adminAddress: Address;
    resolverAddress: Address;
};

export function tonResolverConfigToCell(config: TonResolverConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.resolverAddress)
        .storeBit(1)      // active (true)
        .storeUint(0, 32) // total_swaps
        .storeDict(null)  // swap_dict
        .storeDict(null)  // status_dict
        .endCell();
}

export class TonResolver implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TonResolver(address);
    }

    static createFromConfig(config: TonResolverConfig, code: Cell, workchain = 0) {
        const data = tonResolverConfigToCell(config);
        const init = { code, data };
        return new TonResolver(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDepositForEthSwap(
        provider: ContractProvider,
        via: Sender,
        opts: {
            ethRecipient: string;  // ETH address as hex string
            timeout: number;       // Unix timestamp
            value: bigint;         // TON amount + gas
            queryId?: number;
        }
    ) {
        // Store ETH address as 20 bytes directly
        const ethAddressBytes = Buffer.from(opts.ethRecipient.slice(2), 'hex');
        
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x1a2b3c4d, 32) // op::deposit_for_eth_swap
                .storeUint(opts.queryId ?? 0, 64)
                .storeBuffer(ethAddressBytes)  // Store 20-byte ETH address directly
                .storeUint(opts.timeout, 32)
                .endCell(),
        });
    }

    async sendCompleteEthToTonSwap(
        provider: ContractProvider,
        via: Sender,
        opts: {
            swapId: bigint;
            tonRecipient: Address;
            amount: bigint;
            ethTxHash: string;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: 100000000n, // 0.1 TON for gas
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x2b3c4d5e, 32) // op::complete_eth_to_ton_swap
                .storeUint(opts.queryId ?? 0, 64)
                .storeUint(Number(opts.swapId), 64)
                .storeAddress(opts.tonRecipient)
                .storeCoins(opts.amount)
                .storeRef(beginCell().storeBuffer(Buffer.from(opts.ethTxHash.slice(2), 'hex')).endCell())
                .endCell(),
        });
    }

    async sendCancelSwap(
        provider: ContractProvider,
        via: Sender,
        opts: {
            swapId: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: 100000000n, // 0.1 TON for gas
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x3c4d5e6f, 32) // op::cancel_swap
                .storeUint(opts.queryId ?? 0, 64)
                .storeUint(Number(opts.swapId), 64)
                .endCell(),
        });
    }

    async getResolverInfo(provider: ContractProvider) {
        const result = await provider.get('get_resolver_info', []);
        return {
            active: result.stack.readBoolean(),
            adminAddress: result.stack.readAddress(),
            resolverAddress: result.stack.readAddress(),
            totalSwaps: result.stack.readNumber(),
        };
    }

    async getSwapInfo(provider: ContractProvider, swapId: bigint) {
        const result = await provider.get('get_swap_info', [{ type: 'int', value: swapId }]);
        return {
            found: result.stack.readBoolean(),
            maker: result.stack.readAddressOpt(),
            ethRecipient: result.stack.readAddressOpt(),
            amount: result.stack.readBigNumber(),
            timeout: result.stack.readNumber(),
            createdAt: result.stack.readNumber(),
            status: result.stack.readNumber(),
        };
    }

    async sendSimpleDeposit(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;         // TON amount + gas
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x1234abcd, 32) // op::simple_deposit
                .storeUint(opts.queryId ?? 0, 64)
                .endCell(),
        });
    }
}
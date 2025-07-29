import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SimpleVaultConfig = {
    ownerAddress: Address;
    totalBalance?: bigint;
};

export function simpleVaultConfigToCell(config: SimpleVaultConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeCoins(config.totalBalance || 0n)
        .endCell();
}

export const Opcodes = {
    deposit: 0x1,
    withdraw: 0x2,
    getBalance: 0x3,
};

export class SimpleVault implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SimpleVault(address);
    }

    static createFromConfig(config: SimpleVaultConfig, code: Cell, workchain = 0) {
        const data = simpleVaultConfigToCell(config);
        const init = { code, data };
        return new SimpleVault(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deposit, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            withdrawAmount: bigint;
            queryId?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdraw, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeCoins(opts.withdrawAmount)
                .endCell(),
        });
    }

    async getVaultData(provider: ContractProvider) {
        const result = await provider.get('get_vault_data', []);
        return {
            ownerAddress: result.stack.readAddress(),
            totalBalance: result.stack.readBigNumber(),
        };
    }

    async getBalance(provider: ContractProvider) {
        const result = await provider.get('get_vault_balance', []);
        return result.stack.readBigNumber();
    }
}
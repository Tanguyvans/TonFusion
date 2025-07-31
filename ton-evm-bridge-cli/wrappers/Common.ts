import { Address, JettonMaster, TonClient } from '@ton/ton';
import { Cell } from '@ton/core';
import { compile as blueprintCompile } from '@ton/blueprint';

export async function getJettonWalletAddr(tonClient: TonClient, masterAddr: Address, ownerAddr: Address) {
    const openedMaster = tonClient.open(JettonMaster.create(masterAddr));
    const walletAddr = await openedMaster.getWalletAddress(ownerAddr);
    return walletAddr;
}

export async function compile(contractName: string): Promise<Cell> {
    // Blueprint's compile function expects the contract name and will look for
    // the corresponding .compile.ts file in the current working directory
    return await blueprintCompile(contractName);
}

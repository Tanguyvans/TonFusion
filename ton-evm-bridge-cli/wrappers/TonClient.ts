import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Sender, SenderArguments, beginCell } from '@ton/core';

export function getTonClient(network: 'mainnet' | 'testnet') {
    return new TonClient({
        endpoint:
            network === 'mainnet'
                ? 'https://toncenter.com/api/v2/jsonRPC'
                : 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey:
            network === 'mainnet'
                ? 'a548fc361485e4d5668f3fb71b2ef7467db084b2fa4816d7b2366790b05a87c1'
                : '9ddcd69ada64b6190b44a1fbb9f1e14ffd175a8b4ddd8b643edf96f5e7321102',
    });
}

export async function getWallet(isTestnet: boolean = true) {
    // Default mnemonic for development - NEVER use in production
    const testMnemonic = [
        'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
        'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
        'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
        'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'art'
    ];
    
    const keyPair = await mnemonicToPrivateKey(testMnemonic);
    const client = getTonClient(isTestnet ? 'testnet' : 'mainnet');
    
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    
    const contract = client.open(wallet);
    
    // Create a proper Sender implementation
    const sender: Sender = {
        address: wallet.address,
        send: async (args: SenderArguments) => {
            await contract.sendTransfer({
                seqno: await contract.getSeqno(),
                secretKey: keyPair.secretKey,
                messages: [internal({
                    to: args.to,
                    value: args.value,
                    body: args.body || beginCell().endCell(),
                    bounce: false,
                })]
            });
        }
    };
    
    return {
        contract,
        keyPair,
        sender
    };
}

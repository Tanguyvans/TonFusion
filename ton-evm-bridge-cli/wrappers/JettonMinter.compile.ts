import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    targets: [
        'contracts/ton/imports/stdlib.fc',
        'contracts/ton/jetton/params.fc',
        'contracts/ton/jetton/op-codes.fc',
        'contracts/ton/jetton/discovery-params.fc',
        'contracts/ton/jetton/jetton-utils.fc',
        'contracts/ton/jetton/jetton-minter-discoverable.fc',
    ],
};

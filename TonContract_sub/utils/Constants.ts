// Jetton and Vault opcodes (used for contract message dispatch)
export abstract class Op {
    // Jetton and vault opcodes actually used in contract and scripts
    static transfer = 0xf8a7ea5;
    static register_deposit = 0x3a8f7c12;
    static withdraw_jetton = 0x1f045490;
    static refund_jetton = 0x1f045491;
}

export abstract class Errors {
    static unexpected = 999;
    static wrong_op = 0xffff;
}


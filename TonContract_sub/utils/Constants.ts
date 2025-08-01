// Jetton and Vault opcodes (used for contract message dispatch)
export abstract class Op {
    // Jetton and vault opcodes actually used in contract and scripts
    static transfer = 0xf8a7ea5;
    static register_deposit = 0x3a8f7c12;
    static withdraw_jetton = 0x1f045490;
    static refund_jetton = 0x1f045491;

    // basic opcodes
    static send_admin_message = 0x78d5e3af;
    static change_code_and_data = 0xc4a0912f;
    static change_admin = 0x3f9a72c4;
    static change_content = 0x1d5e8b3f;
}

export abstract class Errors {
    static unexpected = 999;
    static wrong_op = 0xffff;
}


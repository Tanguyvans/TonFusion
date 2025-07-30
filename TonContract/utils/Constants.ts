export abstract class Op {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;

    static mint = 21;

    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;

    // Vault operations
    static register_deposit = 0x3a8f7c12;
    static change_vault_data = 0xf1b32984;
    static send_admin_message = 0x78d5e3af;
    static change_code_and_data = 0xc4a0912f;
    static change_admin = 0x3f9a72c4;
    static change_content = 0x1d5e8b3f;

    static jetton_withdraw = 0x3a8f7c13;
}

export abstract class Errors {
    static not_admin = 73;
    static unauthorized_burn = 74;
    static discovery_fee_not_matched = 75;
    static invalid_deposit_body = 400;
    static min_exchange_amount = 401;
    static invalid_ton_amount = 402;
    static not_enough_gas = 403;
    static non_basket_token = 404;
    static invalid_vault_data = 405;
    static unexpected = 999;
    static wrong_op = 0xffff;
}

export const ONCHAIN_CONTENT_PREFIX = 0x00;
export const SNAKE_PREFIX = 0x00;

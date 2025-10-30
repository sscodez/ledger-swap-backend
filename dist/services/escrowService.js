"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowService = void 0;
const bitcoin_1 = require("../chains/bitcoin");
const stellar_1 = require("../chains/stellar");
const xrpl_1 = require("../chains/xrpl");
const CHAINS = {
    bitcoin: bitcoin_1.BitcoinEscrow,
    stellar: stellar_1.StellarEscrow,
    xrpl: xrpl_1.XrplEscrow
};
class EscrowService {
    static create(chain, params) {
        return CHAINS[chain].create(params);
    }
    static release(chain, params) {
        return CHAINS[chain].release(params);
    }
    static refund(chain, params) {
        if (!CHAINS[chain].refund)
            throw new Error("Refund not supported on this chain");
        return CHAINS[chain].refund(params);
    }
}
exports.EscrowService = EscrowService;

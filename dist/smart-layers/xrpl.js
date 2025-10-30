"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createXrplEscrow = createXrplEscrow;
exports.releaseXrplEscrow = releaseXrplEscrow;
exports.cancelXrplEscrow = cancelXrplEscrow;
const xrpl_1 = require("xrpl");
const crypto_1 = __importDefault(require("crypto"));
// Use testnet for development, mainnet for production
const XRPL_SERVER = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233';
/**
 * Create XRPL Escrow with optional HTLC (Hash Time Lock Contract)
 * @param sellerSecret - Seller's wallet secret
 * @param destination - Buyer's wallet address
 * @param amountXrp - Amount in XRP
 * @param finishAfterSeconds - Time before escrow can be finished (default 3600 = 1 hour)
 * @param cancelAfterSeconds - Time after which escrow can be cancelled (default 86400 = 24 hours)
 * @param useHTLC - Whether to use hash-time-lock for atomic swaps
 * @returns Transaction result with escrow sequence
 */
function createXrplEscrow(sellerSecret_1, destination_1, amountXrp_1) {
    return __awaiter(this, arguments, void 0, function* (sellerSecret, destination, amountXrp, finishAfterSeconds = 3600, cancelAfterSeconds = 86400, useHTLC = false) {
        const client = new xrpl_1.Client(XRPL_SERVER);
        try {
            yield client.connect();
            const wallet = xrpl_1.Wallet.fromSeed(sellerSecret);
            const currentTime = Math.floor(Date.now() / 1000);
            const tx = {
                TransactionType: 'EscrowCreate',
                Account: wallet.classicAddress,
                Destination: destination,
                Amount: (0, xrpl_1.xrpToDrops)(amountXrp),
                FinishAfter: currentTime + finishAfterSeconds,
                CancelAfter: currentTime + cancelAfterSeconds,
            };
            // Add HTLC condition if requested (for atomic cross-chain swaps)
            let preimage;
            if (useHTLC) {
                preimage = crypto_1.default.randomBytes(32).toString('hex');
                const condition = crypto_1.default.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex').toUpperCase();
                tx.Condition = condition;
            }
            // Autofill transaction fields (fee, sequence, etc.)
            const prepared = yield client.autofill(tx);
            // Sign transaction
            const signed = wallet.sign(prepared);
            // Submit and wait for validation
            const result = yield client.submitAndWait(signed.tx_blob);
            yield client.disconnect();
            // Extract sequence number from the prepared transaction
            const escrowSequence = prepared.Sequence;
            return {
                success: true,
                txHash: result.result.hash,
                escrowSequence,
                sellerAddress: wallet.classicAddress,
                destination,
                amount: amountXrp,
                finishAfter: currentTime + finishAfterSeconds,
                cancelAfter: currentTime + cancelAfterSeconds,
                preimage: useHTLC ? preimage : undefined,
                condition: useHTLC ? tx.Condition : undefined,
                result,
            };
        }
        catch (error) {
            yield client.disconnect();
            throw new Error(`XRPL Escrow Creation Failed: ${error.message}`);
        }
    });
}
/**
 * Finish (release) XRPL Escrow
 * @param finisherSecret - Secret of account finishing the escrow (can be seller, buyer, or anyone)
 * @param ownerAddress - Address of the escrow creator
 * @param escrowSequence - Sequence number from EscrowCreate transaction
 * @param fulfillment - Optional: preimage for conditional escrow (HTLC)
 * @returns Transaction result
 */
function releaseXrplEscrow(finisherSecret, ownerAddress, escrowSequence, fulfillment) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new xrpl_1.Client(XRPL_SERVER);
        try {
            yield client.connect();
            const wallet = xrpl_1.Wallet.fromSeed(finisherSecret);
            const tx = {
                TransactionType: 'EscrowFinish',
                Account: wallet.classicAddress,
                Owner: ownerAddress,
                OfferSequence: escrowSequence,
            };
            // Add fulfillment if this is a conditional escrow
            if (fulfillment) {
                const fulfillmentHash = crypto_1.default.createHash('sha256')
                    .update(Buffer.from(fulfillment, 'hex'))
                    .digest('hex')
                    .toUpperCase();
                tx.Fulfillment = fulfillmentHash;
            }
            const prepared = yield client.autofill(tx);
            const signed = wallet.sign(prepared);
            const result = yield client.submitAndWait(signed.tx_blob);
            yield client.disconnect();
            return {
                success: true,
                txHash: result.result.hash,
                result,
            };
        }
        catch (error) {
            yield client.disconnect();
            throw new Error(`XRPL Escrow Finish Failed: ${error.message}`);
        }
    });
}
/**
 * Cancel XRPL Escrow (refund to owner)
 * @param cancellerSecret - Secret of account cancelling the escrow
 * @param ownerAddress - Address of the escrow creator
 * @param escrowSequence - Sequence number from EscrowCreate transaction
 * @returns Transaction result
 */
function cancelXrplEscrow(cancellerSecret, ownerAddress, escrowSequence) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new xrpl_1.Client(XRPL_SERVER);
        try {
            yield client.connect();
            const wallet = xrpl_1.Wallet.fromSeed(cancellerSecret);
            const tx = {
                TransactionType: 'EscrowCancel',
                Account: wallet.classicAddress,
                Owner: ownerAddress,
                OfferSequence: escrowSequence,
            };
            const prepared = yield client.autofill(tx);
            const signed = wallet.sign(prepared);
            const result = yield client.submitAndWait(signed.tx_blob);
            yield client.disconnect();
            return {
                success: true,
                txHash: result.result.hash,
                result,
            };
        }
        catch (error) {
            yield client.disconnect();
            throw new Error(`XRPL Escrow Cancel Failed: ${error.message}`);
        }
    });
}

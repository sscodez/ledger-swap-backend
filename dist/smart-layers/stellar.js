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
exports.createEscrowStellar = createEscrowStellar;
const stellar_sdk_1 = __importDefault(require("stellar-sdk"));
function createEscrowStellar(sellerPub, buyerPub) {
    return __awaiter(this, void 0, void 0, function* () {
        const escrowKeypair = stellar_sdk_1.default.Keypair.random();
        const platformAdmin = stellar_sdk_1.default.Keypair.fromSecret(process.env.PLATFORM_SECRET);
        const server = new stellar_sdk_1.default.Server('https://horizon-testnet.stellar.org');
        const platformAccount = yield server.loadAccount(platformAdmin.publicKey());
        // 1. Create escrow account
        const txCreate = new stellar_sdk_1.default.TransactionBuilder(platformAccount, {
            fee: yield server.fetchBaseFee(),
            networkPassphrase: stellar_sdk_1.default.Networks.TESTNET
        })
            .addOperation(stellar_sdk_1.default.Operation.createAccount({
            destination: escrowKeypair.publicKey(),
            startingBalance: '2',
        }))
            .setTimeout(180)
            .build();
        txCreate.sign(platformAdmin);
        yield server.submitTransaction(txCreate);
        // 2. Configure multi-sig
        const escrowAccount = yield server.loadAccount(escrowKeypair.publicKey());
        const txMultiSig = new stellar_sdk_1.default.TransactionBuilder(escrowAccount, {
            fee: yield server.fetchBaseFee(),
            networkPassphrase: stellar_sdk_1.default.Networks.TESTNET
        })
            .addOperation(stellar_sdk_1.default.Operation.setOptions({ signer: { ed25519PublicKey: sellerPub, weight: 1 } }))
            .addOperation(stellar_sdk_1.default.Operation.setOptions({ signer: { ed25519PublicKey: buyerPub, weight: 1 } }))
            .addOperation(stellar_sdk_1.default.Operation.setOptions({ signer: { ed25519PublicKey: platformAdmin.publicKey(), weight: 2 } }))
            .addOperation(stellar_sdk_1.default.Operation.setOptions({ masterWeight: 0, lowThreshold: 2, medThreshold: 2, highThreshold: 2 }))
            .setTimeout(180)
            .build();
        txMultiSig.sign(escrowKeypair);
        yield server.submitTransaction(txMultiSig);
        return escrowKeypair.publicKey();
    });
}

// Fix 1: Import ECPair and Psbt dependencies correctly.
// For modern bitcoinjs-lib (v6+), we must initialize the library with a curve implementation.
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, ECPairInterface } from 'ecpair';

// Initialize the ECC library for both bitcoinjs-lib and ECPair.
// This is necessary to fix the 'Property 'ECPair' does not exist' error.
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

/**
 * Creates a 2-of-3 P2SH Multisig Escrow Address.
 * Requires any 2 of the 3 keys (Seller, Buyer, Admin) to spend the funds.
 */
export function createBitcoinEscrow() {
    // The network must be initialized before generating keys
    const network = bitcoin.networks.testnet;

    // Use the initialized ECPair factory
    const seller = ECPair.makeRandom({ network });
    const buyer = ECPair.makeRandom({ network });
    const admin = ECPair.makeRandom({ network });

    // P2MS (2-of-3 Multisig Script)
    const p2ms = bitcoin.payments.p2ms({
        m: 2,
        pubkeys: [seller.publicKey, buyer.publicKey, admin.publicKey].sort((a, b) => a.compare(b)),
        network
    });

    // P2SH (Script Hash: wrapper for the redeem script)
    const p2sh = bitcoin.payments.p2sh({ redeem: p2ms, network });

    return {
        escrowAddress: p2sh.address,
        keys: { seller, buyer, admin },
        redeem: p2ms,
        network // Include network for Psbt creation later
    };
}

/**
 * Spends the Bitcoin Escrow using Psbt (Partially Signed Bitcoin Transaction).
 * Psbt replaces the deprecated TransactionBuilder.
 *
 * @param psbt The partially signed bitcoin transaction object.
 * @param inputIndex The index of the input (the escrow UTXO) to be signed.
 * @param spendingKeys An array of ECPair keys (min 2) used to sign the transaction.
 * @param redeem The P2MS redeem script object.
 * @returns The final, signed transaction hex string.
 */
export function releaseBitcoinEscrow(
    psbt: bitcoin.Psbt,
    inputIndex: number,
    spendingKeys: ECPairInterface[],
    redeem: bitcoin.payments.Payment
): string {
    // Ensure the correct number of signatures is provided (at least 2 for 2-of-3)
    if (spendingKeys.length < 2) {
        throw new Error('Not enough keys provided to satisfy the 2-of-3 multisig script.');
    }

    // 1. Sign the input with the required keys
    spendingKeys.forEach((key) => {
        psbt.signInput(inputIndex, key);
    });

    // 2. Finalize the input to generate the required scriptSig/scriptWitness for the multisig script.
    // We use an explicit custom finalizer function because the default Psbt finalizer often
    // struggles with P2SH-P2MS complex scripts and needs to know the correct format.
    psbt.finalizeInput(inputIndex, (inputIndex:any, input:any) => {
        // FIX: Use redeem.network instead of psbt.network to resolve TypeScript error 2339.
        if (!redeem.network) {
            throw new Error("Redeem object is missing network information.");
        }
        
        const p2sh = bitcoin.payments.p2sh({
            redeem: redeem,
            network: redeem.network,
        });

        // The input has partial signatures (witnessUtxo required for P2WSH, which P2SH is not,
        // so we manually construct the final scriptSig for P2SH-P2MS).
        // The 'input.partialSig!' assertion assumes successful signing in step 1.
        const signatures = input.partialSig!.map((p:any) => p.signature);

        // The final scriptSig for P2SH-P2MS is:
        // OP_0 <Sig1> <Sig2> <RedeemScript>
        const scriptSig = bitcoin.script.compile([
            bitcoin.opcodes.OP_0, // Push an OP_0 as required by the multisig standard
            ...signatures,
            p2sh.redeem!.output, // The full P2MS redeem script
        ]);

        return {
            finalScriptSig: scriptSig,
            finalScriptWitness: undefined, // Not a SegWit transaction
        };
    });

    // 3. Extract and return the final transaction hex
    return psbt.extractTransaction().toHex();
}

// NOTE: This function requires you to have a UTXO (Unspent Transaction Output) locked
// to the escrowAddress and you must build a Psbt to spend it, including adding an output.
// Psbt is the recommended way to build transactions now, replacing TransactionBuilder.

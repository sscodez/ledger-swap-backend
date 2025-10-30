import StellarSdk from 'stellar-sdk';

export async function createEscrowStellar(sellerPub: string, buyerPub: string) {
    const escrowKeypair = StellarSdk.Keypair.random();
    const platformAdmin = StellarSdk.Keypair.fromSecret(process.env.PLATFORM_SECRET!);

    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    const platformAccount = await server.loadAccount(platformAdmin.publicKey());

    // 1. Create escrow account
    const txCreate = new StellarSdk.TransactionBuilder(platformAccount, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.createAccount({
        destination: escrowKeypair.publicKey(),
        startingBalance: '2',
    }))
    .setTimeout(180)
    .build();

    txCreate.sign(platformAdmin);
    await server.submitTransaction(txCreate);

    // 2. Configure multi-sig
    const escrowAccount = await server.loadAccount(escrowKeypair.publicKey());
    const txMultiSig = new StellarSdk.TransactionBuilder(escrowAccount, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.setOptions({ signer: { ed25519PublicKey: sellerPub, weight: 1 } }))
    .addOperation(StellarSdk.Operation.setOptions({ signer: { ed25519PublicKey: buyerPub, weight: 1 } }))
    .addOperation(StellarSdk.Operation.setOptions({ signer: { ed25519PublicKey: platformAdmin.publicKey(), weight: 2 } }))
    .addOperation(StellarSdk.Operation.setOptions({ masterWeight: 0, lowThreshold: 2, medThreshold: 2, highThreshold: 2 }))
    .setTimeout(180)
    .build();

    txMultiSig.sign(escrowKeypair);
    await server.submitTransaction(txMultiSig);

    return escrowKeypair.publicKey();
}

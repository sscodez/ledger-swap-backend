// chains/xlm.ts
import { Keypair, Server, TransactionBuilder, Networks, Operation, Asset } from "stellar-sdk";

const server = new Server("https://horizon-testnet.stellar.org");

export async function xlmLock({ sellerSecret, buyerAddress, amount }:any) {
  const seller = Keypair.fromSecret(sellerSecret);
  const account = await server.loadAccount(seller.publicKey());

  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.createClaimableBalance({
      asset: Asset.native(),
      amount: amount,
      claimants: [
        { destination: buyerAddress, predicate: Operation.claimPredicateUnconditional() }
      ]
    }))
    .setTimeout(300)
    .build();

  tx.sign(seller);
  const result = await server.submitTransaction(tx);
  return result.id; // balance id
}

export async function xlmRelease({ buyerSecret, balanceId }:any) {
  const buyer = Keypair.fromSecret(buyerSecret);
  const tx = await server.claimClaimableBalance(balanceId, buyer);
  return tx;
}

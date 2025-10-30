import { Client, Wallet, xrpToDrops } from 'xrpl';
import crypto from 'crypto';

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
export async function createXrplEscrow(
  sellerSecret: string,
  destination: string,
  amountXrp: string,
  finishAfterSeconds: number = 3600,
  cancelAfterSeconds: number = 86400,
  useHTLC: boolean = false
) {
  const client = new Client(XRPL_SERVER);
  
  try {
    await client.connect();
    
    const wallet = Wallet.fromSeed(sellerSecret);
    const currentTime = Math.floor(Date.now() / 1000);
    
    const tx: any = {
      TransactionType: 'EscrowCreate',
      Account: wallet.classicAddress,
      Destination: destination,
      Amount: xrpToDrops(amountXrp),
      FinishAfter: currentTime + finishAfterSeconds,
      CancelAfter: currentTime + cancelAfterSeconds,
    };
    
    // Add HTLC condition if requested (for atomic cross-chain swaps)
    let preimage: string | undefined;
    if (useHTLC) {
      preimage = crypto.randomBytes(32).toString('hex');
      const condition = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex').toUpperCase();
      tx.Condition = condition;
    }
    
    // Autofill transaction fields (fee, sequence, etc.)
    const prepared = await client.autofill(tx);
    
    // Sign transaction
    const signed = wallet.sign(prepared);
    
    // Submit and wait for validation
    const result = await client.submitAndWait(signed.tx_blob);
    
    await client.disconnect();
    
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
  } catch (error: any) {
    await client.disconnect();
    throw new Error(`XRPL Escrow Creation Failed: ${error.message}`);
  }
}

/**
 * Finish (release) XRPL Escrow
 * @param finisherSecret - Secret of account finishing the escrow (can be seller, buyer, or anyone)
 * @param ownerAddress - Address of the escrow creator
 * @param escrowSequence - Sequence number from EscrowCreate transaction
 * @param fulfillment - Optional: preimage for conditional escrow (HTLC)
 * @returns Transaction result
 */
export async function releaseXrplEscrow(
  finisherSecret: string,
  ownerAddress: string,
  escrowSequence: number,
  fulfillment?: string
) {
  const client = new Client(XRPL_SERVER);
  
  try {
    await client.connect();
    
    const wallet = Wallet.fromSeed(finisherSecret);
    
    const tx: any = {
      TransactionType: 'EscrowFinish',
      Account: wallet.classicAddress,
      Owner: ownerAddress,
      OfferSequence: escrowSequence,
    };
    
    // Add fulfillment if this is a conditional escrow
    if (fulfillment) {
      const fulfillmentHash = crypto.createHash('sha256')
        .update(Buffer.from(fulfillment, 'hex'))
        .digest('hex')
        .toUpperCase();
      tx.Fulfillment = fulfillmentHash;
    }
    
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    await client.disconnect();
    
    return {
      success: true,
      txHash: result.result.hash,
      result,
    };
  } catch (error: any) {
    await client.disconnect();
    throw new Error(`XRPL Escrow Finish Failed: ${error.message}`);
  }
}

/**
 * Cancel XRPL Escrow (refund to owner)
 * @param cancellerSecret - Secret of account cancelling the escrow
 * @param ownerAddress - Address of the escrow creator
 * @param escrowSequence - Sequence number from EscrowCreate transaction
 * @returns Transaction result
 */
export async function cancelXrplEscrow(
  cancellerSecret: string,
  ownerAddress: string,
  escrowSequence: number
) {
  const client = new Client(XRPL_SERVER);
  
  try {
    await client.connect();
    
    const wallet = Wallet.fromSeed(cancellerSecret);
    
    const tx: any = {
      TransactionType: 'EscrowCancel',
      Account: wallet.classicAddress,
      Owner: ownerAddress,
      OfferSequence: escrowSequence,
    };
    
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    
    await client.disconnect();
    
    return {
      success: true,
      txHash: result.result.hash,
      result,
    };
  } catch (error: any) {
    await client.disconnect();
    throw new Error(`XRPL Escrow Cancel Failed: ${error.message}`);
  }
}

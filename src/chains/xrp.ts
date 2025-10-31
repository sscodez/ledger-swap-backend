// // chains/xrp.ts
// import xrpl from "xrpl";

// export type XRPConfig = {
//   rpcUrl: string
//   escrowOwnerSecret: string // Platform or initiator wallet private key
// };

// export class XRPEscrow {
//   private client: xrpl.Client;
//   private wallet: xrpl.Wallet;

//   constructor(config: XRPConfig) {
//     this.client = new xrpl.Client(config.rpcUrl);
//     this.wallet = xrpl.Wallet.fromSeed(config.escrowOwnerSecret);
//   }

//   async connect() {
//     await this.client.connect();
//   }

//   async disconnect() {
//     await this.client.disconnect();
//   }

//   /**
//    * 1) Create Escrow Offer (locks XRP from initiator)
//    */
//   async createEscrowOffer({
//     amountXRP,
//     releaseAfterSeconds,
//     destinationAddress,
//   }: {
//     amountXRP: number,
//     releaseAfterSeconds: number,
//     destinationAddress: string
//   }) {
//     const finishAfter = Math.floor(Date.now() / 1000) + releaseAfterSeconds;

//     const tx = {
//       TransactionType: "EscrowCreate",
//       Account: this.wallet.classicAddress,
//       Amount: xrpl.xrpToDrops(amountXRP.toString()),
//       Destination: destinationAddress,
//       FinishAfter: finishAfter,
//     };


//     const result = await this.client.submitAndWait(tx, { wallet: this.wallet });
//     return result.result;
//   }

//   /**
//    * 2) Lock Funds by Seller/Counter-party
//    * (Seller also escrows their part into another escrow entry)
//    */
//   async lockFunds({
//     amountXRP,
//     releaseAfterSeconds,
//     destinationAddress,
//   }: {
//     amountXRP: number,
//     releaseAfterSeconds: number,
//     destinationAddress: string
//   }) {
//     return this.createEscrowOffer({
//       amountXRP,
//       releaseAfterSeconds,
//       destinationAddress,
//     });
//   }

//   /**
//    * 3) Release Escrow (Finish Escrow)
//    */
//   async releaseEscrow(escrowSequence: number) {
//     const tx = {
//       TransactionType: "EscrowFinish",
//       Account: this.wallet.classicAddress,
//       Owner: this.wallet.classicAddress,
//       OfferSequence: escrowSequence,
//     };

//     const result = await this.client.submitAndWait(tx, { wallet: this.wallet });
//     return result.result;
//   }

//   /**
//    * 4) Refund Escrow (Cancel Escrow)
//    */
//   async refundEscrow({
//     escrowOwnerAddress,
//     escrowSequence,
//   }: {
//     escrowOwnerAddress: string,
//     escrowSequence: number,
//   }) {
//     const tx = {
//       TransactionType: "EscrowCancel",
//       Account: this.wallet.classicAddress,
//       Owner: escrowOwnerAddress,
//       OfferSequence: escrowSequence,
//     };

//     const result = await this.client.submitAndWait(tx, { wallet: this.wallet });
//     return result.result;
//   }
// }

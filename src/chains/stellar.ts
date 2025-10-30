import { createEscrowStellar } from "../smart-layers/stellar";
import { EscrowAdapter } from "../types/escrowAdaptar";

export const StellarEscrow: EscrowAdapter = {
  async create({ sellerPub, buyerPub }:any) {
    return await createEscrowStellar(sellerPub, buyerPub);
  },
  async release() {
    throw new Error("Stellar: release is handled via multisig transaction.");
  },
  async refund() {
    throw new Error("Stellar: release is handled via multisig transaction.");
  }
};

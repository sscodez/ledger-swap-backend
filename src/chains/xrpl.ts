import { createXrplEscrow, releaseXrplEscrow } from "../smart-layers/xrpl";
import { EscrowAdapter } from "../types/escrowAdaptar";

export const XrplEscrow: EscrowAdapter = {
  async create({ seller, buyer, amount, secret }:any) {
    return await createXrplEscrow(seller, buyer, amount, secret);
  },
  async release({ escrowSequence, secret, ownerAddress }: any) {
    return await releaseXrplEscrow(secret, ownerAddress, escrowSequence);
  },
  async refund({ escrowSequence, secret, ownerAddress }: any) {
    return await releaseXrplEscrow(secret, ownerAddress, escrowSequence);
  }
};

import { createBitcoinEscrow, releaseBitcoinEscrow } from "../smart-layers/bitcoin";
import { EscrowAdapter } from "../types/escrowAdaptar";

export const BitcoinEscrow: EscrowAdapter = {
  async create() {
    return createBitcoinEscrow();
  },
  async release({ psbt, keys, redeem, inputIndex }:any) {
    return releaseBitcoinEscrow(psbt, inputIndex, keys, redeem);
  },
  async refund({ psbt, keys, redeem, inputIndex }:any) {
    return releaseBitcoinEscrow(psbt, inputIndex, keys, redeem);
  }
};

import { BitcoinEscrow } from "../chains/bitcoin";
import { EthereumEscrow } from "../chains/xdc";
import { StellarEscrow } from "../chains/stellar";
import { XrplEscrow } from "../chains/xrpl";

const CHAINS: Record<string, any> = {
  // bitcoin: BitcoinEscrow,
  // stellar: StellarEscrow,
  // xrpl: XrplEscrow
};

export class EscrowService {
  static create(chain: string, params: any) {
    return CHAINS[chain].create(params);
  }
  static release(chain: string, params: any) {
    return CHAINS[chain].release(params);
  }
  static refund(chain: string, params: any) {
    if (!CHAINS[chain].refund) throw new Error("Refund not supported on this chain");
    return CHAINS[chain].refund(params);
  }
}

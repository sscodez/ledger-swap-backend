import mongoose, { Document, Schema } from 'mongoose';

export interface IChain extends Document {
  key: string; // e.g., 'bitcoin', 'stellar', 'xrp-ledger', 'xdc-network', 'iota'
  name: string; // e.g., 'Bitcoin', 'Stellar', 'XRP Ledger'
  symbol: string; // Native currency symbol: 'BTC', 'XLM', 'XRP', 'XDC', 'MIOTA'
  chainType: 'evm' | 'utxo' | 'account' | 'dag'; // Blockchain architecture type
  chainId?: number; // For EVM chains (e.g., 50 for XDC)
  rpcEndpoints: string[]; // Multiple RPC endpoints for redundancy
  explorerUrl: string; // Block explorer URL
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  confirmationsRequired: number; // Min confirmations for deposits
  enabled: boolean;
  supportsSmartContracts: boolean;
  supportsTokens: boolean;
  averageBlockTime: number; // In seconds
  networkFee: {
    low: string;
    medium: string;
    high: string;
  };
}

const chainSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true, index: true },
  chainType: { type: String, enum: ['evm', 'utxo', 'account', 'dag'], required: true },
  chainId: { type: Number },
  rpcEndpoints: [{ type: String }],
  explorerUrl: { type: String, required: true },
  nativeCurrency: {
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, required: true }
  },
  confirmationsRequired: { type: Number, default: 1 },
  enabled: { type: Boolean, default: true, index: true },
  supportsSmartContracts: { type: Boolean, default: false },
  supportsTokens: { type: Boolean, default: false },
  averageBlockTime: { type: Number, default: 60 },
  networkFee: {
    low: { type: String, default: '0' },
    medium: { type: String, default: '0' },
    high: { type: String, default: '0' }
  }
}, { timestamps: true });

const Chain = mongoose.model<IChain>('Chain', chainSchema);
export default Chain;

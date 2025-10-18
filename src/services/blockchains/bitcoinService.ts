/**
 * Bitcoin Blockchain Integration Service
 * Handles BTC transactions, address generation, and UTXO management
 */

import axios from 'axios';

export interface BitcoinTransaction {
  txid: string;
  from: string[];
  to: string;
  amount: string;
  fee: string;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
}

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
}

export interface BitcoinAddressBalance {
  address: string;
  balance: string;
  unconfirmedBalance: string;
  txCount: number;
}

class BitcoinService {
  private rpcEndpoints: string[];
  private currentEndpointIndex = 0;

  constructor() {
    this.rpcEndpoints = [
      process.env.BITCOIN_RPC_URL || 'https://blockstream.info/api',
      'https://blockchain.info',
      'https://btc.getblock.io/mainnet'
    ];
  }

  /**
   * Get current RPC endpoint with failover
   */
  private getRpcEndpoint(): string {
    return this.rpcEndpoints[this.currentEndpointIndex];
  }

  /**
   * Switch to next RPC endpoint on failure
   */
  private switchToNextEndpoint(): void {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    console.log(`🔄 Switched to Bitcoin RPC endpoint: ${this.getRpcEndpoint()}`);
  }

  /**
   * Get Bitcoin address balance
   */
  async getAddressBalance(address: string): Promise<BitcoinAddressBalance> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      // Using Blockstream API format
      const response = await axios.get(`${endpoint}/address/${address}`);
      
      const data = response.data;
      const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000; // Convert satoshis to BTC
      const unconfirmed = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000;

      return {
        address,
        balance: balance.toString(),
        unconfirmedBalance: unconfirmed.toString(),
        txCount: data.chain_stats.tx_count
      };
    } catch (error: any) {
      console.error(`❌ Bitcoin getAddressBalance error:`, error.message);
      this.switchToNextEndpoint();
      throw new Error(`Failed to get Bitcoin address balance: ${error.message}`);
    }
  }

  /**
   * Get UTXOs for an address
   */
  async getAddressUTXOs(address: string): Promise<BitcoinUTXO[]> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.get(`${endpoint}/address/${address}/utxo`);
      
      return response.data.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value / 100000000, // Convert to BTC
        confirmations: utxo.status?.confirmed ? utxo.status.block_height : 0
      }));
    } catch (error: any) {
      console.error(`❌ Bitcoin getAddressUTXOs error:`, error.message);
      throw new Error(`Failed to get Bitcoin UTXOs: ${error.message}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txid: string): Promise<BitcoinTransaction | null> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.get(`${endpoint}/tx/${txid}`);
      const tx = response.data;

      // Extract sender addresses from inputs
      const fromAddresses = tx.vin.map((input: any) => input.prevout?.scriptpubkey_address).filter(Boolean);
      
      // Extract recipient address from outputs
      const toAddress = tx.vout[0]?.scriptpubkey_address || '';
      
      // Calculate total output amount
      const amount = tx.vout.reduce((sum: number, output: any) => sum + output.value, 0) / 100000000;

      return {
        txid: tx.txid,
        from: fromAddresses,
        to: toAddress,
        amount: amount.toString(),
        fee: (tx.fee / 100000000).toString(),
        confirmations: tx.status?.confirmed ? tx.status.block_height : 0,
        blockHeight: tx.status?.block_height,
        timestamp: tx.status?.block_time || Date.now() / 1000
      };
    } catch (error: any) {
      console.error(`❌ Bitcoin getTransaction error:`, error.message);
      return null;
    }
  }

  /**
   * Monitor address for new transactions
   */
  async monitorAddress(
    address: string,
    callback: (tx: BitcoinTransaction) => void,
    interval: number = 30000
  ): Promise<NodeJS.Timeout> {
    console.log(`👁️ Monitoring Bitcoin address: ${address}`);
    
    let lastTxCount = 0;
    
    const intervalId = setInterval(async () => {
      try {
        const balance = await this.getAddressBalance(address);
        
        if (balance.txCount > lastTxCount) {
          console.log(`💰 New Bitcoin transaction detected for ${address}`);
          
          // Get recent transactions
          const endpoint = this.getRpcEndpoint();
          const txsResponse = await axios.get(`${endpoint}/address/${address}/txs`);
          
          // Process new transactions
          const newTxs = txsResponse.data.slice(0, balance.txCount - lastTxCount);
          
          for (const tx of newTxs) {
            const transaction = await this.getTransaction(tx.txid);
            if (transaction) {
              callback(transaction);
            }
          }
          
          lastTxCount = balance.txCount;
        }
      } catch (error: any) {
        console.error(`❌ Bitcoin monitoring error:`, error.message);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.get(`${endpoint}/fee-estimates`);
      const feeRates = response.data;
      
      let targetBlock: number;
      switch (priority) {
        case 'low':
          targetBlock = 144; // ~24 hours
          break;
        case 'high':
          targetBlock = 1; // Next block
          break;
        default:
          targetBlock = 6; // ~1 hour
      }
      
      const feeRate = feeRates[targetBlock] || feeRates['6'];
      return (feeRate / 100000000).toString(); // Convert to BTC
    } catch (error: any) {
      console.error(`❌ Bitcoin estimateFee error:`, error.message);
      // Return default fees
      return priority === 'high' ? '0.0001' : priority === 'medium' ? '0.00005' : '0.00002';
    }
  }

  /**
   * Broadcast signed transaction
   */
  async broadcastTransaction(signedTxHex: string): Promise<string> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.post(`${endpoint}/tx`, signedTxHex, {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      console.log(`✅ Bitcoin transaction broadcast: ${response.data}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Bitcoin broadcastTransaction error:`, error.message);
      throw new Error(`Failed to broadcast Bitcoin transaction: ${error.message}`);
    }
  }

  /**
   * Validate Bitcoin address
   */
  validateAddress(address: string): boolean {
    // Basic Bitcoin address validation (P2PKH, P2SH, Bech32)
    const p2pkhRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
    
    return p2pkhRegex.test(address) || bech32Regex.test(address);
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    blockHeight: number;
    difficulty: number;
    hashRate: string;
  }> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.get(`${endpoint}/blocks/tip/height`);
      const blockHeight = response.data;
      
      return {
        blockHeight,
        difficulty: 0, // Would need additional API call
        hashRate: 'N/A'
      };
    } catch (error: any) {
      console.error(`❌ Bitcoin getNetworkInfo error:`, error.message);
      throw error;
    }
  }
}

export const bitcoinService = new BitcoinService();
export default bitcoinService;

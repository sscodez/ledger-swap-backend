/**
 * Bitcoin Blockchain Integration Service
 * Handles BTC transactions, address generation, and UTXO management
 * Following production-ready patterns with bitcoinjs-lib
 */

import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);

// Initialize ECC library for bitcoinjs-lib v6+
// This is required before using Psbt or other ECC operations
bitcoin.initEccLib(tinysecp as any);

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
  private network: bitcoin.Network;

  constructor() {
    this.rpcEndpoints = [
      process.env.BITCOIN_RPC_URL || 'https://blockstream.info/api',
      'https://blockchain.info',
      'https://btc.getblock.io/mainnet'
    ];
    
    // Set network (mainnet or testnet)
    this.network = process.env.BTC_NETWORK === 'testnet' 
      ? bitcoin.networks.testnet 
      : bitcoin.networks.bitcoin;
  }

  /**
   * Build an unsigned PSBT for a payment from fromAddress to toAddress.
   * Returns base64 PSBT and metadata for the client to sign and submit back.
   */
  async buildUnsignedPsbt(
    fromAddress: string,
    toAddress: string,
    amountBTC: number,
    feeRate: number = 10
  ): Promise<{ psbtBase64: string; inputs: number; changeSat: number; network: 'mainnet' | 'testnet' }> {
    try {
      const utxos = await this.getUTXOs(fromAddress);
      if (!utxos.length) throw new Error('No UTXOs available for spending');

      const satoshiAmount = Math.floor(amountBTC * 1e8);

      // Select UTXOs greedily until we cover amount + rough fee
      const sorted = [...utxos].sort((a, b) => b.value - a.value);
      const selected: Array<{ txid: string; vout: number; value: number }> = [];
      let inputSum = 0;

      // Initial rough fee assuming 1 input, 2 outputs
      const roughSize = (inputs: number, outputs: number) => 10 + inputs * 148 + outputs * 34; // bytes
      let estFee = Math.ceil(feeRate * roughSize(1, 2));

      for (const utxo of sorted) {
        selected.push(utxo);
        inputSum += utxo.value;
        estFee = Math.ceil(feeRate * roughSize(selected.length, 2));
        if (inputSum >= satoshiAmount + estFee) break;
      }

      if (inputSum < satoshiAmount + estFee) {
        throw new Error('Insufficient balance for amount + fee');
      }

      const change = inputSum - satoshiAmount - estFee;

      const psbt = new bitcoin.Psbt({ network: this.network });

      // Add inputs with full previous tx (nonWitnessUtxo) for broad compatibility
      for (const utxo of selected) {
        const txHex = await this.getRawTransaction(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        });
      }

      // Output to recipient
      psbt.addOutput({ address: toAddress, value: satoshiAmount });

      // Change output back to sender if above dust
      if (change > 546) {
        psbt.addOutput({ address: fromAddress, value: change });
      }

      return {
        psbtBase64: psbt.toBase64(),
        inputs: selected.length,
        changeSat: Math.max(change, 0),
        network: this.network === bitcoin.networks.testnet ? 'testnet' : 'mainnet',
      };
    } catch (error: any) {
      console.error('❌ buildUnsignedPsbt error:', error);
      throw new Error(error?.message || 'Failed to build PSBT');
    }
  }

  /**
   * Finalize a signed PSBT (from wallet) and broadcast it to the network.
   */
  async finalizeAndBroadcastSignedPsbt(signedPsbtBase64: string): Promise<string> {
    try {
      const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64, { network: this.network });
      try {
        psbt.finalizeAllInputs();
      } catch (e) {
        // If already finalized, ignore
      }
      const txHex = psbt.extractTransaction().toHex();
      const txid = await this.broadcastTransaction(txHex);
      return txid;
    } catch (error: any) {
      console.error('❌ finalizeAndBroadcastSignedPsbt error:', error);
      throw new Error(error?.message || 'Failed to broadcast PSBT');
    }
  }

  /**
   * Generate new Bitcoin address (production-ready)
   * Creates a random keypair and returns P2WPKH (native SegWit) address
   * IMPORTANT: Store privateKeyWIF securely (encrypted in DB or vault)
   */
  async generateAddress(): Promise<{ address: string; privateKeyWIF: string }> {
    // Generate random keypair
    const keyPair = ECPair.makeRandom({ network: this.network });
    
    // Generate P2WPKH (native SegWit) address - bc1q... format
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: this.network
    });
    
    console.log(`✅ Generated new BTC address: ${address}`);
    
    return {
      address: address!,
      privateKeyWIF: keyPair.toWIF() // MUST be stored encrypted
    };
  }

  /**
   * Send Bitcoin transaction (production pattern)
   * Builds, signs, and broadcasts BTC transaction
   * @param privateKeyWIF - Private key in WIF format (from secure storage)
   * @param toAddress - Recipient Bitcoin address
   * @param amountBTC - Amount in BTC (as number)
   * @param feeRate - Fee rate in satoshis per byte (default: 10)
   * @returns Transaction ID
   */
  async sendTransaction(
    privateKeyWIF: string,
    toAddress: string,
    amountBTC: number,
    feeRate: number = 10
  ): Promise<string> {
    try {
      console.log(`📤 Sending ${amountBTC} BTC to ${toAddress}...`);
      
      const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
      const { address: fromAddress } = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: this.network
      });
      
      // Get UTXOs for the from address
      const utxos = await this.getUTXOs(fromAddress!);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available for spending');
      }
      
      // Build transaction with PSBT
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      let inputSum = 0;
      for (const utxo of utxos) {
        // Get full transaction for each UTXO
        const txHex = await this.getRawTransaction(utxo.txid);
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex')
        });
        
        inputSum += utxo.value;
      }
      
      const satoshiAmount = Math.floor(amountBTC * 100000000);
      const estimatedFee = feeRate * 250; // Rough estimate for 1-input, 2-output tx
      const change = inputSum - satoshiAmount - estimatedFee;
      
      // Add output to recipient
      psbt.addOutput({
        address: toAddress,
        value: satoshiAmount
      });
      
      // Add change output if significant
      if (change > 1000) {
        psbt.addOutput({
          address: fromAddress!,
          value: change
        });
      }
      
      // Sign all inputs
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();
      
      // Extract and broadcast
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();
      const txid = await this.broadcastTransaction(txHex);
      
      console.log(`✅ BTC transaction sent! TXID: ${txid}`);
      
      return txid;
    } catch (error: any) {
      console.error('❌ Bitcoin send transaction error:', error);
      throw new Error(`Failed to send BTC: ${error.message}`);
    }
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
   * Get UTXOs formatted for PSBT consumption (values in satoshis)
   */
  private async getUTXOs(address: string): Promise<Array<{ txid: string; vout: number; value: number }>> {
    const utxos = await this.getAddressUTXOs(address);
    // Convert BTC values to satoshis
    return utxos.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.floor(u.value * 1e8),
    }));
  }

  /**
   * Get raw transaction hex for an existing transaction (for nonWitnessUtxo)
   */
  private async getRawTransaction(txid: string): Promise<string> {
    const endpoint = this.getRpcEndpoint();
    const { data } = await axios.get(`${endpoint}/tx/${txid}/hex`);
    return data; // hex string
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

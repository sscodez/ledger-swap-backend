/**
 * XRP Ledger Integration Service
 * Handles XRP transactions, trustlines, and account management
 * Following production-ready patterns with xrpl.js SDK
 */

import axios from 'axios';
import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';

export interface XRPTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  issuer?: string;
  destinationTag?: number;
  fee: string;
  ledgerIndex: number;
  timestamp: string;
  validated: boolean;
}

export interface XRPAccount {
  address: string;
  balance: string; // XRP balance in drops
  sequence: number;
  ownerCount: number;
  previousTxnID: string;
}

export interface XRPTrustline {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  quality_in: number;
  quality_out: number;
}

class XRPService {
  private rpcEndpoints: string[];
  private currentEndpointIndex = 0;
  private wsEndpoint: string;

  constructor() {
    this.rpcEndpoints = [
      process.env.XRP_RPC_URL || 'https://s1.ripple.com:51234',
      'https://s2.ripple.com:51234',
      'https://xrplcluster.com'
    ];
    this.wsEndpoint = process.env.XRP_WS_URL || 'wss://xrplcluster.com';
  }

  /**
   * Generate new XRP wallet (production-ready)
   * Creates a new keypair and returns address and seed
   * IMPORTANT: Store seed securely (encrypted in DB or vault)
   */
  async generateAddress(): Promise<{ address: string; seed: string }> {
    // Generate new wallet with xrpl.js
    const wallet = Wallet.generate();
    
    console.log(`✅ Generated new XRP address: ${wallet.classicAddress}`);
    
    return {
      address: wallet.classicAddress,
      seed: wallet.seed // MUST be stored encrypted
    };
  }

  /**
   * Send XRP payment (production pattern)
   * Signs and submits payment transaction
   * @param senderSeed - Wallet seed (from secure storage)
   * @param toAddress - Recipient XRP address
   * @param amount - Amount in XRP (as string)
   * @param destinationTag - Optional destination tag
   * @returns Transaction hash
   */
  async sendTransaction(
    senderSeed: string,
    toAddress: string,
    amount: string,
    destinationTag?: number
  ): Promise<string> {
    const client = new Client(this.wsEndpoint);
    
    try {
      await client.connect();
      console.log(`📤 Sending ${amount} XRP to ${toAddress}...`);
      
      // Create wallet from seed
      const wallet = Wallet.fromSeed(senderSeed);
      
      // Prepare payment transaction
      const payment: any = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: toAddress,
        Amount: xrpToDrops(amount)
      };
      
      // Add destination tag if provided
      if (destinationTag !== undefined) {
        payment.DestinationTag = destinationTag;
      }
      
      // Autofill (adds fee, sequence, etc.)
      const prepared = await client.autofill(payment);
      
      // Sign transaction
      const signed = wallet.sign(prepared);
      
      // Submit and wait for validation
      const result = await client.submitAndWait(signed.tx_blob);
      
      console.log(`✅ XRP payment successful! Hash: ${result.result.hash}`);
      
      await client.disconnect();
      
      return result.result.hash;
    } catch (error: any) {
      console.error('❌ XRP send transaction error:', error);
      await client.disconnect();
      throw new Error(`Failed to send XRP: ${error.message}`);
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
    console.log(`🔄 Switched to XRP RPC endpoint: ${this.getRpcEndpoint()}`);
  }

  /**
   * Make JSON-RPC request to XRP Ledger
   */
  private async rpcRequest(method: string, params: any[] = []): Promise<any> {
    try {
      const endpoint = this.getRpcEndpoint();
      
      const response = await axios.post(endpoint, {
        method,
        params
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.result?.status === 'error') {
        throw new Error(response.data.result.error_message || 'XRP RPC error');
      }

      return response.data.result;
    } catch (error: any) {
      console.error(`❌ XRP RPC error (${method}):`, error.message);
      this.switchToNextEndpoint();
      throw error;
    }
  }

  /**
   * Get XRP account info
   */
  async getAccount(address: string): Promise<XRPAccount | null> {
    try {
      const result = await this.rpcRequest('account_info', [{
        account: address,
        ledger_index: 'validated'
      }]);

      const accountData = result.account_data;

      return {
        address: accountData.Account,
        balance: accountData.Balance, // XRP in drops (1 XRP = 1,000,000 drops)
        sequence: accountData.Sequence,
        ownerCount: accountData.OwnerCount,
        previousTxnID: accountData.PreviousTxnID
      };
    } catch (error: any) {
      if (error.message?.includes('actNotFound')) {
        console.log(`ℹ️ XRP account not found: ${address}`);
        return null;
      }
      console.error(`❌ XRP getAccount error:`, error.message);
      throw new Error(`Failed to get XRP account: ${error.message}`);
    }
  }

  /**
   * Get XRP balance (in XRP, not drops)
   */
  async getBalance(address: string): Promise<string> {
    try {
      const account = await this.getAccount(address);
      
      if (!account) {
        return '0';
      }

      // Convert drops to XRP
      const xrpBalance = parseInt(account.balance) / 1000000;
      return xrpBalance.toString();
    } catch (error: any) {
      console.error(`❌ XRP getBalance error:`, error.message);
      return '0';
    }
  }

  /**
   * Get account trustlines (issued currencies)
   */
  async getTrustlines(address: string, currency?: string, issuer?: string): Promise<XRPTrustline[]> {
    try {
      const result = await this.rpcRequest('account_lines', [{
        account: address,
        ledger_index: 'validated'
      }]);

      let lines = result.lines || [];

      // Filter by currency and/or issuer if specified
      if (currency) {
        lines = lines.filter((line: any) => line.currency === currency);
      }
      if (issuer) {
        lines = lines.filter((line: any) => line.account === issuer);
      }

      return lines.map((line: any) => ({
        currency: line.currency,
        issuer: line.account,
        balance: line.balance,
        limit: line.limit,
        quality_in: line.quality_in || 0,
        quality_out: line.quality_out || 0
      }));
    } catch (error: any) {
      console.error(`❌ XRP getTrustlines error:`, error.message);
      return [];
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string): Promise<XRPTransaction | null> {
    try {
      const result = await this.rpcRequest('tx', [{
        transaction: hash,
        binary: false
      }]);

      const tx = result;

      // Extract amount information
      let amount = '0';
      let currency = 'XRP';
      let issuer: string | undefined;

      if (typeof tx.Amount === 'string') {
        // XRP amount in drops
        amount = (parseInt(tx.Amount) / 1000000).toString();
      } else if (typeof tx.Amount === 'object') {
        // Issued currency
        amount = tx.Amount.value;
        currency = tx.Amount.currency;
        issuer = tx.Amount.issuer;
      }

      return {
        hash: tx.hash,
        from: tx.Account,
        to: tx.Destination || '',
        amount,
        currency,
        issuer,
        destinationTag: tx.DestinationTag,
        fee: (parseInt(tx.Fee) / 1000000).toString(), // Convert drops to XRP
        ledgerIndex: tx.ledger_index,
        timestamp: this.rippleTimeToUnix(tx.date),
        validated: tx.validated || false
      };
    } catch (error: any) {
      console.error(`❌ XRP getTransaction error:`, error.message);
      return null;
    }
  }

  /**
   * Monitor address for new transactions
   */
  async monitorAddress(
    address: string,
    callback: (tx: XRPTransaction) => void,
    interval: number = 5000 // XRP ledgers close every ~3-5 seconds
  ): Promise<NodeJS.Timeout> {
    console.log(`👁️ Monitoring XRP address: ${address}`);
    
    let lastLedgerIndex = 0;
    
    const intervalId = setInterval(async () => {
      try {
        const result = await this.rpcRequest('account_tx', [{
          account: address,
          ledger_index_min: lastLedgerIndex || -1,
          ledger_index_max: -1,
          limit: 10
        }]);

        const transactions = result.transactions || [];

        for (const txWrapper of transactions) {
          const tx = txWrapper.tx;
          
          // Only process incoming payments
          if (tx.TransactionType === 'Payment' && tx.Destination === address) {
            const ledgerIndex = tx.ledger_index;
            
            if (ledgerIndex > lastLedgerIndex) {
              console.log(`💰 New XRP payment detected: ${tx.hash}`);
              
              const transaction = await this.getTransaction(tx.hash);
              if (transaction) {
                callback(transaction);
              }
            }
          }
        }

        // Update last processed ledger
        if (transactions.length > 0) {
          lastLedgerIndex = Math.max(...transactions.map((t: any) => t.tx.ledger_index));
        }
      } catch (error: any) {
        console.error(`❌ XRP monitoring error:`, error.message);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Check if account has trustline for currency
   */
  async hasTrustline(address: string, currency: string, issuer: string): Promise<boolean> {
    try {
      const trustlines = await this.getTrustlines(address, currency, issuer);
      return trustlines.length > 0;
    } catch (error: any) {
      console.error(`❌ XRP hasTrustline error:`, error.message);
      return false;
    }
  }

  /**
   * Validate XRP address
   */
  validateAddress(address: string): boolean {
    // XRP addresses start with 'r' and are typically 25-35 characters
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
  }

  /**
   * Validate destination tag
   */
  validateDestinationTag(tag: number): boolean {
    return Number.isInteger(tag) && tag >= 0 && tag <= 4294967295;
  }

  /**
   * Get current transaction fee
   */
  async getFee(): Promise<string> {
    try {
      const result = await this.rpcRequest('fee', []);
      
      // Returns fee in drops, convert to XRP
      const feeInDrops = result.drops?.open_ledger_fee || '10';
      return (parseInt(feeInDrops) / 1000000).toString();
    } catch (error: any) {
      console.error(`❌ XRP getFee error:`, error.message);
      return '0.00001'; // Default fee: 10 drops = 0.00001 XRP
    }
  }

  /**
   * Submit signed transaction
   */
  async submitTransaction(signedTxBlob: string): Promise<string> {
    try {
      const result = await this.rpcRequest('submit', [{
        tx_blob: signedTxBlob
      }]);

      if (result.engine_result !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${result.engine_result_message}`);
      }

      console.log(`✅ XRP transaction submitted: ${result.tx_json.hash}`);
      return result.tx_json.hash;
    } catch (error: any) {
      console.error(`❌ XRP submitTransaction error:`, error.message);
      throw new Error(`Failed to submit XRP transaction: ${error.message}`);
    }
  }

  /**
   * Get ledger info
   */
  async getLedgerInfo(): Promise<{
    ledgerIndex: number;
    ledgerHash: string;
    closeTime: string;
    validated: boolean;
  }> {
    try {
      const result = await this.rpcRequest('ledger', [{
        ledger_index: 'validated'
      }]);

      const ledger = result.ledger;

      return {
        ledgerIndex: ledger.ledger_index,
        ledgerHash: ledger.ledger_hash,
        closeTime: this.rippleTimeToUnix(ledger.close_time),
        validated: result.validated || false
      };
    } catch (error: any) {
      console.error(`❌ XRP getLedgerInfo error:`, error.message);
      throw error;
    }
  }

  /**
   * Convert Ripple time to Unix timestamp
   */
  private rippleTimeToUnix(rippleTime: number): string {
    // Ripple epoch starts at January 1, 2000 (946684800 seconds after Unix epoch)
    const unixTime = rippleTime + 946684800;
    return new Date(unixTime * 1000).toISOString();
  }

  /**
   * Check if account is activated (has minimum reserve)
   */
  async isAccountActivated(address: string): Promise<boolean> {
    try {
      const account = await this.getAccount(address);
      return account !== null;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get minimum account reserve
   */
  async getReserveRequirement(): Promise<{
    baseReserve: string;
    ownerReserve: string;
  }> {
    try {
      const result = await this.rpcRequest('server_state', []);
      
      const baseReserve = result.state.validated_ledger?.reserve_base_xrp || 10;
      const ownerReserve = result.state.validated_ledger?.reserve_inc_xrp || 2;

      return {
        baseReserve: baseReserve.toString(),
        ownerReserve: ownerReserve.toString()
      };
    } catch (error: any) {
      console.error(`❌ XRP getReserveRequirement error:`, error.message);
      return {
        baseReserve: '10',
        ownerReserve: '2'
      };
    }
  }
}

export const xrpService = new XRPService();
export default xrpService;

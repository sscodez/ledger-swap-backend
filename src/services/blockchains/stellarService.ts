/**
 * Stellar (XLM) Blockchain Integration Service
 * Handles Stellar transactions, assets, and trustlines
 */

import axios from 'axios';

export interface StellarTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  asset: {
    code: string;
    issuer?: string;
  };
  memo?: string;
  ledger: number;
  timestamp: string;
}

export interface StellarAsset {
  code: string;
  issuer: string;
  balance: string;
  limit?: string;
}

export interface StellarAccount {
  address: string;
  sequence: string;
  balances: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
    limit?: string;
  }>;
  subentryCount: number;
}

class StellarService {
  private horizonUrl: string;
  private networkPassphrase: string;

  constructor() {
    this.horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org';
    this.networkPassphrase = 'Public Global Stellar Network ; September 2015';
  }

  /**
   * Get Stellar account info
   */
  async getAccount(address: string): Promise<StellarAccount | null> {
    try {
      const response = await axios.get(`${this.horizonUrl}/accounts/${address}`);
      const account = response.data;

      return {
        address: account.id,
        sequence: account.sequence,
        balances: account.balances,
        subentryCount: account.subentry_count
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`ℹ️ Stellar account not found: ${address}`);
        return null;
      }
      console.error(`❌ Stellar getAccount error:`, error.message);
      throw new Error(`Failed to get Stellar account: ${error.message}`);
    }
  }

  /**
   * Get account balance for specific asset
   */
  async getBalance(address: string, assetCode: string = 'native', assetIssuer?: string): Promise<string> {
    try {
      const account = await this.getAccount(address);
      
      if (!account) {
        return '0';
      }

      if (assetCode === 'native' || assetCode === 'XLM') {
        const nativeBalance = account.balances.find(b => b.asset_type === 'native');
        return nativeBalance?.balance || '0';
      }

      const assetBalance = account.balances.find(
        b => b.asset_code === assetCode && (!assetIssuer || b.asset_issuer === assetIssuer)
      );

      return assetBalance?.balance || '0';
    } catch (error: any) {
      console.error(`❌ Stellar getBalance error:`, error.message);
      return '0';
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string): Promise<StellarTransaction | null> {
    try {
      const response = await axios.get(`${this.horizonUrl}/transactions/${hash}`);
      const tx = response.data;

      // Get operations to extract payment details
      const opsResponse = await axios.get(tx._links.operations.href);
      const operations = opsResponse.data._embedded.records;

      // Find payment operation
      const paymentOp = operations.find((op: any) => op.type === 'payment' || op.type === 'path_payment_strict_send');

      if (!paymentOp) {
        return null;
      }

      return {
        hash: tx.hash,
        from: paymentOp.from || tx.source_account,
        to: paymentOp.to || '',
        amount: paymentOp.amount || '0',
        asset: {
          code: paymentOp.asset_type === 'native' ? 'XLM' : paymentOp.asset_code,
          issuer: paymentOp.asset_issuer
        },
        memo: tx.memo,
        ledger: tx.ledger,
        timestamp: tx.created_at
      };
    } catch (error: any) {
      console.error(`❌ Stellar getTransaction error:`, error.message);
      return null;
    }
  }

  /**
   * Monitor address for new payments
   */
  async monitorAddress(
    address: string,
    callback: (tx: StellarTransaction) => void,
    assetCode?: string,
    assetIssuer?: string
  ): Promise<void> {
    console.log(`👁️ Monitoring Stellar address: ${address}`);

    try {
      // Use Stellar's streaming API
      const url = `${this.horizonUrl}/accounts/${address}/payments`;
      const params = new URLSearchParams({ cursor: 'now', order: 'asc' });

      const eventSource = new EventSource(`${url}?${params}`);

      eventSource.onmessage = async (event: any) => {
        try {
          const payment = JSON.parse(event.data);

          // Filter by asset if specified
          if (assetCode && payment.asset_code !== assetCode) {
            return;
          }
          if (assetIssuer && payment.asset_issuer !== assetIssuer) {
            return;
          }

          // Only process incoming payments
          if (payment.to !== address) {
            return;
          }

          console.log(`💰 New Stellar payment detected: ${payment.transaction_hash}`);

          const transaction = await this.getTransaction(payment.transaction_hash);
          if (transaction) {
            callback(transaction);
          }
        } catch (error: any) {
          console.error(`❌ Stellar payment processing error:`, error.message);
        }
      };

      eventSource.onerror = (error: any) => {
        console.error(`❌ Stellar EventSource error:`, error);
        eventSource.close();
      };

    } catch (error: any) {
      console.error(`❌ Stellar monitoring error:`, error.message);
    }
  }

  /**
   * Check if account has trustline for asset
   */
  async hasTrustline(address: string, assetCode: string, assetIssuer: string): Promise<boolean> {
    try {
      const account = await this.getAccount(address);
      
      if (!account) {
        return false;
      }

      return account.balances.some(
        b => b.asset_code === assetCode && b.asset_issuer === assetIssuer
      );
    } catch (error: any) {
      console.error(`❌ Stellar hasTrustline error:`, error.message);
      return false;
    }
  }

  /**
   * Get account's trustlines
   */
  async getTrustlines(address: string): Promise<StellarAsset[]> {
    try {
      const account = await this.getAccount(address);
      
      if (!account) {
        return [];
      }

      return account.balances
        .filter(b => b.asset_type !== 'native')
        .map(b => ({
          code: b.asset_code!,
          issuer: b.asset_issuer!,
          balance: b.balance,
          limit: b.limit
        }));
    } catch (error: any) {
      console.error(`❌ Stellar getTrustlines error:`, error.message);
      return [];
    }
  }

  /**
   * Validate Stellar address
   */
  validateAddress(address: string): boolean {
    // Stellar addresses start with 'G' and are 56 characters long
    return /^G[A-Z2-7]{55}$/.test(address);
  }

  /**
   * Validate memo
   */
  validateMemo(memo: string, memoType: 'text' | 'id' | 'hash' = 'text'): boolean {
    switch (memoType) {
      case 'text':
        return memo.length <= 28;
      case 'id':
        return /^\d+$/.test(memo);
      case 'hash':
        return /^[0-9a-fA-F]{64}$/.test(memo);
      default:
        return false;
    }
  }

  /**
   * Get base fee (stroops)
   */
  async getBaseFee(): Promise<string> {
    try {
      const response = await axios.get(`${this.horizonUrl}/fee_stats`);
      const feeStats = response.data;

      // Return median fee in stroops
      return feeStats.fee_charged.mode || '100';
    } catch (error: any) {
      console.error(`❌ Stellar getBaseFee error:`, error.message);
      return '100'; // Default base fee (100 stroops = 0.00001 XLM)
    }
  }

  /**
   * Submit signed transaction
   */
  async submitTransaction(signedTxEnvelope: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.horizonUrl}/transactions`,
        `tx=${encodeURIComponent(signedTxEnvelope)}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      console.log(`✅ Stellar transaction submitted: ${response.data.hash}`);
      return response.data.hash;
    } catch (error: any) {
      console.error(`❌ Stellar submitTransaction error:`, error.response?.data || error.message);
      throw new Error(`Failed to submit Stellar transaction: ${error.message}`);
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    ledger: number;
    baseFee: string;
    baseReserve: string;
  }> {
    try {
      const response = await axios.get(`${this.horizonUrl}/ledgers?order=desc&limit=1`);
      const latestLedger = response.data._embedded.records[0];

      return {
        ledger: latestLedger.sequence,
        baseFee: latestLedger.base_fee_in_stroops,
        baseReserve: latestLedger.base_reserve_in_stroops
      };
    } catch (error: any) {
      console.error(`❌ Stellar getNetworkInfo error:`, error.message);
      throw error;
    }
  }

  /**
   * Get asset info from Stellar.expert
   */
  async getAssetInfo(assetCode: string, assetIssuer: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.stellar.expert/explorer/public/asset/${assetCode}-${assetIssuer}`
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ Stellar getAssetInfo error:`, error.message);
      return null;
    }
  }
}

export const stellarService = new StellarService();
export default stellarService;

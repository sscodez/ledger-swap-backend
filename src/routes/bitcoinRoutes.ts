import express from 'express';
import bitcoinService from '../services/blockchains/bitcoinService';

const router = express.Router();

/**
 * Build an unsigned PSBT for sending BTC from a user's address to an admin address.
 * Body: { fromAddress: string, toAddress: string, amountBTC: number, feeRate?: number }
 * Returns: { psbtBase64: string, inputs: number, changeSat: number, network: 'mainnet'|'testnet' }
 */
router.post('/prefund/build-psbt', async (req, res) => {
  try {
    const { fromAddress, toAddress, amountBTC, feeRate } = req.body || {};

    if (!fromAddress || !toAddress || !amountBTC) {
      return res.status(400).json({ message: 'Missing required fields: fromAddress, toAddress, amountBTC' });
    }

    const result = await bitcoinService.buildUnsignedPsbt(fromAddress, toAddress, Number(amountBTC), Number(feeRate) || 10);
    return res.json(result);
  } catch (err: any) {
    console.error('❌ build-psbt error:', err);
    return res.status(500).json({ message: err?.message || 'Failed to build PSBT' });
  }
});

/**
 * Broadcast a signed PSBT
 * Body: { signedPsbtBase64: string }
 * Returns: { txid: string }
 */
router.post('/broadcast-psbt', async (req, res) => {
  try {
    const { signedPsbtBase64 } = req.body || {};
    if (!signedPsbtBase64) {
      return res.status(400).json({ message: 'Missing signedPsbtBase64' });
    }

    const txid = await bitcoinService.finalizeAndBroadcastSignedPsbt(signedPsbtBase64);
    return res.json({ txid });
  } catch (err: any) {
    console.error('❌ broadcast-psbt error:', err);
    return res.status(500).json({ message: err?.message || 'Failed to broadcast PSBT' });
  }
});

export default router;

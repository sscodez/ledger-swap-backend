import { Router } from 'express';
import xummService from '../services/xummService';

const router = Router();

router.post('/connect', async (req, res) => {
  try {
    const { account } = req.body || {};
    const payload = await xummService.createSignInPayload(account);
    return res.json(payload);
  } catch (error: any) {
    if (error.message === 'XUMM SDK is not configured') {
      return res.status(503).json({
        success: false,
        message: 'XUMM integration is not configured. Please set XUMM_API_KEY and XUMM_API_SECRET.',
      });
    }

    console.error('Failed to create XUMM payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create XUMM payload',
      error: error.message,
    });
  }
});

router.get('/status/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const status = await xummService.getPayloadStatus(uuid);
    return res.json(status);
  } catch (error: any) {
    if (error.message === 'XUMM SDK is not configured') {
      return res.status(503).json({
        success: false,
        message: 'XUMM integration is not configured. Please set XUMM_API_KEY and XUMM_API_SECRET.',
      });
    }

    console.error('Failed to retrieve XUMM payload status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve XUMM payload status',
      error: error.message,
    });
  }
});

export default router;

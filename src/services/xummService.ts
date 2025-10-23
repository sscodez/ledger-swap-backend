import { XummSdk } from 'xumm-sdk';
import { logger } from '../utils/logger';

type SignInPayloadResponse = {
  uuid: string;
  next: string;
  qrPng: string;
  qrSvg?: string;
  websocketStatus?: string;
  pushed: boolean;
  expiresAt?: string;
};

type PayloadStatus = {
  uuid: string;
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  account?: string | null;
  txid?: string | null;
  expiresAt?: string;
};

class XummService {
  private sdk: XummSdk | null = null;

  constructor() {
    const apiKey = process.env.XUMM_API_KEY;
    const apiSecret = process.env.XUMM_API_SECRET;

    if (!apiKey || !apiSecret) {
      logger.warn('XUMM SDK is not configured. Missing XUMM_API_KEY or XUMM_API_SECRET');
      this.sdk = null;
      return;
    }

    this.sdk = new XummSdk(apiKey, apiSecret);
    logger.info('XUMM SDK initialized');
  }

  private getSdk(): XummSdk {
    if (!this.sdk) {
      throw new Error('XUMM SDK is not configured');
    }

    return this.sdk;
  }

  async createSignInPayload(account?: string): Promise<SignInPayloadResponse> {
    const sdk = this.getSdk();

    const payload = await sdk.payload.create({
      txjson: {
        TransactionType: 'SignIn',
        ...(account ? { Account: account } : {}),
      },
    });

    if (!payload) {
      throw new Error('Failed to create XUMM sign-in payload');
    }

    const nextSection = payload.next ?? {};
    const nextUrl = typeof nextSection.always === 'string' ? nextSection.always : '';
    const refs: Partial<typeof payload.refs> = payload.refs ?? {};
    const qrSvg = (refs as { qr_svg?: string }).qr_svg;
    const expiresAt = (payload as { expires_at?: string }).expires_at;

    if (!refs?.qr_png) {
      throw new Error('XUMM payload missing QR PNG reference');
    }

    return {
      uuid: payload.uuid ?? '',
      next: nextUrl,
      qrPng: refs.qr_png,
      qrSvg,
      websocketStatus: refs.websocket_status,
      pushed: payload.pushed ?? false,
      expiresAt,
    };
  }

  async getPayloadStatus(uuid: string): Promise<PayloadStatus> {
    const sdk = this.getSdk();

    const payload = await sdk.payload.get(uuid);

     if (!payload) {
      throw new Error('Failed to retrieve XUMM payload status');
    }

    const meta = payload.meta ?? {};
    const response = payload.response ?? {};
    const expiresAt = (payload as { expires_at?: string }).expires_at ?? undefined;
    const payloadUuid = (payload as { uuid?: string }).uuid ?? uuid;

    return {
      uuid: payloadUuid,
      signed: meta.signed === true,
      cancelled: meta.cancelled === true,
      expired: meta.expired === true,
      account: response.account ?? null,
      txid: response.txid ?? null,
      expiresAt,
    };
  }
}

export default new XummService();

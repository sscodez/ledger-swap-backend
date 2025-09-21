import { Request, Response, NextFunction } from 'express';
import PlatformSettings from '../models/PlatformSettings';

// Simple in-memory rate limit store: key -> { count, resetAt }
// Keyed by combination of requester IP and provided email (if any)
const store = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request): string {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
  // Email is inside body for signin endpoints
  const email = (req.body?.email || 'no-email').toString().toLowerCase();
  return `${ip}:${email}`;
}

async function getLimit(): Promise<number> {
  try {
    const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
    if (settings && typeof settings.loginRateLimitPerHour === 'number' && settings.loginRateLimitPerHour >= 0) {
      return settings.loginRateLimitPerHour;
    }
  } catch (e) {
    // ignore and fallback
  }
  return 5; // default
}

export async function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const limit = await getLimit();
  const key = getClientKey(req);
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    // reset window
    store.set(key, { count: 1, resetAt: now + hour });
    return next();
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', retryAfterSec.toString());
    return res.status(429).json({ message: 'Too many login attempts. Please try again later.', retryAfterSec, limit });
  }

  entry.count += 1;
  store.set(key, entry);
  return next();
}

import { Request, Response, RequestHandler } from 'express';
import { logIntentEvent, listIntentLogs as listIntentEntries, getIntentLogSummary } from '../services/intentLogService';
import { getGuardianStatuses } from '../services/guardianSystem';

export const listIntentLogs: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { limit, eventType } = req.query as { limit?: string; eventType?: any };
    const numericLimit = limit ? parseInt(limit, 10) : 100;

    const [logs, summary] = await Promise.all([
      listIntentEntries(Number.isNaN(numericLimit) ? 100 : numericLimit, eventType),
      getIntentLogSummary(),
    ]);

    return res.json({
      logs,
      summary,
    });
  } catch (error: any) {
    console.error('Failed to list intent logs:', error);
    return res.status(500).json({ message: 'Failed to fetch intent logs', error: error?.message || String(error) });
  }
};

export const logMirrorIntent: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { reflectionId, details } = req.body || {};
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string | undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;

    await logIntentEvent({
      reflectionId,
      eventType: 'mirror',
      message: 'Mirror API reroute engaged',
      metadata: {
        details,
        path: req.originalUrl,
      },
      source: 'mirror-route',
      ipAddress,
      userAgent,
    });

    return res.status(403).json({
      status: 'rerouted',
      guardian: 'Orobona',
      message: 'Defensive layer active',
    });
  } catch (error: any) {
    console.error('Failed to log mirror intent:', error);
    return res.status(500).json({ message: 'Mirror guard failed', error: error?.message || String(error) });
  }
};

export const getGuardianStatusesHandler: RequestHandler = (_req: Request, res: Response) => {
  return res.json({
    guardians: getGuardianStatuses(),
    checkedAt: new Date().toISOString(),
  });
};

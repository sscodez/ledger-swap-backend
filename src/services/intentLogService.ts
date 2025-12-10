import IntentLog, { IIntentLog, IntentEventType } from '../models/IntentLog';

interface LogIntentParams {
  reflectionId?: string;
  eventType: IntentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  guardian?: string;
  source?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logIntentEvent(params: LogIntentParams): Promise<IIntentLog> {
  const entry = await IntentLog.create({
    reflectionId: params.reflectionId?.toUpperCase(),
    eventType: params.eventType,
    message: params.message,
    metadata: params.metadata || {},
    guardian: params.guardian,
    source: params.source || 'backend',
    ipAddress: params.ipAddress || undefined,
    userAgent: params.userAgent || undefined,
  });

  return entry;
}

export async function listIntentLogs(limit = 100, eventType?: IntentEventType) {
  const filter: Partial<Pick<IIntentLog, 'eventType'>> = {};
  if (eventType) {
    filter.eventType = eventType;
  }

  const logs = await IntentLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 250));

  return logs;
}

export async function getIntentLogSummary() {
  const summary = await IntentLog.aggregate([
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        lastEvent: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        lastEvent: 1,
        _id: 0,
      },
    },
  ]);

  return summary;
}

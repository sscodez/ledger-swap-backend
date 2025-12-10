import mongoose, { Document, Schema } from 'mongoose';

export type IntentEventType = 'swap' | 'anomaly' | 'mirror' | 'guardian' | 'email';

export interface IIntentLog extends Document {
  reflectionId?: string;
  eventType: IntentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  guardian?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const intentLogSchema = new Schema<IIntentLog>(
  {
    reflectionId: {
      type: String,
      index: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    eventType: {
      type: String,
      enum: ['swap', 'anomaly', 'mirror', 'guardian', 'email'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    guardian: {
      type: String,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'backend',
      trim: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const IntentLog = mongoose.model<IIntentLog>('IntentLog', intentLogSchema);

export default IntentLog;

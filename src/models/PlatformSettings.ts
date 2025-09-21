import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
  key: string; // singleton key, e.g., 'default'
  swapFeePercent: number; // percentage, e.g., 0.3 means 0.3%
  privacyMode: boolean; // enhanced privacy protection for user data
  autoRefreshDashboard: boolean; // auto-refresh dashboard data
  notificationSettings: {
    alertsEnabled: boolean;
  };
  loginRateLimitPerHour: number;
}

const platformSettingsSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, default: 'default' },
  swapFeePercent: { type: Number, required: true, default: 0 },
  privacyMode: { type: Boolean, required: true, default: false },
  autoRefreshDashboard: { type: Boolean, required: true, default: false },
  notificationSettings: {
    alertsEnabled: { type: Boolean, required: true, default: false },
  },
  loginRateLimitPerHour: { type: Number, required: true, default: 5 },
}, { timestamps: true });

const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);
export default PlatformSettings;


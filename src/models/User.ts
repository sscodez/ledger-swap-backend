import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  facebookId?: string;
  phone?: string;
  country?: string;
  profilePicture?: string;
  role?: 'user' | 'admin';
  flagged?: boolean;
  flaggedReason?: string;
  flaggedAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpires?: Date;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
}

const userSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  googleId: {
    type: String,
  },
  facebookId: {
    type: String,
  },
  phone: {
    type: String,
  },
  country: {
    type: String,
  },
  profilePicture: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true,
  },
  flagged: {
    type: Boolean,
    default: false,
    index: true,
  },
  flaggedReason: {
    type: String,
  },
  flaggedAt: {
    type: Date,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  resetPasswordCode: {
    type: String,
  },
  resetPasswordCodeExpires: {
    type: Date,
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
}, {
  timestamps: true,
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;

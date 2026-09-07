const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    bio: {
      type: String,
      default: '',
      maxlength: 200,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    settings: {
      type: new mongoose.Schema(
        {
          privacy: {
            type: new mongoose.Schema(
              {
                lastSeen: {
                  type: String,
                  enum: ['everyone', 'contacts', 'nobody'],
                  default: 'everyone',
                },
                onlineStatus: { type: Boolean, default: true },
                readReceipts: { type: Boolean, default: true },
                profilePhoto: {
                  type: String,
                  enum: ['everyone', 'contacts', 'nobody'],
                  default: 'everyone',
                },
              },
              { _id: false }
            ),
            default: () => ({}),
          },
          notifications: {
            type: new mongoose.Schema(
              {
                messages: { type: Boolean, default: true },
                sound: { type: Boolean, default: true },
                preview: { type: Boolean, default: true },
              },
              { _id: false }
            ),
            default: () => ({}),
          },
          appearance: {
            type: new mongoose.Schema(
              {
                theme: {
                  type: String,
                  enum: ['dark', 'light', 'system'],
                  default: 'system',
                },
                fontSize: {
                  type: String,
                  enum: ['small', 'medium', 'large'],
                  default: 'medium',
                },
              },
              { _id: false }
            ),
            default: () => ({}),
          },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

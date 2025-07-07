import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: function () {
        // Password is required only if no social accounts are attached
        return this.socialAccounts.length === 0;
      },
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },
    avatar: {
      type: String,
      default: null,
    },
    onboarding: {
      type: Boolean,
      default: false,
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },

    socialAccounts: [
      {
        provider: {
          type: String,
          enum: ["google", "github", "facebook", "twitter"],
        },
        providerId: String,
        providerEmail: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual("displayName").get(function () {
  return this.username || this.fullName;
});
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "socialAccounts.providerId": 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();

  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.socialAccounts;

  return userObject;
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username: username });
};

userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

userSchema.statics.usernameExists = async function (username) {
  const user = await this.findOne({ username: username });
  return !!user;
};

const User = mongoose.model("User", userSchema);

export default User;

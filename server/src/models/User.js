const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,   // Allows multiple documents to have null/no email
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
      default: undefined,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      // Removed "select: false" so password is retrieved for comparePassword()
    },
    role: {
      type: String,
      enum: ["patient", "doctor"],
      default: "patient",
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      lowercase: true,
      trim: true,
      enum: [
        "male",
        "female",
        "other",
        "prefer_not_to_say",
        "Male",
        "Female",
        "Other",
        "Prefer_not_to_say"
      ],
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    // Doctor-only fields
    specialty: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to hash password securely
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Return standardized safe user payload
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.fullName = obj.name;
  obj.mobileNumber = obj.mobileNumber || obj.phone;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
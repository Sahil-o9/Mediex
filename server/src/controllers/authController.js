const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    name,
    mobileNumber,
    phone,
    email,
    password,
    role,
    dateOfBirth,
    gender,
    specialty,
    licenseNumber,
  } = req.body;

  // Standardize name and mobile parameters sent from React frontend
  const userName = fullName || name;
  const rawMobile = mobileNumber || phone;

  if (!userName || !rawMobile || !password) {
    res.status(400);
    throw new Error("Name, mobile number, and password are required");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const cleanMobile = String(rawMobile).trim();

  // Check if an account already exists with this mobile number or phone
  const existingMobile = await User.findOne({
    $or: [{ mobileNumber: cleanMobile }, { phone: cleanMobile }],
  });
  if (existingMobile) {
    res.status(409);
    throw new Error("An account with that mobile number already exists");
  }

  // Check duplicate email only if a valid string email is provided
  let cleanEmail;
  if (email && typeof email === "string" && email.trim() !== "") {
    cleanEmail = email.toLowerCase().trim();
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      res.status(409);
      throw new Error("An account with that email already exists");
    }
  }

  // Create new user in DB (Plain password passed, User.js pre('save') hook hashes it)
  const user = await User.create({
    name: String(userName).trim(),
    mobileNumber: cleanMobile,
    phone: cleanMobile,
    email: cleanEmail || undefined,
    password,
    role: role === "doctor" ? "doctor" : "patient",
    dateOfBirth,
    gender,
    specialty,
    licenseNumber,
  });

  const safeUser = user.toSafeObject
    ? user.toSafeObject()
    : {
        _id: user._id,
        fullName: user.name,
        mobileNumber: user.mobileNumber || user.phone,
        email: user.email,
        role: user.role,
      };

  res.status(201).json({
    success: true,
    user: safeUser,
    token: generateToken(user._id || user.id),
  });
});

// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { mobileNumber, email, phone, password } = req.body;

  const rawIdentifier = mobileNumber || phone || email;

  if (!rawIdentifier || !password) {
    res.status(400);
    throw new Error("Mobile number and password are required");
  }

  const cleanIdentifier = String(rawIdentifier).trim();
  const isEmail = cleanIdentifier.includes("@");

  const query = isEmail
    ? { email: cleanIdentifier.toLowerCase() }
    : { $or: [{ mobileNumber: cleanIdentifier }, { phone: cleanIdentifier }] };

  // Explicitly fetch password field even if hidden by schema select: false
  const user = await User.findOne(query).select("+password");

  console.log("\n=== DEBUG LOGIN REQUEST ===");
  console.log("Incoming Identifier:", cleanIdentifier);
  console.log("User Found in DB:", user ? user._id : "NOT FOUND");

  if (!user) {
    console.log("===========================\n");
    res.status(401);
    throw new Error("Invalid mobile number or password");
  }

  // Verify password using schema instance method
  const isMatch = await user.comparePassword(password);
  console.log("Password Match Result:", isMatch);
  console.log("===========================\n");

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid mobile number or password");
  }

  const safeUser = user.toSafeObject
    ? user.toSafeObject()
    : {
        _id: user._id,
        fullName: user.name,
        mobileNumber: user.mobileNumber || user.phone,
        email: user.email,
        role: user.role,
      };

  res.json({
    success: true,
    user: safeUser,
    token: generateToken(user._id || user.id),
  });
});

// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const safeUser = req.user.toSafeObject
    ? req.user.toSafeObject()
    : {
        _id: req.user._id,
        fullName: req.user.name,
        mobileNumber: req.user.mobileNumber || req.user.phone,
        email: req.user.email,
        role: req.user.role,
      };

  res.json({ success: true, user: safeUser });
});

module.exports = { registerUser, loginUser, getMe };
const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const { generateToken } = require("../middleware/auth");

// @route   POST /api/auth/register
// @desc    Register new admin
// @access  Public (should be protected in production)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        token: generateToken(admin._id),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login admin
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt for: ${email}`);

    // Validate email & password
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    // Check for admin
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      console.log(`❌ No admin found with email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      console.log(`❌ Password mismatch for: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    console.log(`✅ Login successful for: ${email}`);

    res.json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        token: generateToken(admin._id),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { protect } = require("../middleware/auth");

// @route   GET /api/auth/me
// @desc    Get current logged in admin
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/auth/update-password
// @desc    Update admin password
// @access  Private
router.put("/update-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get admin with password
    const admin = await Admin.findById(req.admin._id).select("+password");

    // Check current password
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    // Update password (pre-save hook will hash it)
    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update admin profile (name, email)
// @access  Private
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, email, currentPassword } = req.body;

    // Get admin with password
    const admin = await Admin.findById(req.admin._id).select("+password");

    // Check current password
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Check if email is already taken by another admin
    if (email !== admin.email) {
      const emailExists = await Admin.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Update fields
    admin.name = name || admin.name;
    admin.email = email || admin.email;

    await admin.save();

    res.json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

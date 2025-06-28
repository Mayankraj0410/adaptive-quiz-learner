const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/emailService');

const router = express.Router();

// Request OTP for login/registration
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    // AUTO-REGISTRATION: If user doesn't exist, create them automatically
    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        role: 'user' // Default role for self-registered users
      });
      await user.save();
      console.log(`✅ New user auto-registered: ${email}`);
    }

    // COMMENTED OUT: Old admin-only registration requirement
    // if (!user) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'User not found. Please contact admin to create your account.'
    //   });
    // }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact admin.'
      });
    }

    // Generate OTP
    const otpCode = OTP.generateOTP();
    
    // Remove any existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });
    
    // Create new OTP record
    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode
    });
    
    await otpRecord.save();
    
    // Send OTP email
    await sendOTPEmail(email, otpCode);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        email: email.toLowerCase(),
        expiresIn: '10 minutes'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// Verify OTP and get JWT token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find the OTP record
    const otpRecord = await OTP.findOne({ 
      email: email.toLowerCase(),
      isUsed: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or already used'
      });
    }

    // Verify OTP
    try {
      otpRecord.verify(otp);
      await otpRecord.save();
    } catch (otpError) {
      await otpRecord.save(); // Save the incremented attempts
      return res.status(400).json({
        success: false,
        message: otpError.message
      });
    }

    // Get user details
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed. Please try again.'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check rate limiting (max 3 OTPs per 10 minutes)
    const recentOTPs = await OTP.find({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });

    if (recentOTPs.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 10 minutes before requesting again.'
      });
    }

    // Generate new OTP
    const otpCode = OTP.generateOTP();
    
    // Create new OTP record
    const otpRecord = new OTP({
      email: email.toLowerCase(),
      otp: otpCode
    });
    
    await otpRecord.save();
    
    // Send OTP email
    await sendOTPEmail(email, otpCode);
    
    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email address'
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.'
    });
  }
});

// Debug route to test email functionality (admin only)
router.post('/test-email', async (req, res) => {
  try {
    // Check if user is admin (basic check)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('Testing email service with admin request...');
    
    // Send a test OTP
    const testOTP = '123456';
    await sendOTPEmail(email, testOTP);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        email,
        testOTP: testOTP
      }
    });

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
});

module.exports = router;

const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // Clean up the password by removing any spaces (Gmail app passwords often have spaces)
  const cleanPassword = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';
  
  console.log('Creating email transporter with config:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    passLength: cleanPassword.length
  });
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: cleanPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Enable debug mode
    logger: true // Enable logging
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    console.log('Attempting to send OTP email to:', email);
    console.log('Email configuration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
    });
    
    const transporter = createTransporter();
    
    // Test the connection first
    await transporter.verify();
    console.log('Email transporter verified successfully');
    
    const mailOptions = {
      from: `"Adaptive Quiz Learner" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Login OTP - Adaptive Quiz Learner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Adaptive Quiz Learner</h2>
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for login is:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This OTP is valid for 10 minutes only</li>
            <li>Do not share this OTP with anyone</li>
            <li>Use this OTP only on the official Adaptive Quiz Learner platform</li>
          </ul>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Detailed email error:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    });
    
    // FALLBACK: Log OTP to console for development/testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 EMAIL FAILED - DEVELOPMENT FALLBACK 🚨');
      console.log(`📧 OTP for ${email}: ${otp}`);
      console.log('⚠️  Please use this OTP from the console logs');
      console.log('💡 To fix email: Set up Gmail App Password in .env file');
      
      // Return success for development mode
      return { messageId: 'console-fallback', info: 'OTP logged to console' };
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send OTP email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please set up App Password in Gmail settings.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email server. Please check network connection.';
    } else if (error.responseCode === 535) {
      errorMessage = 'Invalid Gmail credentials. Please use App Password instead of regular password.';
    }
    
    throw new Error(errorMessage);
  }
};

// Send welcome email to new user
const sendWelcomeEmail = async (email, isAdmin = false) => {
  try {
    const transporter = createTransporter();
    
    const role = isAdmin ? 'Admin' : 'User';
    const features = isAdmin ? [
      'Manage users in the system',
      'View all quiz reports and analytics',
      'Monitor system performance',
      'Add or remove users'
    ] : [
      'Take adaptive quizzes tailored to your learning needs',
      'Track your progress and identify weak areas',
      'Get AI-powered explanations for questions',
      'Monitor your improvement over time'
    ];
    
    const mailOptions = {
      from: `"Adaptive Quiz Learner" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to Adaptive Quiz Learner - ${role} Account Created`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to Adaptive Quiz Learner! 🎉</h2>
          <p>Hello,</p>
          <p>Your ${role.toLowerCase()} account has been successfully created.</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">Account Details:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Status:</strong> Active</p>
          </div>
          
          <h3 style="color: #2c3e50;">What you can do:</h3>
          <ul>
            ${features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Getting Started:</strong></p>
            <p style="margin: 5px 0 0 0;">Login using your email address. You'll receive an OTP for secure authentication.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. If you have any questions, please contact the system administrator.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email failure
    return null;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};

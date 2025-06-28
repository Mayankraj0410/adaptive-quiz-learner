const express = require('express');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// All routes require admin role
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role = 'all', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (role !== 'all') {
      query.role = role;
    }
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Calculate statistics for each user
    const usersWithStats = users.map(user => {
      const totalQuizzes = user.quizHistory.length;
      const averageScore = totalQuizzes > 0 
        ? Math.round(user.quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes)
        : 0;
      
      return {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        statistics: {
          totalQuizzes,
          averageScore,
          lastQuizDate: totalQuizzes > 0 ? user.quizHistory[totalQuizzes - 1].completedAt : null
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

// Add new user
router.post('/user/add', async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      role: role
    });

    await newUser.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(email, role === 'admin');
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Don't fail the user creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Get specific user details
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's quiz statistics
    const totalQuizzes = user.quizHistory.length;
    const averageScore = totalQuizzes > 0 
      ? Math.round(user.quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        statistics: {
          totalQuizzes,
          averageScore,
          weakTopics: user.getWeakTopics(),
          quizHistory: user.quizHistory.slice(-10) // Last 10 quizzes
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details'
    });
  }
});

// Update user status (activate/deactivate)
router.put('/user/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Delete user and all associated data
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete all user's quizzes
    await Quiz.deleteMany({ userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user quiz reports
router.get('/user/:userId/reports', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const quizzes = await Quiz.find({ 
      userId, 
      isCompleted: true 
    })
    .sort({ completedAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

    const total = await Quiz.countDocuments({ 
      userId, 
      isCompleted: true 
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        quizzes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalQuizzes: total,
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user reports'
    });
  }
});

// Get system statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalQuizzes = await Quiz.countDocuments({ isCompleted: true });
    const totalQuestions = await Question.countDocuments({ isActive: true });

    // Get average scores
    const quizzes = await Quiz.find({ isCompleted: true }).select('score');
    const averageScore = quizzes.length > 0 
      ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.score, 0) / quizzes.length)
      : 0;

    // Get topic-wise question distribution
    const topicDistribution = await Question.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: totalAdmins
        },
        quizzes: {
          total: totalQuizzes,
          averageScore
        },
        questions: {
          total: totalQuestions,
          byTopic: topicDistribution
        }
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics'
    });
  }
});

module.exports = router;

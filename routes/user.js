const express = require('express');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const { requireUser } = require('../middleware/auth');
const { generateStudyRecommendations } = require('../utils/openaiService');

const router = express.Router();

// All routes require user role
router.use(requireUser);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate overall statistics
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
          createdAt: user.createdAt,
          isActive: user.isActive
        },
        statistics: {
          totalQuizzes,
          averageScore,
          weakTopics: user.getWeakTopics()
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Get user quiz history
router.get('/quiz-history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const quizzes = await Quiz.find({ 
      userId: req.user._id, 
      isCompleted: true 
    })
    .sort({ completedAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .select('-questions.questionText -questions.options');

    const total = await Quiz.countDocuments({ 
      userId: req.user._id, 
      isCompleted: true 
    });

    res.status(200).json({
      success: true,
      data: {
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
    console.error('Get quiz history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz history'
    });
  }
});

// Get detailed quiz report
router.get('/quiz-report/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findOne({
      _id: quizId,
      userId: req.user._id,
      isCompleted: true
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const performanceSummary = quiz.getPerformanceSummary();

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          quizType: quiz.quizType,
          completedAt: quiz.completedAt,
          timeTaken: quiz.timeTaken,
          ...performanceSummary
        },
        topicAnalysis: quiz.topicWiseAnalysis,
        questions: quiz.questions.map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer,
          isCorrect: q.isCorrect,
          topic: q.topic,
          explanationRequested: q.explanationRequested
        }))
      }
    });

  } catch (error) {
    console.error('Get quiz report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz report'
    });
  }
});

// Get personalized study recommendations
router.get('/study-recommendations', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || user.quizHistory.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          recommendations: 'Start taking quizzes to get personalized study recommendations based on your performance.',
          hasData: false
        }
      });
    }

    const weakTopics = user.getWeakTopics();
    const recentQuizzes = user.quizHistory.slice(-5); // Last 5 quizzes
    const averageScore = recentQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / recentQuizzes.length;

    const performanceData = {
      score: Math.round(averageScore),
      weakTopics: weakTopics.slice(0, 3), // Top 3 weak topics
      strongTopics: [], // Calculate from user data
      quizHistory: user.quizHistory.length
    };

    // Get AI recommendations
    const recommendations = await generateStudyRecommendations(performanceData);

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        performanceData,
        hasData: true
      }
    });

  } catch (error) {
    console.error('Get study recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get study recommendations'
    });
  }
});

// Delete user account and all data
router.delete('/delete-account', async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all user's quizzes
    await Quiz.deleteMany({ userId });

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account. Please try again.'
    });
  }
});

// Update user preferences (for future use)
router.put('/preferences', async (req, res) => {
  try {
    // For future implementation of user preferences
    res.status(200).json({
      success: true,
      message: 'User preferences updated successfully'
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

module.exports = router;

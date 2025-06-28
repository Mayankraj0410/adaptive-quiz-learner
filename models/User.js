const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  quizHistory: [{
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    topicWiseAnalysis: {
      type: Map,
      of: {
        correct: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
      }
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  overallWeakness: {
    type: Map,
    of: {
      weaknessScore: { type: Number, default: 0 },
      strengthScore: { type: Number, default: 0 },
      totalAttempts: { type: Number, default: 0 }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to get weak topics
userSchema.methods.getWeakTopics = function() {
  const weakTopics = [];
  if (this.overallWeakness) {
    this.overallWeakness.forEach((analysis, topic) => {
      if (analysis.weaknessScore > 50) { // More than 50% incorrect
        weakTopics.push({
          topic: topic,
          weaknessScore: analysis.weaknessScore
        });
      }
    });
  }
  return weakTopics.sort((a, b) => b.weaknessScore - a.weaknessScore);
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role: role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizType: {
    type: String,
    enum: ['initial', 'adaptive'],
    required: true
  },
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionText: String,
    options: [String],
    correctAnswer: String,
    userAnswer: String,
    isCorrect: {
      type: Boolean,
      default: false
    },
    topic: String,
    timeTaken: {
      type: Number, // in seconds
      default: 0
    },
    explanationRequested: {
      type: Boolean,
      default: false
    },
    explanation: String
  }],
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topicWiseAnalysis: {
    type: Map,
    of: {
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    }
  },
  timeTaken: {
    type: Number, // total time in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate score and analysis before saving
quizSchema.pre('save', function(next) {
  if (this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
    
    // Calculate correct answers and score
    this.correctAnswers = this.questions.filter(q => q.isCorrect).length;
    this.score = Math.round((this.correctAnswers / this.totalQuestions) * 100);
    
    // Calculate topic-wise analysis
    const topicAnalysis = new Map();
    
    this.questions.forEach(question => {
      const topic = question.topic;
      if (!topicAnalysis.has(topic)) {
        topicAnalysis.set(topic, { correct: 0, total: 0, percentage: 0 });
      }
      
      const analysis = topicAnalysis.get(topic);
      analysis.total += 1;
      if (question.isCorrect) {
        analysis.correct += 1;
      }
      analysis.percentage = Math.round((analysis.correct / analysis.total) * 100);
      
      topicAnalysis.set(topic, analysis);
    });
    
    this.topicWiseAnalysis = topicAnalysis;
  }
  
  next();
});

// Instance method to get performance summary
quizSchema.methods.getPerformanceSummary = function() {
  const weakTopics = [];
  const strongTopics = [];
  
  if (this.topicWiseAnalysis) {
    this.topicWiseAnalysis.forEach((analysis, topic) => {
      if (analysis.percentage < 60) {
        weakTopics.push({ topic, percentage: analysis.percentage });
      } else if (analysis.percentage >= 80) {
        strongTopics.push({ topic, percentage: analysis.percentage });
      }
    });
  }
  
  return {
    score: this.score,
    correctAnswers: this.correctAnswers,
    totalQuestions: this.totalQuestions,
    weakTopics: weakTopics.sort((a, b) => a.percentage - b.percentage),
    strongTopics: strongTopics.sort((a, b) => b.percentage - a.percentage),
    timeTaken: this.timeTaken
  };
};

// Static method to get user quiz history
quizSchema.statics.getUserQuizHistory = function(userId, limit = 10) {
  return this.find({ userId: userId, isCompleted: true })
    .sort({ completedAt: -1 })
    .limit(limit)
    .populate('userId', 'email');
};

module.exports = mongoose.model('Quiz', quizSchema);

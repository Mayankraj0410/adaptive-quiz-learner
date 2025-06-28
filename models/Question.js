const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: String,
    required: [true, 'Correct answer is required'],
    trim: true
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
    enum: [
      'Human Body Systems',
      'Plant Structure and Function',
      'Animal Diversity',
      'Nutrition and Digestion',
      'Respiration and Circulation',
      'Growth and Development',
      'Reproduction',
      'Environmental Adaptation'
    ]
  },
  chapter: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  subject: {
    type: String,
    default: 'Biology',
    required: true
  },
  grade: {
    type: String,
    default: 'Class 6',
    required: true
  },
  explanation: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  generatedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Validate that options array has at least 2 options
questionSchema.pre('save', function(next) {
  if (this.options.length < 2) {
    next(new Error('Question must have at least 2 options'));
  }
  
  // Check if correct answer is one of the options
  if (!this.options.includes(this.correctAnswer)) {
    next(new Error('Correct answer must be one of the provided options'));
  }
  
  this.updatedAt = Date.now();
  next();
});

// Static method to get questions by topic
questionSchema.statics.findByTopic = function(topic, limit = null) {
  const query = this.find({ topic: topic, isActive: true });
  if (limit) {
    query.limit(limit);
  }
  return query;
};

// Static method to get random questions
questionSchema.statics.getRandomQuestions = function(count, topics = null) {
  const matchStage = { isActive: true };
  if (topics && topics.length > 0) {
    matchStage.topic = { $in: topics };
  }
  
  return this.aggregate([
    { $match: matchStage },
    { $sample: { size: count } }
  ]);
};

// Static method to get questions for adaptive quiz
questionSchema.statics.getAdaptiveQuestions = async function(weakTopics, totalQuestions = 20, excludeQuestionIds = []) {
  if (weakTopics && weakTopics.length > 0) {
    // 60% questions from weak topics, 40% from all topics for variety
    const weakTopicQuestions = Math.floor(totalQuestions * 0.6);
    const generalQuestions = totalQuestions - weakTopicQuestions;
    
    console.log(`Targeting ${weakTopicQuestions} questions from weak topics [${weakTopics.join(', ')}] and ${generalQuestions} general questions`);
    
    // Get weak topic questions first
    const weakQuestions = await this.aggregate([
      { 
        $match: { 
          topic: { $in: weakTopics }, 
          isActive: true,
          _id: { $nin: excludeQuestionIds }
        } 
      },
      { $sample: { size: Math.min(weakTopicQuestions, 15) } }
    ]);
    
    // Get general questions, excluding already selected ones
    const usedIds = [...excludeQuestionIds, ...weakQuestions.map(q => q._id)];
    const generalQuestionsActual = await this.aggregate([
      { 
        $match: { 
          isActive: true,
          _id: { $nin: usedIds }
        } 
      },
      { $sample: { size: generalQuestions } }
    ]);
    
    const allQuestions = [...weakQuestions, ...generalQuestionsActual];
    console.log(`Selected ${weakQuestions.length} weak topic + ${generalQuestionsActual.length} general = ${allQuestions.length} total questions`);
    
    return allQuestions;
  } else {
    // No weak topics, get random questions from all topics excluding recent ones
    const questions = await this.aggregate([
      { 
        $match: { 
          isActive: true,
          _id: { $nin: excludeQuestionIds }
        } 
      },
      { $sample: { size: totalQuestions } }
    ]);
    
    console.log(`Selected ${questions.length} random questions (no weak topics identified)`);
    return questions;
  }
};

module.exports = mongoose.model('Question', questionSchema);

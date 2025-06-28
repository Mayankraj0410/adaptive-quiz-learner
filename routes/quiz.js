const express = require('express');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { generateQuestionExplanation, generateQuestionsForWeakTopics } = require('../utils/openaiService');

const router = express.Router();

// Start a new quiz
router.post('/start', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine quiz type
    const isFirstQuiz = user.quizHistory.length === 0;
    const quizType = isFirstQuiz ? 'initial' : 'adaptive';
    const questionCount = isFirstQuiz ? 24 : 20;

    console.log('Quiz setup:', { 
      isFirstQuiz, 
      quizType, 
      quizHistoryLength: user.quizHistory.length,
      questionCount 
    });

    let questions;

    if (isFirstQuiz) {
      // For first quiz, get 3 questions per topic (8 topics × 3 = 24 questions)
      const topics = [
        'Human Body Systems',
        'Plant Structure and Function',
        'Animal Diversity',
        'Nutrition and Digestion',
        'Respiration and Circulation',
        'Growth and Development',
        'Reproduction',
        'Environmental Adaptation'
      ];

      questions = [];
      for (const topic of topics) {
        const topicQuestions = await Question.find({ 
          topic, 
          isActive: true 
        }).limit(3);
        questions.push(...topicQuestions);
      }

      // If we don't have enough questions, fill with random ones
      if (questions.length < 24) {
        const additionalQuestions = await Question.aggregate([
          { $match: { isActive: true, _id: { $nin: questions.map(q => q._id) } } },
          { $sample: { size: 24 - questions.length } }
        ]);
        questions.push(...additionalQuestions);
      }
    } else {
      // For adaptive quiz, focus on weak topics
      const weakTopics = user.getWeakTopics().map(wt => wt.topic);
      console.log('Adaptive quiz - weak topics:', weakTopics);
      
      // Get recently used question IDs from last 2 quizzes to avoid repetition
      const recentQuizzes = await Quiz.find({
        userId: userId,
        isCompleted: true
      }).sort({ completedAt: -1 }).limit(2);
      
      const recentQuestionIds = [];
      recentQuizzes.forEach(quiz => {
        if (quiz.questions && quiz.questions.length > 0) {
          recentQuestionIds.push(...quiz.questions.map(q => q.questionId));
        }
      });
      
      console.log(`Excluding ${recentQuestionIds.length} recent questions from last ${recentQuizzes.length} quizzes`);
      
      // Get total available questions for context
      const totalAvailableQuestions = await Question.countDocuments({ isActive: true });
      console.log('Total available questions in database:', totalAvailableQuestions);
      
      if (weakTopics.length === 0) {
        console.log('No weak topics found, getting random questions');
        // If no weak topics identified, get random questions excluding recent ones
        questions = await Question.aggregate([
          { 
            $match: { 
              isActive: true,
              _id: { $nin: recentQuestionIds }
            } 
          },
          { $sample: { size: questionCount } }
        ]);
        
        // If we don't have enough questions (because we excluded too many), 
        // get some from recent ones to fill the gap
        if (questions.length < questionCount) {
          const additionalQuestions = await Question.aggregate([
            { 
              $match: { 
                isActive: true,
                _id: { $nin: questions.map(q => q._id) }
              } 
            },
            { $sample: { size: questionCount - questions.length } }
          ]);
          questions.push(...additionalQuestions);
        }
      } else {
        questions = await Question.getAdaptiveQuestions(weakTopics, questionCount, recentQuestionIds);
        
        // If we don't have enough questions (because we excluded too many recent ones),
        // try to generate some with AI first, then get additional questions including some recent ones
        if (questions.length < questionCount) {
          console.log(`Not enough questions found (${questions.length}/${questionCount}), trying AI generation...`);
          
          try {
            const neededQuestions = questionCount - questions.length;
            const aiQuestions = await generateQuestionsForWeakTopics(weakTopics, Math.min(neededQuestions, 3));
            
            if (aiQuestions.length > 0) {
              // Save AI questions to database
              const questionsToSave = aiQuestions.map(q => ({
                ...q,
                isActive: true,
                subject: 'Biology',
                grade: 'Class 6',
                usageCount: 0,
                isAIGenerated: true,
                generatedFor: userId,
                createdAt: new Date()
              }));

              const savedAIQuestions = await Question.insertMany(questionsToSave);
              questions.push(...savedAIQuestions);
              
              console.log(`Generated and added ${savedAIQuestions.length} AI questions for weak topics`);
            }
          } catch (aiError) {
            console.error('AI question generation failed:', aiError);
          }
          
          // If still not enough, get additional questions including some recent ones
          if (questions.length < questionCount) {
            const usedQuestionIds = questions.map(q => q._id);
            const additionalQuestions = await Question.aggregate([
              { 
                $match: { 
                  isActive: true,
                  _id: { $nin: usedQuestionIds }
                } 
              },
              { $sample: { size: questionCount - questions.length } }
            ]);
            questions.push(...additionalQuestions);
          }
        }
      }
      
      console.log('Adaptive questions selected:', questions.length);
    }

    // Shuffle questions
    questions = questions.sort(() => Math.random() - 0.5);

    // Create quiz record
    const quiz = new Quiz({
      userId,
      quizType,
      totalQuestions: questions.length,
      questions: questions.map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        topic: q.topic
      }))
    });

    await quiz.save();

    // Increment usage count for questions
    const questionIds = questions.map(q => q._id);
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { usageCount: 1 } }
    );

    // Return quiz without correct answers
    const quizData = {
      id: quiz._id,
      quizType: quiz.quizType,
      totalQuestions: quiz.totalQuestions,
      startedAt: quiz.startedAt,
      questions: quiz.questions.map((q, index) => ({
        id: q.questionId,
        questionNumber: index + 1,
        questionText: q.questionText,
        options: q.options,
        topic: q.topic
      }))
    };

    res.status(201).json({
      success: true,
      message: `${quizType.charAt(0).toUpperCase() + quizType.slice(1)} quiz started successfully`,
      data: quizData
    });

  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start quiz'
    });
  }
});

// Submit quiz answers
router.post('/submit', async (req, res) => {
  try {
    const { quizId, answers, timeTaken = 0 } = req.body;
    console.log('Submit quiz request:', { quizId, answersCount: answers?.length, timeTaken });

    if (!quizId || !answers || !Array.isArray(answers)) {
      console.log('Invalid request data:', { quizId: !!quizId, answers: !!answers, isArray: Array.isArray(answers) });
      return res.status(400).json({
        success: false,
        message: 'Quiz ID and answers array are required'
      });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      userId: req.user._id,
      isCompleted: false
    });

    if (!quiz) {
      console.log('Quiz not found:', { quizId, userId: req.user._id });
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or already completed'
      });
    }

    console.log('Found quiz with questions:', quiz.questions.length);

    // Update quiz with answers
    answers.forEach(answer => {
      const questionIndex = quiz.questions.findIndex(
        q => q.questionId.toString() === answer.questionId
      );
      
      console.log('Processing answer:', { 
        questionId: answer.questionId, 
        userAnswer: answer.userAnswer, 
        foundIndex: questionIndex 
      });
      
      if (questionIndex !== -1) {
        quiz.questions[questionIndex].userAnswer = answer.userAnswer;
        quiz.questions[questionIndex].isCorrect = 
          answer.userAnswer === quiz.questions[questionIndex].correctAnswer;
        quiz.questions[questionIndex].timeTaken = answer.timeTaken || 0;
      }
    });

    quiz.timeTaken = timeTaken;
    quiz.isCompleted = true;

    await quiz.save();
    
    console.log('Quiz saved with topic analysis:', quiz.topicWiseAnalysis);
    console.log('Quiz score:', quiz.score, 'Correct answers:', quiz.correctAnswers);

    // Update user's quiz history and weakness analysis
    const user = await User.findById(req.user._id);
    
    // Add to quiz history
    user.quizHistory.push({
      quizId: quiz._id,
      score: quiz.score,
      totalQuestions: quiz.totalQuestions,
      correctAnswers: quiz.correctAnswers,
      topicWiseAnalysis: quiz.topicWiseAnalysis,
      completedAt: quiz.completedAt
    });

    // Initialize overallWeakness Map if it doesn't exist
    if (!user.overallWeakness) {
      user.overallWeakness = new Map();
    }

    // Update overall weakness analysis
    quiz.topicWiseAnalysis.forEach((analysis, topic) => {
      console.log('Updating weakness for topic:', topic, 'Analysis:', analysis);
      
      if (!user.overallWeakness.has(topic)) {
        user.overallWeakness.set(topic, {
          weaknessScore: 0,
          strengthScore: 0,
          totalAttempts: 0
        });
      }
      
      const topicData = user.overallWeakness.get(topic);
      topicData.totalAttempts += 1;
      
      // Calculate running average
      const incorrectPercentage = 100 - analysis.percentage;
      topicData.weaknessScore = Math.round(
        ((topicData.weaknessScore * (topicData.totalAttempts - 1)) + incorrectPercentage) 
        / topicData.totalAttempts
      );
      topicData.strengthScore = 100 - topicData.weaknessScore;
      
      console.log('Updated topic data:', { topic, ...topicData });
      user.overallWeakness.set(topic, topicData);
    });

    await user.save();

    const performanceSummary = quiz.getPerformanceSummary();

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        quiz: {
          id: quiz._id,
          quizType: quiz.quizType,
          completedAt: quiz.completedAt,
          ...performanceSummary
        },
        recommendations: {
          weakTopics: performanceSummary.weakTopics,
          strongTopics: performanceSummary.strongTopics,
          nextQuizMessage: performanceSummary.weakTopics.length > 0 
            ? 'Your next quiz will focus on your weak areas to help you improve.'
            : 'Great job! Keep practicing to maintain your performance.'
        }
      }
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

// Get quiz status
router.get('/status/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findOne({
      _id: quizId,
      userId: req.user._id
    }).select('isCompleted startedAt completedAt quizType totalQuestions');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          isCompleted: quiz.isCompleted,
          startedAt: quiz.startedAt,
          completedAt: quiz.completedAt,
          quizType: quiz.quizType,
          totalQuestions: quiz.totalQuestions
        }
      }
    });

  } catch (error) {
    console.error('Get quiz status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz status'
    });
  }
});

// Get explanation for a question
router.post('/question/explain', async (req, res) => {
  try {
    const { questionId, quizId } = req.body;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required'
      });
    }

    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if explanation already exists
    if (question.explanation) {
      // If quiz ID provided, mark explanation as requested
      if (quizId) {
        const quiz = await Quiz.findOne({
          _id: quizId,
          userId: req.user._id
        });
        
        if (quiz) {
          const questionIndex = quiz.questions.findIndex(
            q => q.questionId.toString() === questionId
          );
          
          if (questionIndex !== -1) {
            quiz.questions[questionIndex].explanationRequested = true;
            quiz.questions[questionIndex].explanation = question.explanation;
            await quiz.save();
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          explanation: question.explanation,
          source: 'cached'
        }
      });
    }

    // Generate new explanation using AI
    const explanation = await generateQuestionExplanation(
      question.questionText,
      question.options,
      question.correctAnswer
    );

    // Save explanation to question for future use
    question.explanation = explanation;
    await question.save();

    // If quiz ID provided, mark explanation as requested in quiz
    if (quizId) {
      const quiz = await Quiz.findOne({
        _id: quizId,
        userId: req.user._id
      });
      
      if (quiz) {
        const questionIndex = quiz.questions.findIndex(
          q => q.questionId.toString() === questionId
        );
        
        if (questionIndex !== -1) {
          quiz.questions[questionIndex].explanationRequested = true;
          quiz.questions[questionIndex].explanation = explanation;
          await quiz.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        explanation,
        source: 'generated'
      }
    });

  } catch (error) {
    console.error('Get question explanation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question explanation'
    });
  }
});

// Get available quiz info
router.get('/info', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalQuestions = await Question.countDocuments({ isActive: true });
    
    const isFirstQuiz = user.quizHistory.length === 0;
    const quizType = isFirstQuiz ? 'initial' : 'adaptive';
    const questionCount = isFirstQuiz ? 24 : 20;
    
    let focusAreas = [];
    if (!isFirstQuiz) {
      const weakTopics = user.getWeakTopics();
      focusAreas = weakTopics.slice(0, 3).map(wt => wt.topic);
    }

    res.status(200).json({
      success: true,
      data: {
        quizType,
        questionCount,
        totalQuestions,
        focusAreas,
        userStats: {
          totalQuizzesTaken: user.quizHistory.length,
          averageScore: user.quizHistory.length > 0
            ? Math.round(user.quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / user.quizHistory.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Get quiz info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz information'
    });
  }
});

// Generate additional questions for weak topics using AI
router.post('/generate-questions', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's weak topics
    const weakTopics = user.getWeakTopics();
    
    if (weakTopics.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No weak topics identified. Take a quiz first to identify areas for improvement.' 
      });
    }

    console.log('Generating questions for weak topics:', weakTopics.map(wt => wt.topic));

    // Generate 3-5 questions for weak topics
    const questionCount = Math.min(5, Math.max(3, weakTopics.length));
    const generatedQuestions = await generateQuestionsForWeakTopics(weakTopics, questionCount);

    if (generatedQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate questions. Please try again later.'
      });
    }

    // Add generated questions to database with special marking
    const questionsToSave = generatedQuestions.map(q => ({
      ...q,
      isActive: true,
      subject: 'Biology',
      grade: 'Class 6',
      usageCount: 0,
      isAIGenerated: true, // Mark as AI generated
      generatedFor: userId, // Track which user it was generated for
      createdAt: new Date()
    }));

    const savedQuestions = await Question.insertMany(questionsToSave);

    res.status(201).json({
      success: true,
      message: `Generated ${savedQuestions.length} new questions for your weak topics`,
      data: {
        questionsGenerated: savedQuestions.length,
        weakTopics: weakTopics.map(wt => wt.topic),
        questions: savedQuestions.map(q => ({
          id: q._id,
          questionText: q.questionText,
          topic: q.topic,
          difficulty: q.difficulty
        }))
      }
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate questions'
    });
  }
});

// Enhanced adaptive quiz start with AI question generation fallback
router.post('/start-enhanced', async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only for adaptive quizzes (not first quiz)
    const isFirstQuiz = user.quizHistory.length === 0;
    if (isFirstQuiz) {
      return res.status(400).json({
        success: false,
        message: 'Use regular /start endpoint for first quiz'
      });
    }

    const questionCount = 20;
    const weakTopics = user.getWeakTopics().map(wt => wt.topic);
    
    console.log('Enhanced adaptive quiz - weak topics:', weakTopics);

    // Get recently used question IDs from last 2 quizzes
    const recentQuizzes = await Quiz.find({
      userId: userId,
      isCompleted: true
    }).sort({ completedAt: -1 }).limit(2);
    
    const recentQuestionIds = [];
    recentQuizzes.forEach(quiz => {
      if (quiz.questions && quiz.questions.length > 0) {
        recentQuestionIds.push(...quiz.questions.map(q => q.questionId));
      }
    });

    let questions = [];

    if (weakTopics.length > 0) {
      // Try to get questions for weak topics
      questions = await Question.getAdaptiveQuestions(weakTopics, questionCount, recentQuestionIds);
      
      // If we don't have enough questions, generate some with AI
      if (questions.length < questionCount) {
        const neededQuestions = questionCount - questions.length;
        console.log(`Need ${neededQuestions} more questions, generating with AI...`);
        
        try {
          const aiQuestions = await generateQuestionsForWeakTopics(weakTopics, Math.min(neededQuestions, 5));
          
          if (aiQuestions.length > 0) {
            // Save AI questions to database
            const questionsToSave = aiQuestions.map(q => ({
              ...q,
              isActive: true,
              subject: 'Biology',
              grade: 'Class 6',
              usageCount: 0,
              isAIGenerated: true,
              generatedFor: userId,
              createdAt: new Date()
            }));

            const savedAIQuestions = await Question.insertMany(questionsToSave);
            questions.push(...savedAIQuestions);
            
            console.log(`Added ${savedAIQuestions.length} AI-generated questions to the quiz`);
          }
        } catch (aiError) {
          console.error('Failed to generate AI questions:', aiError);
        }
        
        // If still not enough, fill with any available questions
        if (questions.length < questionCount) {
          const usedIds = questions.map(q => q._id);
          const additionalQuestions = await Question.aggregate([
            { 
              $match: { 
                isActive: true,
                _id: { $nin: usedIds }
              } 
            },
            { $sample: { size: questionCount - questions.length } }
          ]);
          questions.push(...additionalQuestions);
        }
      }
    } else {
      // No weak topics, get random questions
      questions = await Question.aggregate([
        { 
          $match: { 
            isActive: true,
            _id: { $nin: recentQuestionIds }
          } 
        },
        { $sample: { size: questionCount } }
      ]);
    }

    // Shuffle questions
    questions = questions.sort(() => Math.random() - 0.5);

    // Create quiz record
    const quiz = new Quiz({
      userId,
      quizType: 'adaptive',
      totalQuestions: questions.length,
      questions: questions.map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        topic: q.topic
      }))
    });

    await quiz.save();

    // Increment usage count for questions
    const questionIds = questions.map(q => q._id);
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { usageCount: 1 } }
    );

    // Return quiz without correct answers
    const quizData = {
      id: quiz._id,
      quizType: quiz.quizType,
      totalQuestions: quiz.totalQuestions,
      startedAt: quiz.startedAt,
      hasAIQuestions: questions.some(q => q.isAIGenerated),
      questions: quiz.questions.map((q, index) => ({
        id: q.questionId,
        questionNumber: index + 1,
        questionText: q.questionText,
        options: q.options,
        topic: q.topic
      }))
    };

    res.status(201).json({
      success: true,
      message: 'Enhanced adaptive quiz started with AI-powered question selection',
      data: quizData
    });

  } catch (error) {
    console.error('Enhanced quiz start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start enhanced quiz'
    });
  }
});

// Debug route to check question exclusion logic (for testing only)
router.get('/debug/questions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const userId = req.query.userId || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get recent quizzes
    const recentQuizzes = await Quiz.find({
      userId: userId,
      isCompleted: true
    }).sort({ completedAt: -1 }).limit(3);

    const recentQuestionIds = [];
    recentQuizzes.forEach(quiz => {
      if (quiz.questions && quiz.questions.length > 0) {
        recentQuestionIds.push(...quiz.questions.map(q => q.questionId));
      }
    });

    const weakTopics = user.getWeakTopics().map(wt => wt.topic);
    const totalQuestions = await Question.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        totalQuestions,
        recentQuizCount: recentQuizzes.length,
        recentQuestionIds: recentQuestionIds.length,
        uniqueRecentQuestions: [...new Set(recentQuestionIds.map(id => id.toString()))].length,
        weakTopics,
        userQuizHistory: user.quizHistory.length,
        recentQuizzes: recentQuizzes.map(q => ({
          id: q._id,
          type: q.quizType,
          score: q.score,
          completedAt: q.completedAt,
          questionCount: q.questions.length
        }))
      }
    });

  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ success: false, message: 'Debug route failed' });
  }
});

module.exports = router;

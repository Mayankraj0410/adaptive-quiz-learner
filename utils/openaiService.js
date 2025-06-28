const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OpenAI API key not found. Explanation feature will use fallback responses.');
} else {
  console.log('✅ OpenAI API key configured. Will attempt to use AI-powered explanations.');
}

// Generate explanation for a question
const generateQuestionExplanation = async (questionText, options, correctAnswer) => {
  try {
    const prompt = `
You are an educational assistant for Class 6 Biology students. Please provide a clear, simple explanation for the following question:

Question: ${questionText}

Options:
${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')}

Correct Answer: ${correctAnswer}

Please explain:
1. Why the correct answer is right
2. Why the other options are incorrect (briefly)
3. Any helpful tips or additional information that would help a 6th-grade student understand this concept

Keep the explanation simple, engaging, and appropriate for a 12-year-old student.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful biology teacher for 6th-grade students. Provide clear, simple explanations that are easy to understand."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating question explanation:', error);
    
    // Fallback: Provide a basic explanation based on the correct answer
    return generateFallbackExplanation(questionText, options, correctAnswer);
  }
};

// Fallback explanation generator when OpenAI API is unavailable
const generateFallbackExplanation = (questionText, options, correctAnswer) => {
  const correctIndex = options.indexOf(correctAnswer);
  const correctLetter = String.fromCharCode(65 + correctIndex);
  
  // Basic explanation template
  let explanation = `<strong>Correct Answer: ${correctLetter}. ${correctAnswer}</strong><br><br>`;
  
  explanation += `<strong>Explanation:</strong><br>`;
  explanation += `The correct answer is "${correctAnswer}" because it best answers the question about ${extractKeyTopic(questionText)}.<br><br>`;
  
  explanation += `<strong>Why other options are incorrect:</strong><br>`;
  options.forEach((option, index) => {
    if (option !== correctAnswer) {
      const letter = String.fromCharCode(65 + index);
      explanation += `• ${letter}. ${option} - This is not the most accurate answer for this question.<br>`;
    }
  });
  
  explanation += `<br><strong>Study Tip:</strong> Review the concepts related to ${extractKeyTopic(questionText)} to better understand this topic.`;
  
  return explanation;
};

// Extract key topic from question text for fallback explanations
const extractKeyTopic = (questionText) => {
  const topicKeywords = {
    'digestive': 'digestion and the digestive system',
    'respiration': 'respiration and breathing',
    'heart': 'circulation and the cardiovascular system',
    'blood': 'blood circulation and the circulatory system',
    'plant': 'plant biology and botany',
    'leaf': 'plant structure and photosynthesis',
    'root': 'plant structure and nutrition',
    'flower': 'plant reproduction',
    'animal': 'animal biology and classification',
    'bird': 'animal classification and characteristics',
    'mammal': 'mammalian characteristics',
    'cell': 'cell biology and structure',
    'bone': 'skeletal system and bone structure',
    'muscle': 'muscular system',
    'brain': 'nervous system',
    'kidney': 'excretory system',
    'nutrition': 'nutrition and diet',
    'vitamin': 'vitamins and nutrition',
    'protein': 'nutrients and nutrition'
  };
  
  const lowerQuestion = questionText.toLowerCase();
  
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerQuestion.includes(keyword)) {
      return topic;
    }
  }
  
  return 'this biology concept';
};

// Generate adaptive questions based on weak topics
const generateAdaptiveQuestionSuggestions = async (weakTopics, userHistory) => {
  try {
    const prompt = `
You are an AI assistant helping to create adaptive quiz questions for a Class 6 Biology student.

The student has shown weakness in these topics:
${weakTopics.map(topic => `- ${topic.topic} (${topic.weaknessScore}% incorrect answers)`).join('\n')}

Based on their quiz history, they need more practice in these areas. 

Please provide suggestions for:
1. Types of questions that would help strengthen understanding in these weak areas
2. Specific concepts within these topics that should be focused on
3. Difficulty level recommendations (easy/medium/hard)
4. Study tips for these topics

Keep recommendations appropriate for 6th-grade Biology students.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an educational AI assistant specializing in adaptive learning for middle school biology."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.8
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating adaptive question suggestions:', error);
    
    // Fallback suggestions based on weak topics
    const fallbackSuggestions = weakTopics.map(topic => {
      return `Focus on ${topic.topic}: Review basic concepts, practice identification questions, and understand the relationships between different components.`;
    }).join('\n\n');
    
    return fallbackSuggestions || 'Review all biology topics systematically. Focus on understanding concepts rather than memorization.';
  }
};

// Generate study recommendations based on performance
const generateStudyRecommendations = async (performanceData) => {
  try {
    const { score, weakTopics, strongTopics, quizHistory } = performanceData;
    
    const prompt = `
You are an educational AI assistant providing personalized study recommendations for a Class 6 Biology student.

Student's Performance Summary:
- Overall Score: ${score}%
- Weak Topics: ${weakTopics.map(t => `${t.topic} (${t.percentage}%)`).join(', ')}
- Strong Topics: ${strongTopics.map(t => `${t.topic} (${t.percentage}%)`).join(', ')}
- Number of quizzes taken: ${quizHistory}

Please provide:
1. Specific study plan recommendations for the next week
2. Resources or activities that would help improve weak areas
3. Ways to maintain strength in strong topics
4. Motivational tips based on their performance

Keep recommendations practical and age-appropriate for a 6th grader.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a supportive educational AI assistant specializing in personalized learning recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 700,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating study recommendations:', error);
    return 'Keep practicing and reviewing your weak topics. Focus on understanding concepts rather than memorizing answers.';
  }
};

// Generate new quiz questions for weak topics
const generateQuestionsForWeakTopics = async (weakTopics, questionCount = 5) => {
  try {
    const topicsText = weakTopics.map(topic => {
      if (typeof topic === 'object') {
        return `${topic.topic} (weakness score: ${topic.weaknessScore}%)`;
      }
      return topic;
    }).join(', ');

    const prompt = `
You are an educational AI assistant creating quiz questions for Class 6 Biology students.

Create ${questionCount} multiple-choice questions focusing on these weak topics: ${topicsText}

For each question, provide:
1. A clear, age-appropriate question text
2. Exactly 4 multiple choice options
3. The correct answer (must be one of the 4 options)
4. The topic from this list: ["Human Body Systems", "Plant Structure and Function", "Animal Diversity", "Nutrition and Digestion", "Respiration and Circulation", "Growth and Development", "Reproduction", "Environmental Adaptation"]
5. A relevant chapter name
6. Difficulty level: "easy", "medium", or "hard"

Requirements:
- Questions must be suitable for 6th grade students (age 11-12)
- Focus on the weak topics provided
- Use simple, clear language
- Avoid overly complex concepts
- Each question should test understanding, not just memorization

Format your response as a JSON array with this exact structure:
[
  {
    "questionText": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "topic": "Human Body Systems",
    "chapter": "Chapter Name",
    "difficulty": "easy"
  }
]

Make sure the JSON is valid and properly formatted.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an educational AI assistant specializing in creating biology quiz questions for middle school students. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.8
    });

    const responseText = response.choices[0].message.content.trim();
    
    // Try to parse the JSON response
    let questions;
    try {
      // Clean up response if it has markdown code blocks
      const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      console.log('Raw response:', responseText);
      
      // Fallback: generate questions using a template
      return generateFallbackQuestions(weakTopics, questionCount);
    }

    // Validate and clean the questions
    const validQuestions = questions.filter(q => {
      return q.questionText && 
             Array.isArray(q.options) && 
             q.options.length === 4 && 
             q.correctAnswer && 
             q.options.includes(q.correctAnswer) &&
             q.topic && 
             q.chapter && 
             q.difficulty;
    });

    console.log(`Generated ${validQuestions.length} valid questions from OpenAI for weak topics`);
    return validQuestions;

  } catch (error) {
    console.error('Error generating questions with OpenAI:', error);
    
    // Fallback to template-based generation
    return generateFallbackQuestions(weakTopics, questionCount);
  }
};

// Fallback question generation when OpenAI fails
const generateFallbackQuestions = (weakTopics, questionCount) => {
  const fallbackQuestions = [];
  
  const questionTemplates = {
    "Human Body Systems": [
      {
        questionText: "Which system in the human body is responsible for breaking down food?",
        options: ["Circulatory system", "Digestive system", "Respiratory system", "Nervous system"],
        correctAnswer: "Digestive system",
        chapter: "Body Systems",
        difficulty: "easy"
      }
    ],
    "Plant Structure and Function": [
      {
        questionText: "What do plants use to make their own food?",
        options: ["Sunlight and water", "Sunlight, water and carbon dioxide", "Only soil", "Only sunlight"],
        correctAnswer: "Sunlight, water and carbon dioxide",
        chapter: "Plant Nutrition",
        difficulty: "medium"
      }
    ],
    "Animal Diversity": [
      {
        questionText: "Which characteristic is common to all mammals?",
        options: ["They lay eggs", "They have fur or hair", "They live in water", "They are cold-blooded"],
        correctAnswer: "They have fur or hair",
        chapter: "Mammal Characteristics",
        difficulty: "easy"
      }
    ],
    "Nutrition and Digestion": [
      {
        questionText: "Which nutrient is most important for building muscles?",
        options: ["Carbohydrates", "Proteins", "Fats", "Vitamins"],
        correctAnswer: "Proteins",
        chapter: "Nutrients",
        difficulty: "medium"
      }
    ],
    "Respiration and Circulation": [
      {
        questionText: "What is the main function of red blood cells?",
        options: ["Fight infection", "Carry oxygen", "Help in clotting", "Produce hormones"],
        correctAnswer: "Carry oxygen",
        chapter: "Blood Function",
        difficulty: "easy"
      }
    ],
    "Growth and Development": [
      {
        questionText: "What is the correct order of a frog's life cycle?",
        options: ["Egg → Adult → Tadpole", "Tadpole → Egg → Adult", "Egg → Tadpole → Adult", "Adult → Tadpole → Egg"],
        correctAnswer: "Egg → Tadpole → Adult",
        chapter: "Life Cycles",
        difficulty: "medium"
      }
    ],
    "Reproduction": [
      {
        questionText: "What is the female reproductive part of a flower called?",
        options: ["Stamen", "Pistil", "Petal", "Sepal"],
        correctAnswer: "Pistil",
        chapter: "Plant Reproduction",
        difficulty: "easy"
      }
    ],
    "Environmental Adaptation": [
      {
        questionText: "How do penguins stay warm in cold climates?",
        options: ["Thick feathers and fat layer", "Flying to warm places", "Eating hot food", "Staying underwater"],
        correctAnswer: "Thick feathers and fat layer",
        chapter: "Cold Adaptations",
        difficulty: "easy"
      }
    ]
  };

  weakTopics.forEach(weakTopic => {
    const topicName = typeof weakTopic === 'object' ? weakTopic.topic : weakTopic;
    const templates = questionTemplates[topicName];
    
    if (templates && fallbackQuestions.length < questionCount) {
      templates.forEach(template => {
        if (fallbackQuestions.length < questionCount) {
          fallbackQuestions.push({
            ...template,
            topic: topicName
          });
        }
      });
    }
  });

  console.log(`Generated ${fallbackQuestions.length} fallback questions for weak topics`);
  return fallbackQuestions.slice(0, questionCount);
};

module.exports = {
  generateQuestionExplanation,
  generateAdaptiveQuestionSuggestions,
  generateStudyRecommendations,
  generateQuestionsForWeakTopics
};

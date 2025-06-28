const User = require('../models/User');
const Question = require('../models/Question');

// Sample questions for Class 6 Biology
const sampleQuestions = [
  // Human Body Systems
  {
    questionText: "Which organ system is responsible for pumping blood throughout the body?",
    options: ["Respiratory system", "Circulatory system", "Digestive system", "Nervous system"],
    correctAnswer: "Circulatory system",
    topic: "Human Body Systems",
    chapter: "Body Systems",
    difficulty: "easy"
  },
  {
    questionText: "What is the main function of the skeletal system?",
    options: ["To digest food", "To support and protect the body", "To breathe oxygen", "To pump blood"],
    correctAnswer: "To support and protect the body",
    topic: "Human Body Systems",
    chapter: "Body Systems",
    difficulty: "easy"
  },
  {
    questionText: "Which part of the nervous system controls involuntary actions like heartbeat?",
    options: ["Brain", "Spinal cord", "Medulla oblongata", "Cerebrum"],
    correctAnswer: "Medulla oblongata",
    topic: "Human Body Systems",
    chapter: "Nervous System",
    difficulty: "medium"
  },

  // Plant Structure and Function
  {
    questionText: "What is the main function of roots in a plant?",
    options: ["Photosynthesis", "Reproduction", "Absorbing water and nutrients", "Making flowers"],
    correctAnswer: "Absorbing water and nutrients",
    topic: "Plant Structure and Function",
    chapter: "Plant Parts",
    difficulty: "easy"
  },
  {
    questionText: "Which part of the plant conducts photosynthesis?",
    options: ["Roots", "Stem", "Leaves", "Flowers"],
    correctAnswer: "Leaves",
    topic: "Plant Structure and Function",
    chapter: "Photosynthesis",
    difficulty: "easy"
  },
  {
    questionText: "What gas do plants release during photosynthesis?",
    options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
    correctAnswer: "Oxygen",
    topic: "Plant Structure and Function",
    chapter: "Photosynthesis",
    difficulty: "medium"
  },

  // Animal Diversity
  {
    questionText: "Which group of animals are warm-blooded?",
    options: ["Fish", "Reptiles", "Mammals", "Amphibians"],
    correctAnswer: "Mammals",
    topic: "Animal Diversity",
    chapter: "Animal Classification",
    difficulty: "easy"
  },
  {
    questionText: "What type of skeleton do insects have?",
    options: ["Internal skeleton", "External skeleton", "No skeleton", "Cartilage skeleton"],
    correctAnswer: "External skeleton",
    topic: "Animal Diversity",
    chapter: "Invertebrates",
    difficulty: "medium"
  },
  {
    questionText: "Which animals can live both in water and on land?",
    options: ["Fish", "Birds", "Amphibians", "Mammals"],
    correctAnswer: "Amphibians",
    topic: "Animal Diversity",
    chapter: "Animal Habitats",
    difficulty: "easy"
  },

  // Nutrition and Digestion
  {
    questionText: "Which nutrient provides energy to our body?",
    options: ["Vitamins", "Minerals", "Carbohydrates", "Water"],
    correctAnswer: "Carbohydrates",
    topic: "Nutrition and Digestion",
    chapter: "Nutrients",
    difficulty: "easy"
  },
  {
    questionText: "Where does digestion begin in humans?",
    options: ["Stomach", "Small intestine", "Mouth", "Large intestine"],
    correctAnswer: "Mouth",
    topic: "Nutrition and Digestion",
    chapter: "Digestive System",
    difficulty: "easy"
  },
  {
    questionText: "Which enzyme in saliva helps break down starch?",
    options: ["Pepsin", "Amylase", "Lipase", "Trypsin"],
    correctAnswer: "Amylase",
    topic: "Nutrition and Digestion",
    chapter: "Enzymes",
    difficulty: "medium"
  },

  // Respiration and Circulation
  {
    questionText: "What do we breathe in from the air?",
    options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Water vapor"],
    correctAnswer: "Oxygen",
    topic: "Respiration and Circulation",
    chapter: "Breathing",
    difficulty: "easy"
  },
  {
    questionText: "Which blood vessels carry blood away from the heart?",
    options: ["Veins", "Arteries", "Capillaries", "Ventricles"],
    correctAnswer: "Arteries",
    topic: "Respiration and Circulation",
    chapter: "Blood Circulation",
    difficulty: "medium"
  },
  {
    questionText: "How many chambers does a human heart have?",
    options: ["Two", "Three", "Four", "Five"],
    correctAnswer: "Four",
    topic: "Respiration and Circulation",
    chapter: "Heart Structure",
    difficulty: "easy"
  },

  // Growth and Development
  {
    questionText: "What is the process by which living things produce offspring?",
    options: ["Growth", "Reproduction", "Respiration", "Digestion"],
    correctAnswer: "Reproduction",
    topic: "Growth and Development",
    chapter: "Life Processes",
    difficulty: "easy"
  },
  {
    questionText: "Which stage comes after egg in the life cycle of a butterfly?",
    options: ["Adult", "Pupa", "Larva", "Caterpillar"],
    correctAnswer: "Larva",
    topic: "Growth and Development",
    chapter: "Life Cycles",
    difficulty: "medium"
  },
  {
    questionText: "What do we call the young one of a frog?",
    options: ["Cub", "Tadpole", "Chick", "Calf"],
    correctAnswer: "Tadpole",
    topic: "Growth and Development",
    chapter: "Animal Development",
    difficulty: "easy"
  },

  // Reproduction
  {
    questionText: "Which part of a flower contains the male reproductive organs?",
    options: ["Pistil", "Stamen", "Petal", "Sepal"],
    correctAnswer: "Stamen",
    topic: "Reproduction",
    chapter: "Plant Reproduction",
    difficulty: "medium"
  },
  {
    questionText: "What is pollination?",
    options: ["Growth of plants", "Transfer of pollen", "Making of seeds", "Flowering"],
    correctAnswer: "Transfer of pollen",
    topic: "Reproduction",
    chapter: "Plant Reproduction",
    difficulty: "easy"
  },
  {
    questionText: "Which animals lay eggs?",
    options: ["Only birds", "Only reptiles", "Birds and reptiles", "Only mammals"],
    correctAnswer: "Birds and reptiles",
    topic: "Reproduction",
    chapter: "Animal Reproduction",
    difficulty: "medium"
  },

  // Environmental Adaptation
  {
    questionText: "What helps a cactus survive in the desert?",
    options: ["Large leaves", "Thick waxy coating", "Deep roots", "All of the above"],
    correctAnswer: "All of the above",
    topic: "Environmental Adaptation",
    chapter: "Plant Adaptations",
    difficulty: "medium"
  },
  {
    questionText: "Why do polar bears have thick fur?",
    options: ["To look beautiful", "To keep warm", "To swim better", "To catch prey"],
    correctAnswer: "To keep warm",
    topic: "Environmental Adaptation",
    chapter: "Animal Adaptations",
    difficulty: "easy"
  },
  {
    questionText: "Which adaptation helps fish breathe underwater?",
    options: ["Lungs", "Gills", "Skin", "Fins"],
    correctAnswer: "Gills",
    topic: "Environmental Adaptation",
    chapter: "Aquatic Adaptations",
    difficulty: "easy"
  },

  // Additional questions to reach 30+ questions
  {
    questionText: "What is the green pigment in plants called?",
    options: ["Melanin", "Chlorophyll", "Hemoglobin", "Carotene"],
    correctAnswer: "Chlorophyll",
    topic: "Plant Structure and Function",
    chapter: "Photosynthesis",
    difficulty: "easy"
  },
  {
    questionText: "Which vitamin is produced when skin is exposed to sunlight?",
    options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"],
    correctAnswer: "Vitamin D",
    topic: "Nutrition and Digestion",
    chapter: "Vitamins",
    difficulty: "medium"
  },

  // Additional questions for better variety - Set 2
  {
    questionText: "What is the function of white blood cells?",
    options: ["Carry oxygen", "Fight infection", "Clot blood", "Carry nutrients"],
    correctAnswer: "Fight infection",
    topic: "Respiration and Circulation",
    chapter: "Blood",
    difficulty: "medium"
  },
  {
    questionText: "Which organ filters waste from the blood?",
    options: ["Liver", "Kidney", "Heart", "Lungs"],
    correctAnswer: "Kidney",
    topic: "Human Body Systems",
    chapter: "Excretory System",
    difficulty: "easy"
  },
  {
    questionText: "What type of joint is found in the elbow?",
    options: ["Ball and socket", "Hinge joint", "Pivot joint", "Fixed joint"],
    correctAnswer: "Hinge joint",
    topic: "Human Body Systems",
    chapter: "Skeletal System",
    difficulty: "medium"
  },
  {
    questionText: "Which gas is released by plants at night?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    correctAnswer: "Carbon dioxide",
    topic: "Plant Structure and Function",
    chapter: "Respiration",
    difficulty: "medium"
  },
  {
    questionText: "What is the hardest substance in the human body?",
    options: ["Bone", "Tooth enamel", "Nail", "Cartilage"],
    correctAnswer: "Tooth enamel",
    topic: "Human Body Systems",
    chapter: "Digestive System",
    difficulty: "hard"
  },
  {
    questionText: "Which animals are called invertebrates?",
    options: ["Animals with backbone", "Animals without backbone", "Only insects", "Only fish"],
    correctAnswer: "Animals without backbone",
    topic: "Animal Diversity",
    chapter: "Classification",
    difficulty: "easy"
  },
  {
    questionText: "What do plants need for photosynthesis besides sunlight?",
    options: ["Only water", "Only carbon dioxide", "Water and carbon dioxide", "Only soil"],
    correctAnswer: "Water and carbon dioxide",
    topic: "Plant Structure and Function",
    chapter: "Photosynthesis",
    difficulty: "easy"
  },
  {
    questionText: "Which part of the brain controls balance?",
    options: ["Cerebrum", "Cerebellum", "Medulla", "Spinal cord"],
    correctAnswer: "Cerebellum",
    topic: "Human Body Systems",
    chapter: "Nervous System",
    difficulty: "hard"
  },
  {
    questionText: "What is the main component of plant cell walls?",
    options: ["Protein", "Cellulose", "Fat", "Starch"],
    correctAnswer: "Cellulose",
    topic: "Plant Structure and Function",
    chapter: "Cell Structure",
    difficulty: "medium"
  },
  {
    questionText: "Which blood type is known as the universal donor?",
    options: ["A", "B", "AB", "O"],
    correctAnswer: "O",
    topic: "Respiration and Circulation",
    chapter: "Blood Types",
    difficulty: "hard"
  },
  {
    questionText: "What is metamorphosis?",
    options: ["Animal migration", "Change in body form during development", "Animal hibernation", "Animal reproduction"],
    correctAnswer: "Change in body form during development",
    topic: "Growth and Development",
    chapter: "Life Cycles",
    difficulty: "medium"
  },
  {
    questionText: "Which vitamin helps in blood clotting?",
    options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
    correctAnswer: "Vitamin K",
    topic: "Nutrition and Digestion",
    chapter: "Vitamins",
    difficulty: "hard"
  },
  {
    questionText: "What is the basic unit of life?",
    options: ["Tissue", "Organ", "Cell", "System"],
    correctAnswer: "Cell",
    topic: "Human Body Systems",
    chapter: "Cell Biology",
    difficulty: "easy"
  },
  {
    questionText: "Which animals breathe through spiracles?",
    options: ["Fish", "Birds", "Insects", "Mammals"],
    correctAnswer: "Insects",
    topic: "Animal Diversity",
    chapter: "Respiratory Systems",
    difficulty: "medium"
  },
  {
    questionText: "What is the process of water movement in plants called?",
    options: ["Photosynthesis", "Respiration", "Transpiration", "Germination"],
    correctAnswer: "Transpiration",
    topic: "Plant Structure and Function",
    chapter: "Water Transport",
    difficulty: "medium"
  },
  {
    questionText: "Which sense organ detects sound?",
    options: ["Eye", "Nose", "Ear", "Tongue"],
    correctAnswer: "Ear",
    topic: "Human Body Systems",
    chapter: "Sense Organs",
    difficulty: "easy"
  },
  {
    questionText: "What do carnivorous plants eat?",
    options: ["Only sunlight", "Insects and small animals", "Only water", "Dead plant matter"],
    correctAnswer: "Insects and small animals",
    topic: "Environmental Adaptation",
    chapter: "Special Adaptations",
    difficulty: "medium"
  },
  {
    questionText: "Which hormone controls growth in humans?",
    options: ["Insulin", "Growth hormone", "Thyroxine", "Adrenaline"],
    correctAnswer: "Growth hormone",
    topic: "Growth and Development",
    chapter: "Hormones",
    difficulty: "hard"
  },
  {
    questionText: "What is the gestation period of humans?",
    options: ["6 months", "9 months", "12 months", "18 months"],
    correctAnswer: "9 months",
    topic: "Reproduction",
    chapter: "Human Reproduction",
    difficulty: "easy"
  },
  {
    questionText: "Which adaptation helps desert animals conserve water?",
    options: ["Thick fur", "Large ears", "Concentrated urine", "Bright colors"],
    correctAnswer: "Concentrated urine",
    topic: "Environmental Adaptation",
    chapter: "Desert Adaptations",
    difficulty: "medium"
  }
];

// Initialize default admin user
const initializeAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quizlearner.com';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({
        email: adminEmail,
        role: 'admin'
      });
      
      await admin.save();
      console.log('✅ Default admin user created:', adminEmail);
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

// Initialize sample questions
const initializeQuestions = async () => {
  try {
    const existingQuestions = await Question.countDocuments();
    
    if (existingQuestions === 0) {
      await Question.insertMany(sampleQuestions);
      console.log(`✅ Inserted ${sampleQuestions.length} sample questions`);
    } else if (existingQuestions < sampleQuestions.length) {
      // Add new questions if we have more in our sample set
      const existingQuestionTexts = await Question.find({}, 'questionText').lean();
      const existingTexts = new Set(existingQuestionTexts.map(q => q.questionText));
      
      const newQuestions = sampleQuestions.filter(q => !existingTexts.has(q.questionText));
      
      if (newQuestions.length > 0) {
        await Question.insertMany(newQuestions);
        console.log(`✅ Added ${newQuestions.length} new questions`);
      }
      
      const totalQuestions = await Question.countDocuments();
      console.log(`✅ Total questions in database: ${totalQuestions}`);
    } else {
      console.log(`✅ Questions already exist (${existingQuestions} questions found)`);
    }
  } catch (error) {
    console.error('❌ Error initializing questions:', error);
  }
};

// Main initialization function
const initializeData = async () => {
  console.log('🔄 Initializing application data...');
  
  await initializeAdmin();
  await initializeQuestions();
  
  console.log('✅ Application data initialization completed');
};

// Run initialization
initializeData();

module.exports = {
  initializeData,
  initializeAdmin,
  initializeQuestions
};

// Quiz management functions
const Quiz = {
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    startTime: null,
    timer: null,
    timeElapsed: 0,

    // Start a new quiz
    async startQuiz() {
        try {
            Utils.showLoading();

            const response = await Utils.apiRequest('/quiz/start', {
                method: 'POST'
            });

            App.currentQuiz = response.data;
            this.questions = response.data.questions;
            this.answers = new Array(this.questions.length).fill(null);
            this.currentQuestionIndex = 0;
            this.startTime = Date.now();
            this.timeElapsed = 0;

            // Show quiz section
            Navigation.showSection('quizSection');
            
            // Load first question
            this.loadQuestion();
            
            // Start timer
            this.startTimer();
            
            Utils.showMessage('Quiz started! Good luck!', 'success');

        } catch (error) {
            Utils.showMessage('Failed to start quiz: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Load current question
    loadQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const totalQuestions = this.questions.length;

        // Update progress
        const progressPercentage = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;
        document.getElementById('progressFill').style.width = `${progressPercentage}%`;
        document.getElementById('questionCounter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${totalQuestions}`;

        // Update question content
        document.getElementById('questionTopic').textContent = question.topic;
        document.getElementById('questionText').textContent = question.questionText;

        // Load options
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.innerHTML = `
                <div class="option-letter">${String.fromCharCode(65 + index)}</div>
                <span class="option-text">${option}</span>
            `;

            // Check if this option was previously selected
            if (this.answers[this.currentQuestionIndex] === option) {
                optionElement.classList.add('selected');
            }

            optionElement.addEventListener('click', () => {
                this.selectOption(option, optionElement);
            });

            optionsContainer.appendChild(optionElement);
        });

        // Update navigation buttons
        this.updateNavigationButtons();

        // Hide explanation
        document.getElementById('explanationContainer').classList.add('hidden');
    },

    // Select an option
    selectOption(selectedOption, optionElement) {
        // Store answer
        this.answers[this.currentQuestionIndex] = selectedOption;
        console.log('Option selected:', selectedOption, 'for question', this.currentQuestionIndex);

        // Update UI
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });

        if (optionElement) {
            optionElement.classList.add('selected');
        }

        // Update navigation buttons to enable submit if on last question
        this.updateNavigationButtons();
    },

    // Navigate to previous question
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadQuestion();
        }
    },

    // Navigate to next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.loadQuestion();
        }
    },

    // Update navigation buttons
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitQuizBtn');

        // Previous button
        prevBtn.disabled = this.currentQuestionIndex === 0;

        // Next button
        const hasAnswer = this.answers[this.currentQuestionIndex] !== null;
        nextBtn.disabled = !hasAnswer;

        // Show/hide submit button on last question
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
            submitBtn.disabled = !hasAnswer;
            console.log('Submit button enabled:', !submitBtn.disabled, 'Answer:', this.answers[this.currentQuestionIndex]);
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    },

    // Start quiz timer
    startTimer() {
        this.timer = setInterval(() => {
            this.timeElapsed++;
            document.getElementById('timer').textContent = Utils.formatTime(this.timeElapsed);
        }, 1000);
    },

    // Stop quiz timer
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    // Get explanation for current question
    async getExplanation() {
        try {
            Utils.showLoading();

            const currentQuestion = this.questions[this.currentQuestionIndex];
            
            const response = await Utils.apiRequest('/quiz/question/explain', {
                method: 'POST',
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    quizId: App.currentQuiz.id
                })
            });

            // Show explanation
            const explanationContainer = document.getElementById('explanationContainer');
            const explanationText = document.getElementById('explanationText');
            
            explanationText.innerHTML = response.data.explanation.replace(/\n/g, '<br>');
            explanationContainer.classList.remove('hidden');

            Utils.showMessage('Explanation loaded', 'success');

        } catch (error) {
            Utils.showMessage('Failed to load explanation: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Submit quiz
    async submitQuiz() {
        console.log('Submit quiz called');
        console.log('Current answers:', this.answers);
        console.log('Quiz ID:', App.currentQuiz.id);
        
        // Check if all questions are answered
        const unansweredQuestions = this.answers.filter(answer => answer === null).length;
        
        if (unansweredQuestions > 0) {
            const confirmSubmit = confirm(
                `You have ${unansweredQuestions} unanswered question(s). 
                Are you sure you want to submit the quiz?`
            );
            
            if (!confirmSubmit) {
                return;
            }
        }

        try {
            Utils.showLoading();
            
            // Stop timer
            this.stopTimer();

            // Prepare answers for submission
            const submissionAnswers = this.questions.map((question, index) => ({
                questionId: question.id,
                userAnswer: this.answers[index] || '',
                timeTaken: 0 // Individual question time tracking could be added
            }));

            console.log('Submission answers:', submissionAnswers);

            const response = await Utils.apiRequest('/quiz/submit', {
                method: 'POST',
                body: JSON.stringify({
                    quizId: App.currentQuiz.id,
                    answers: submissionAnswers,
                    timeTaken: this.timeElapsed * 1000 // Convert to milliseconds
                })
            });

            console.log('Submit response:', response);

            // Show results
            this.showResults(response.data);

        } catch (error) {
            console.error('Submit error:', error);
            Utils.showMessage('Failed to submit quiz: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Show quiz results
    showResults(resultData) {
        const { quiz, recommendations } = resultData;

        // Update results UI
        document.getElementById('finalScore').textContent = `${quiz.score}%`;
        document.getElementById('correctAnswers').textContent = 
            `${quiz.correctAnswers}/${quiz.totalQuestions}`;
        document.getElementById('timeTaken').textContent = 
            Utils.formatTime(Math.floor(quiz.timeTaken / 1000));
        document.getElementById('quizType').textContent = 
            quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1);

        // Update score message
        const scoreMessage = document.getElementById('scoreMessage');
        if (quiz.score >= 80) {
            scoreMessage.textContent = 'Excellent! Outstanding performance!';
            scoreMessage.style.color = '#48bb78';
        } else if (quiz.score >= 60) {
            scoreMessage.textContent = 'Good job! Keep up the good work!';
            scoreMessage.style.color = '#3182ce';
        } else {
            scoreMessage.textContent = 'Keep practicing! You\'ll improve!';
            scoreMessage.style.color = '#ed8936';
        }

        // Show topic analysis
        this.displayTopicAnalysis(quiz.weakTopics, quiz.strongTopics);

        // Show recommendations
        document.getElementById('recommendationText').textContent = 
            recommendations.nextQuizMessage;

        // Show results section
        Navigation.showSection('resultsSection');
        
        // Clear quiz data
        this.clearQuizData();
    },

    // Display topic analysis
    displayTopicAnalysis(weakTopics, strongTopics) {
        const topicsContainer = document.getElementById('topicsList');
        topicsContainer.innerHTML = '';

        // Combine and sort topics
        const allTopics = [
            ...weakTopics.map(topic => ({ ...topic, type: 'weak' })),
            ...strongTopics.map(topic => ({ ...topic, type: 'strong' }))
        ].sort((a, b) => b.percentage - a.percentage);

        allTopics.forEach(topic => {
            const topicElement = document.createElement('div');
            topicElement.className = 'topic-item';
            topicElement.innerHTML = `
                <span class="topic-name">${topic.topic}</span>
                <span class="topic-score ${topic.type}">${topic.percentage}%</span>
            `;
            topicsContainer.appendChild(topicElement);
        });

        if (allTopics.length === 0) {
            topicsContainer.innerHTML = '<p class="text-muted">No topic analysis available</p>';
        }
    },

    // Clear quiz data
    clearQuizData() {
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.answers = [];
        this.startTime = null;
        this.timeElapsed = 0;
        App.currentQuiz = null;
        this.stopTimer();
    },

    // Setup quiz event listeners
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('submitQuizBtn').addEventListener('click', () => {
            this.submitQuiz();
        });

        // Explain button
        document.getElementById('explainBtn').addEventListener('click', () => {
            this.getExplanation();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('quizSection').classList.contains('hidden')) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    if (!document.getElementById('prevBtn').disabled) {
                        this.previousQuestion();
                    }
                    break;
                case 'ArrowRight':
                    if (!document.getElementById('nextBtn').disabled) {
                        this.nextQuestion();
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    const optionIndex = parseInt(e.key) - 1;
                    const options = document.querySelectorAll('.option');
                    if (options[optionIndex]) {
                        options[optionIndex].click();
                    }
                    break;
            }
        });
    }
};

// Quiz statistics and analytics
const QuizAnalytics = {
    // Track quiz progress
    trackProgress() {
        const progress = {
            questionIndex: Quiz.currentQuestionIndex,
            timeElapsed: Quiz.timeElapsed,
            answeredQuestions: Quiz.answers.filter(a => a !== null).length
        };
        
        Utils.setStorage('quizProgress', progress);
    },

    // Get quiz completion percentage
    getCompletionPercentage() {
        const answered = Quiz.answers.filter(a => a !== null).length;
        return Math.round((answered / Quiz.questions.length) * 100);
    },

    // Calculate time per question
    getAverageTimePerQuestion() {
        const answeredQuestions = Quiz.answers.filter(a => a !== null).length;
        if (answeredQuestions === 0) return 0;
        
        return Math.round(Quiz.timeElapsed / answeredQuestions);
    }
};

// Initialize quiz system
document.addEventListener('DOMContentLoaded', function() {
    Quiz.setupEventListeners();
});

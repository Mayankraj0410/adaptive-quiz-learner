// Global application state
const App = {
    currentUser: null,
    token: null,
    currentQuiz: null,
    currentQuestionIndex: 0,
    quizAnswers: [],
    quizStartTime: null,
    apiBaseUrl: '/api'
};

// Utility functions
const Utils = {
    // Show loading spinner
    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    },

    // Hide loading spinner
    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    },

    // Show message
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        messageContainer.appendChild(messageEl);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    },

    // Format time from seconds to MM:SS
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    // Make API request
    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (App.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${App.token}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${App.apiBaseUrl}${endpoint}`, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // Store data in localStorage
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error storing data:', error);
        }
    },

    // Get data from localStorage
    getStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error retrieving data:', error);
            return null;
        }
    },

    // Remove data from localStorage
    removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing data:', error);
        }
    },

    // Clear all storage
    clearStorage() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }
};

// Modal functions
const Modal = {
    show(title, body, footer = '') {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        modalTitle.textContent = title;
        modalBody.innerHTML = body;
        modalFooter.innerHTML = footer;

        modal.classList.remove('hidden');
        
        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });
    },

    hide() {
        document.getElementById('modal').classList.add('hidden');
    }
};

// Navigation functions
const Navigation = {
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.auth-section, .main-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show target section
        document.getElementById(sectionId).classList.remove('hidden');

        // Show/hide navbar based on section
        const navbar = document.getElementById('navbar');
        if (['dashboardSection', 'quizSection', 'resultsSection'].includes(sectionId)) {
            navbar.classList.remove('hidden');
            document.body.style.paddingTop = '80px';
        } else {
            navbar.classList.add('hidden');
            document.body.style.paddingTop = '0';
        }
    },

    showDashboard() {
        if (App.currentUser.role === 'admin') {
            this.showAdminDashboard();
        } else {
            this.showUserDashboard();
        }
    },

    showUserDashboard() {
        document.getElementById('userDashboard').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        this.showSection('dashboardSection');
        Dashboard.loadUserDashboard();
    },

    showAdminDashboard() {
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('userDashboard').classList.add('hidden');
        this.showSection('dashboardSection');
        Dashboard.loadAdminDashboard();
    }
};

// Dashboard functions
const Dashboard = {
    async loadUserDashboard() {
        try {
            Utils.showLoading();

            // Load user profile
            const profileResponse = await Utils.apiRequest('/user/profile');
            const { user, statistics } = profileResponse.data;

            // Update UI
            document.getElementById('totalQuizzes').textContent = statistics.totalQuizzes;
            document.getElementById('averageScore').textContent = `${statistics.averageScore}%`;
            document.getElementById('weakTopicsCount').textContent = statistics.weakTopics.length;

            // Load quiz info
            const quizInfoResponse = await Utils.apiRequest('/quiz/info');
            const quizInfo = quizInfoResponse.data;

            // Update quiz description
            const quizDescription = document.getElementById('quizDescription');
            const focusAreas = document.getElementById('focusAreas');
            const focusTopics = document.getElementById('focusTopics');

            if (quizInfo.quizType === 'initial') {
                quizDescription.textContent = 'Take your first quiz to assess your knowledge across all topics';
                focusAreas.classList.add('hidden');
            } else {
                quizDescription.textContent = `Adaptive quiz with ${quizInfo.questionCount} questions`;
                if (quizInfo.focusAreas.length > 0) {
                    focusAreas.classList.remove('hidden');
                    focusTopics.innerHTML = quizInfo.focusAreas
                        .map(topic => `<span class="topic-tag">${topic}</span>`)
                        .join('');
                } else {
                    focusAreas.classList.add('hidden');
                }
            }

        } catch (error) {
            Utils.showMessage('Failed to load dashboard: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    async loadAdminDashboard() {
        try {
            Utils.showLoading();

            const response = await Utils.apiRequest('/admin/statistics');
            const stats = response.data;

            // Update statistics
            document.getElementById('totalUsers').textContent = stats.users.total;
            document.getElementById('activeUsers').textContent = stats.users.active;
            document.getElementById('totalQuizzesAdmin').textContent = stats.quizzes.total;
            document.getElementById('totalQuestions').textContent = stats.questions.total;

        } catch (error) {
            Utils.showMessage('Failed to load admin dashboard: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Initialize application
async function initializeApp() {
    try {
        Utils.hideLoading();

        // Check for stored token
        const storedToken = Utils.getStorage('authToken');
        const storedUser = Utils.getStorage('currentUser');

        if (storedToken && storedUser) {
            App.token = storedToken;
            App.currentUser = storedUser;

            // Update navbar
            document.getElementById('userInfo').textContent = `${App.currentUser.email} (${App.currentUser.role})`;

            // Show appropriate dashboard
            Navigation.showDashboard();
        } else {
            Navigation.showSection('loginSection');
        }

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('App initialization error:', error);
        Utils.showMessage('Failed to initialize application', 'error');
        Navigation.showSection('loginSection');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Close modal button
    document.getElementById('closeModal').addEventListener('click', () => {
        Modal.hide();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
    });

    // Dashboard buttons
    document.getElementById('startQuizBtn')?.addEventListener('click', () => {
        Quiz.startQuiz();
    });

    document.getElementById('viewHistoryBtn')?.addEventListener('click', () => {
        showQuizHistory();
    });

    document.getElementById('studyRecommendationsBtn')?.addEventListener('click', () => {
        showStudyRecommendations();
    });

    document.getElementById('generateQuestionsBtn')?.addEventListener('click', () => {
        generateAIQuestions();
    });

    // Admin buttons
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        Admin.showAddUserForm();
    });

    document.getElementById('manageUsersBtn')?.addEventListener('click', () => {
        Admin.showUserManagement();
    });

    // Results buttons
    document.getElementById('takeAnotherQuiz')?.addEventListener('click', () => {
        Quiz.startQuiz();
    });

    document.getElementById('backToDashboard')?.addEventListener('click', () => {
        Navigation.showDashboard();
    });
}

// Logout function
function logout() {
    App.currentUser = null;
    App.token = null;
    App.currentQuiz = null;
    Utils.clearStorage();
    Navigation.showSection('loginSection');
    Utils.showMessage('Logged out successfully', 'success');
}

// Show quiz history
async function showQuizHistory() {
    try {
        Utils.showLoading();
        const response = await Utils.apiRequest('/user/quiz-history');
        const { quizzes } = response.data;

        let historyHtml = '<div class="quiz-history">';
        
        if (quizzes.length === 0) {
            historyHtml += '<p class="text-center text-muted">No quiz history found. Take your first quiz!</p>';
        } else {
            quizzes.forEach(quiz => {
                const date = new Date(quiz.completedAt).toLocaleDateString();
                historyHtml += `
                    <div class="quiz-history-item">
                        <div class="quiz-info">
                            <h4>${quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)} Quiz</h4>
                            <p>Score: ${quiz.score}% | Date: ${date}</p>
                        </div>
                        <button onclick="viewQuizReport('${quiz._id}')" class="btn btn-outline btn-sm">
                            View Report
                        </button>
                    </div>
                `;
            });
        }
        
        historyHtml += '</div>';

        Modal.show('Quiz History', historyHtml);
    } catch (error) {
        Utils.showMessage('Failed to load quiz history: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// View quiz report
async function viewQuizReport(quizId) {
    try {
        Utils.showLoading();
        const response = await Utils.apiRequest(`/user/quiz-report/${quizId}`);
        const { quiz, topicAnalysis, questions } = response.data;

        let reportHtml = `
            <div class="quiz-report">
                <div class="report-summary">
                    <h4>Quiz Summary</h4>
                    <p>Score: ${quiz.score}%</p>
                    <p>Correct Answers: ${quiz.correctAnswers}/${quiz.totalQuestions}</p>
                    <p>Time Taken: ${Utils.formatTime(Math.floor(quiz.timeTaken / 1000))}</p>
                </div>
                
                <div class="topic-performance">
                    <h4>Topic Performance</h4>
        `;

        topicAnalysis.forEach((analysis, topic) => {
            const percentage = analysis.percentage;
            const status = percentage >= 80 ? 'strong' : percentage >= 60 ? 'average' : 'weak';
            reportHtml += `
                <div class="topic-item">
                    <span class="topic-name">${topic}</span>
                    <span class="topic-score ${status}">${percentage}%</span>
                </div>
            `;
        });

        reportHtml += '</div></div>';

        Modal.show('Quiz Report', reportHtml);
    } catch (error) {
        Utils.showMessage('Failed to load quiz report: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Show study recommendations
async function showStudyRecommendations() {
    try {
        Utils.showLoading();
        const response = await Utils.apiRequest('/user/study-recommendations');
        const { recommendations, hasData } = response.data;

        let html = '<div class="study-recommendations">';
        
        if (!hasData) {
            html += '<p class="text-center text-muted">Take some quizzes to get personalized study recommendations!</p>';
        } else {
            html += `<div class="recommendation-text">${recommendations}</div>`;
        }
        
        html += '</div>';

        Modal.show('Study Recommendations', html);
    } catch (error) {
        Utils.showMessage('Failed to load study recommendations: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Generate AI questions for weak topics
async function generateAIQuestions() {
    try {
        Utils.showLoading();
        
        // Show confirmation dialog first
        const confirmHtml = `
            <div class="ai-generation-info">
                <p><strong>AI Question Generation</strong></p>
                <p>This will create personalized questions based on your weak topics using artificial intelligence. The questions will be added to the question pool and may appear in future quizzes.</p>
                <p><em>Note: This feature requires an active OpenAI API connection.</em></p>
                <div class="confirmation-buttons">
                    <button id="confirmGenerate" class="btn btn-primary">Generate Questions</button>
                    <button id="cancelGenerate" class="btn btn-outline">Cancel</button>
                </div>
            </div>
        `;
        
        Modal.show('Generate AI Questions', confirmHtml);
        
        // Handle confirmation
        document.getElementById('confirmGenerate').addEventListener('click', async () => {
            Modal.hide();
            Utils.showLoading();
            
            try {
                const response = await Utils.apiRequest('/quiz/generate-questions', {
                    method: 'POST'
                });
                
                const { questionsGenerated, weakTopics, questions } = response.data;
                
                let successHtml = `
                    <div class="generation-success">
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3>Questions Generated Successfully!</h3>
                        <p>Generated <strong>${questionsGenerated}</strong> new questions for your weak topics:</p>
                        <div class="weak-topics">
                            ${weakTopics.map(topic => `<span class="topic-tag weak">${topic}</span>`).join('')}
                        </div>
                        <div class="generated-questions">
                            <h4>Preview of Generated Questions:</h4>
                            ${questions.slice(0, 3).map(q => `
                                <div class="question-preview">
                                    <p><strong>Topic:</strong> ${q.topic}</p>
                                    <p><strong>Question:</strong> ${q.questionText}</p>
                                    <p><strong>Difficulty:</strong> <span class="difficulty-${q.difficulty}">${q.difficulty}</span></p>
                                </div>
                            `).join('')}
                            ${questions.length > 3 ? `<p><em>... and ${questions.length - 3} more questions</em></p>` : ''}
                        </div>
                        <p class="next-quiz-info">
                            <i class="fas fa-info-circle"></i>
                            These questions will be available in your next adaptive quiz!
                        </p>
                    </div>
                `;
                
                Modal.show('AI Questions Generated', successHtml);
                Utils.showMessage(`Successfully generated ${questionsGenerated} new questions!`, 'success');
                
            } catch (error) {
                console.error('AI generation error:', error);
                let errorMessage = 'Failed to generate questions. ';
                
                if (error.message.includes('No weak topics')) {
                    errorMessage = 'No weak topics identified. Take a quiz first to identify areas for improvement.';
                } else if (error.message.includes('OpenAI') || error.message.includes('API')) {
                    errorMessage = 'AI service is currently unavailable. Please try again later.';
                } else {
                    errorMessage += error.message;
                }
                
                Utils.showMessage(errorMessage, 'error');
            } finally {
                Utils.hideLoading();
            }
        });
        
        document.getElementById('cancelGenerate').addEventListener('click', () => {
            Modal.hide();
        });
        
    } catch (error) {
        Utils.showMessage('Failed to initialize question generation: ' + error.message, 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

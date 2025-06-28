# Adaptive Quiz Learner Application

An intelligent quiz application that adapts to user's learning patterns using Node.js, MongoDB, and OpenAI.

## Features

- **User Authentication**: Email + OTP based login
- **Adaptive Learning**: Quiz questions adapt based on user's weak areas
- **Admin Panel**: User management and quiz analytics
- **AI Integration**: OpenAI for question explanations and adaptive question generation
- **Docker Support**: Complete containerized setup

## Architecture

- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Authentication**: JWT with OTP verification
- **AI**: OpenAI GPT integration
- **Frontend**: HTML5 with vanilla JavaScript
- **Containerization**: Docker & Docker Compose

## Quick Start with Docker

1. Clone the repository
2. Create `.env` file with required environment variables
3. Run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

The application will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory:

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongo:27017/adaptive-quiz-learner
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
```

## Database Collections

- **users**: User profiles and quiz history
- **questions**: Question bank with topics and difficulty
- **quizzes**: Quiz attempts and results
- **weaknessreports**: User performance analysis

## API Endpoints

### Authentication
- `POST /api/auth/login` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP and get JWT

### User APIs
- `GET /api/quiz/start` - Get quiz questions
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/reports` - Get user reports
- `POST /api/question/explain` - Get AI explanation

### Admin APIs
- `POST /api/admin/user/add` - Add new user
- `DELETE /api/admin/user/:userId` - Remove user
- `GET /api/admin/user/:userId/reports` - View user reports

## Docker Commands

```bash
# Build and start services
docker-compose up --build

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Access MongoDB shell
docker-compose exec mongo mongosh
```

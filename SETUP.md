# Adaptive Quiz Learner - Setup Guide

## 🚀 Quick Start

This application is fully containerized with Docker, so you don't need Node.js or MongoDB installed locally.

### Prerequisites
- Docker
- Docker Compose

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configurations:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongo:27017/adaptive-quiz-learner
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Admin Configuration
ADMIN_EMAIL=admin@quizlearner.com
```

### 2. Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

### 3. OpenAI API Setup

1. Create account at https://platform.openai.com/
2. Generate API key
3. Add it to `OPENAI_API_KEY` in `.env`

### 4. Start the Application

#### Using VS Code Tasks (Recommended)
1. Open Command Palette (Ctrl+Shift+P)
2. Run "Tasks: Run Task"
3. Select "Start Development Server"

#### Using Terminal
```bash
docker-compose up --build
```

### 5. Access the Application

- **Application**: http://localhost:3000
- **MongoDB Admin**: http://localhost:8081 (admin/admin123)

## 📋 Default Users

The application creates a default admin user on first run:
- **Email**: admin@quizlearner.com (or your ADMIN_EMAIL)
- **Login**: Use OTP sent to email

## 🔧 Available VS Code Tasks

- **Start Development Server**: Build and start all services
- **Stop Development Server**: Stop all services
- **View Application Logs**: Monitor app logs in real-time
- **MongoDB Shell**: Access MongoDB command line
- **Rebuild Containers**: Clean rebuild of all containers

## 📁 Project Structure

```
adaptive-quiz-learner/
├── server.js              # Main application file
├── package.json           # Node.js dependencies
├── Dockerfile             # Node.js container config
├── docker-compose.yml     # Multi-container setup
├── .env                   # Environment variables
├── models/                # Database models
│   ├── User.js
│   ├── Question.js
│   ├── Quiz.js
│   └── OTP.js
├── routes/                # API routes
│   ├── auth.js
│   ├── user.js
│   ├── admin.js
│   └── quiz.js
├── middleware/            # Express middleware
│   └── auth.js
├── utils/                 # Utility functions
│   ├── emailService.js
│   ├── openaiService.js
│   └── initializeData.js
└── public/               # Frontend files
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js
        ├── auth.js
        ├── quiz.js
        └── admin.js
```

## 🎯 Application Features

### User Features
- **Email + OTP Authentication**
- **Adaptive Quiz System**
  - First quiz: 24 questions (3 per topic)
  - Subsequent quizzes: 20 questions (focused on weak areas)
- **AI-Powered Question Explanations**
- **Progress Tracking & Analytics**
- **Study Recommendations**
- **Profile Management**

### Admin Features
- **User Management** (Add/Remove/Activate/Deactivate)
- **Quiz Analytics & Reports**
- **System Statistics**
- **User Progress Monitoring**

### Technical Features
- **RESTful API** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT Authentication**
- **OpenAI Integration**
- **Email Service** (SMTP)
- **Responsive Web UI**
- **Docker Containerization**

## 🧪 Testing the Application

### 1. Admin Workflow
1. Access http://localhost:3000
2. Login with admin email (check console for OTP if email not configured)
3. Add test users from admin dashboard
4. Manage users and view reports

### 2. User Workflow
1. Login with user email
2. Take first quiz (24 questions across all topics)
3. View results and weak areas
4. Take adaptive quiz (focused on weak topics)
5. Request question explanations
6. Track progress over time

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Application logs
docker-compose logs -f app

# MongoDB logs
docker-compose logs -f mongo

# All logs
docker-compose logs -f
```

### Database Access
```bash
# MongoDB shell
docker-compose exec mongo mongosh

# Use the quiz database
use adaptive-quiz-learner

# Check collections
show collections

# Query users
db.users.find()
```

### Container Management
```bash
# Stop services
docker-compose down

# Remove volumes (clears database)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
```

## 🛠️ Development

### Adding New Features
1. Backend: Add routes in `/routes`, models in `/models`
2. Frontend: Update `/public/js` and `/public/css`
3. Database: Modify models and add migrations if needed

### Environment Variables
- All configs are in `.env`
- Restart containers after changing environment variables
- Never commit `.env` to version control

### Database Schema
- **Users**: Authentication, quiz history, weakness analysis
- **Questions**: Question bank with topics and difficulty
- **Quizzes**: Quiz attempts with detailed analytics
- **OTPs**: Temporary codes for authentication

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change ports in docker-compose.yml
   ports:
     - "3001:3000"  # Change first number
   ```

2. **Email Not Working**
   - Check Gmail app password
   - Verify EMAIL_HOST and EMAIL_PORT
   - Check console logs for OTP if email fails

3. **OpenAI Errors**
   - Verify API key is valid
   - Check API quota and billing
   - Monitor API rate limits

4. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   docker-compose ps
   
   # Restart MongoDB
   docker-compose restart mongo
   ```

5. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Getting Help
- Check container logs: `docker-compose logs`
- Verify environment variables in `.env`
- Ensure all services are running: `docker-compose ps`
- Check network connectivity between containers

## 🔒 Security Notes

- Change JWT_SECRET in production
- Use environment-specific `.env` files
- Configure proper email authentication
- Set up HTTPS in production
- Implement rate limiting for APIs
- Regular security updates for dependencies

## 📈 Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper email service
4. Set up SSL/TLS certificates
5. Use production MongoDB cluster
6. Implement proper logging and monitoring
7. Set up backup strategies

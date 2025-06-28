// Authentication functions
const Auth = {
    // Initialize auth event listeners
    init() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
        
        // OTP form
        document.getElementById('otpForm').addEventListener('submit', this.handleOTPVerification);
        
        // Resend OTP
        document.getElementById('resendOtp').addEventListener('click', this.handleResendOTP);
        
        // Back to login
        document.getElementById('backToLogin').addEventListener('click', this.showLoginForm);
    },

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            Utils.showMessage('Please enter your email address', 'error');
            return;
        }

        try {
            Utils.showLoading();
            
            const response = await Utils.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            // Store email for OTP verification
            App.loginEmail = email;
            
            // Show OTP section
            Auth.showOTPForm(email);
            
            Utils.showMessage('OTP sent to your email address', 'success');
            
        } catch (error) {
            Utils.showMessage(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Handle OTP verification
    async handleOTPVerification(e) {
        e.preventDefault();
        
        const otp = document.getElementById('otp').value.trim();
        
        if (!otp || otp.length !== 6) {
            Utils.showMessage('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        try {
            Utils.showLoading();
            
            const response = await Utils.apiRequest('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({
                    email: App.loginEmail,
                    otp: otp
                })
            });

            // Store authentication data
            App.token = response.data.token;
            App.currentUser = response.data.user;
            
            // Save to localStorage
            Utils.setStorage('authToken', App.token);
            Utils.setStorage('currentUser', App.currentUser);
            
            // Update navbar
            document.getElementById('userInfo').textContent = 
                `${App.currentUser.email} (${App.currentUser.role})`;
            
            // Show appropriate dashboard
            Navigation.showDashboard();
            
            Utils.showMessage('Login successful!', 'success');
            
        } catch (error) {
            Utils.showMessage(error.message, 'error');
            
            // Clear OTP field on error
            document.getElementById('otp').value = '';
        } finally {
            Utils.hideLoading();
        }
    },

    // Handle resend OTP
    async handleResendOTP(e) {
        e.preventDefault();
        
        if (!App.loginEmail) {
            Utils.showMessage('Email not found. Please start over.', 'error');
            Auth.showLoginForm();
            return;
        }

        try {
            Utils.showLoading();
            
            await Utils.apiRequest('/auth/resend-otp', {
                method: 'POST',
                body: JSON.stringify({ email: App.loginEmail })
            });
            
            Utils.showMessage('New OTP sent to your email', 'success');
            
        } catch (error) {
            Utils.showMessage(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Show login form
    showLoginForm() {
        Navigation.showSection('loginSection');
        
        // Clear form data
        document.getElementById('email').value = '';
        document.getElementById('otp').value = '';
        App.loginEmail = null;
    },

    // Show OTP form
    showOTPForm(email) {
        Navigation.showSection('otpSection');
        document.getElementById('otpEmail').textContent = email;
        
        // Focus on OTP input
        document.getElementById('otp').focus();
    },

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

// Enhanced form validation
const FormValidation = {
    // Validate email field
    validateEmail(email) {
        if (!email) {
            return { valid: false, message: 'Email is required' };
        }
        
        if (!Auth.isValidEmail(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        
        return { valid: true };
    },

    // Validate OTP field
    validateOTP(otp) {
        if (!otp) {
            return { valid: false, message: 'OTP is required' };
        }
        
        if (otp.length !== 6) {
            return { valid: false, message: 'OTP must be 6 digits' };
        }
        
        if (!/^\d{6}$/.test(otp)) {
            return { valid: false, message: 'OTP must contain only numbers' };
        }
        
        return { valid: true };
    },

    // Add real-time validation to forms
    addRealTimeValidation() {
        // Email validation
        const emailInput = document.getElementById('email');
        emailInput.addEventListener('blur', function() {
            const validation = FormValidation.validateEmail(this.value);
            FormValidation.showFieldValidation(this, validation);
        });

        // OTP validation
        const otpInput = document.getElementById('otp');
        otpInput.addEventListener('input', function() {
            // Only allow numbers
            this.value = this.value.replace(/\D/g, '');
            
            const validation = FormValidation.validateOTP(this.value);
            FormValidation.showFieldValidation(this, validation);
        });
    },

    // Show field validation feedback
    showFieldValidation(field, validation) {
        // Remove existing validation classes
        field.classList.remove('valid', 'invalid');
        
        // Remove existing validation message
        const existingMessage = field.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!validation.valid) {
            field.classList.add('invalid');
            
            // Add validation message
            const messageEl = document.createElement('div');
            messageEl.className = 'validation-message error';
            messageEl.textContent = validation.message;
            field.parentNode.appendChild(messageEl);
        } else if (field.value) {
            field.classList.add('valid');
        }
    }
};

// Auto-fill and convenience features
const AuthEnhancements = {
    // Remember last email
    rememberLastEmail() {
        const lastEmail = Utils.getStorage('lastEmail');
        if (lastEmail) {
            document.getElementById('email').value = lastEmail;
        }
    },

    // Save email on successful login
    saveLastEmail(email) {
        Utils.setStorage('lastEmail', email);
    },

    // Auto-submit OTP when 6 digits are entered
    setupAutoSubmitOTP() {
        const otpInput = document.getElementById('otp');
        otpInput.addEventListener('input', function() {
            if (this.value.length === 6) {
                // Small delay to allow user to see the complete OTP
                setTimeout(() => {
                    document.getElementById('otpForm').dispatchEvent(new Event('submit'));
                }, 500);
            }
        });
    },

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Escape to close modal
            if (e.key === 'Escape') {
                Modal.hide();
            }
            
            // Enter to submit forms
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                const form = e.target.closest('form');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
    }
};

// Initialize authentication system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
    FormValidation.addRealTimeValidation();
    AuthEnhancements.rememberLastEmail();
    AuthEnhancements.setupAutoSubmitOTP();
    AuthEnhancements.setupKeyboardShortcuts();
});

// Add CSS for form validation
const style = document.createElement('style');
style.textContent = `
    .form-group input.valid {
        border-color: #48bb78;
    }
    
    .form-group input.invalid {
        border-color: #e53e3e;
    }
    
    .validation-message {
        font-size: 12px;
        margin-top: 5px;
    }
    
    .validation-message.error {
        color: #e53e3e;
    }
    
    .validation-message.success {
        color: #48bb78;
    }
`;
document.head.appendChild(style);

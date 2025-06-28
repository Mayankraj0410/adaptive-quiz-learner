// Admin management functions
const Admin = {
    currentUsers: [],
    currentPage: 1,
    usersPerPage: 10,

    // Show add user form
    showAddUserForm() {
        const formHtml = `
            <form id="addUserForm" class="admin-form">
                <div class="form-group">
                    <label for="newUserEmail">Email Address</label>
                    <input type="email" id="newUserEmail" required placeholder="user@example.com">
                </div>
                
                <div class="form-group">
                    <label for="newUserRole">Role</label>
                    <select id="newUserRole" required>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </form>
        `;

        const footerHtml = `
            <button type="button" onclick="Modal.hide()" class="btn btn-outline">Cancel</button>
            <button type="button" onclick="Admin.addUser()" class="btn btn-primary">
                <i class="fas fa-user-plus"></i>
                Add User
            </button>
        `;

        Modal.show('Add New User', formHtml, footerHtml);
        
        // Focus on email input
        setTimeout(() => {
            document.getElementById('newUserEmail').focus();
        }, 100);
    },

    // Add new user
    async addUser() {
        const email = document.getElementById('newUserEmail').value.trim();
        const role = document.getElementById('newUserRole').value;

        // Validation
        if (!email) {
            Utils.showMessage('Email is required', 'error');
            return;
        }

        if (!Auth.isValidEmail(email)) {
            Utils.showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            Utils.showLoading();

            const response = await Utils.apiRequest('/admin/user/add', {
                method: 'POST',
                body: JSON.stringify({ email, role })
            });

            Modal.hide();
            Utils.showMessage('User added successfully!', 'success');
            
            // Refresh user list if it's currently displayed
            if (document.querySelector('.user-management')) {
                this.loadUsers();
            }
            
            // Refresh admin dashboard stats
            Dashboard.loadAdminDashboard();

        } catch (error) {
            Utils.showMessage('Failed to add user: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Show user management interface
    async showUserManagement() {
        try {
            Utils.showLoading();
            await this.loadUsers();
            
            const managementHtml = this.generateUserManagementHTML();
            
            Modal.show('User Management', managementHtml, `
                <button type="button" onclick="Modal.hide()" class="btn btn-outline">Close</button>
                <button type="button" onclick="Admin.showAddUserForm()" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i>
                    Add User
                </button>
            `);

        } catch (error) {
            Utils.showMessage('Failed to load user management: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Load users from API
    async loadUsers(page = 1) {
        try {
            const response = await Utils.apiRequest(`/admin/users?page=${page}&limit=${this.usersPerPage}`);
            this.currentUsers = response.data.users;
            this.currentPage = page;
            this.totalPages = response.data.pagination.totalPages;
            this.totalUsers = response.data.pagination.totalUsers;
            
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Generate user management HTML
    generateUserManagementHTML() {
        let html = `
            <div class="user-management">
                <div class="user-management-header">
                    <div class="user-stats">
                        <span>Total Users: ${this.totalUsers}</span>
                        <span>Page ${this.currentPage} of ${this.totalPages}</span>
                    </div>
                    
                    <div class="user-filters">
                        <select id="roleFilter" onchange="Admin.filterUsers()">
                            <option value="all">All Roles</option>
                            <option value="user">Users</option>
                            <option value="admin">Admins</option>
                        </select>
                        
                        <select id="statusFilter" onchange="Admin.filterUsers()">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="user-list">
        `;

        if (this.currentUsers.length === 0) {
            html += '<p class="text-center text-muted">No users found</p>';
        } else {
            this.currentUsers.forEach(user => {
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                const statusClass = user.isActive ? 'active' : 'inactive';
                const statusText = user.isActive ? 'Active' : 'Inactive';
                
                html += `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-details">
                                <h4>${user.email}</h4>
                                <div class="user-meta">
                                    <span class="user-role ${user.role}">${user.role.toUpperCase()}</span>
                                    <span class="user-status ${statusClass}">${statusText}</span>
                                    <span class="join-date">Joined: ${joinDate}</span>
                                </div>
                                <div class="user-stats-mini">
                                    <span>Quizzes: ${user.statistics.totalQuizzes}</span>
                                    <span>Avg Score: ${user.statistics.averageScore}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="user-actions">
                            <button onclick="Admin.viewUserReports('${user.id}')" class="btn btn-outline btn-sm">
                                <i class="fas fa-chart-bar"></i>
                                Reports
                            </button>
                            
                            <button onclick="Admin.toggleUserStatus('${user.id}', ${!user.isActive})" 
                                    class="btn btn-${user.isActive ? 'secondary' : 'success'} btn-sm">
                                <i class="fas fa-${user.isActive ? 'pause' : 'play'}"></i>
                                ${user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            
                            ${user.id !== App.currentUser.id ? `
                                <button onclick="Admin.deleteUser('${user.id}', '${user.email}')" 
                                        class="btn btn-outline btn-sm btn-danger">
                                    <i class="fas fa-trash"></i>
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
                
                ${this.totalPages > 1 ? this.generatePaginationHTML() : ''}
            </div>
        `;

        return html;
    },

    // Generate pagination HTML
    generatePaginationHTML() {
        let html = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            html += `<button onclick="Admin.changePage(${this.currentPage - 1})" class="btn btn-outline btn-sm">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === this.currentPage) {
                html += `<button class="btn btn-primary btn-sm">${i}</button>`;
            } else {
                html += `<button onclick="Admin.changePage(${i})" class="btn btn-outline btn-sm">${i}</button>`;
            }
        }
        
        // Next button
        if (this.currentPage < this.totalPages) {
            html += `<button onclick="Admin.changePage(${this.currentPage + 1})" class="btn btn-outline btn-sm">Next</button>`;
        }
        
        html += '</div>';
        return html;
    },

    // Change page
    async changePage(page) {
        try {
            Utils.showLoading();
            await this.loadUsers(page);
            
            // Update the modal content
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = this.generateUserManagementHTML();
            
        } catch (error) {
            Utils.showMessage('Failed to load page: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Filter users
    async filterUsers() {
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        try {
            Utils.showLoading();
            
            let url = `/admin/users?page=1&limit=${this.usersPerPage}`;
            if (roleFilter !== 'all') url += `&role=${roleFilter}`;
            if (statusFilter !== 'all') url += `&status=${statusFilter}`;
            
            const response = await Utils.apiRequest(url);
            this.currentUsers = response.data.users;
            this.currentPage = 1;
            this.totalPages = response.data.pagination.totalPages;
            this.totalUsers = response.data.pagination.totalUsers;
            
            // Update the modal content
            const modalBody = document.getElementById('modalBody');
            modalBody.innerHTML = this.generateUserManagementHTML();
            
        } catch (error) {
            Utils.showMessage('Failed to filter users: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Toggle user status
    async toggleUserStatus(userId, newStatus) {
        try {
            Utils.showLoading();
            
            await Utils.apiRequest(`/admin/user/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: newStatus })
            });
            
            Utils.showMessage(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
            
            // Refresh current view
            await this.changePage(this.currentPage);
            
        } catch (error) {
            Utils.showMessage('Failed to update user status: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Delete user
    async deleteUser(userId, userEmail) {
        const confirmDelete = confirm(
            `Are you sure you want to delete user "${userEmail}"?\n\n` +
            'This will permanently delete the user and all their quiz data. This action cannot be undone.'
        );
        
        if (!confirmDelete) return;
        
        try {
            Utils.showLoading();
            
            await Utils.apiRequest(`/admin/user/${userId}`, {
                method: 'DELETE'
            });
            
            Utils.showMessage('User deleted successfully', 'success');
            
            // Refresh current view
            await this.changePage(this.currentPage);
            
            // Refresh dashboard stats
            Dashboard.loadAdminDashboard();
            
        } catch (error) {
            Utils.showMessage('Failed to delete user: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // View user reports
    async viewUserReports(userId) {
        try {
            Utils.showLoading();
            
            const response = await Utils.apiRequest(`/admin/user/${userId}/reports`);
            const { user, quizzes } = response.data;
            
            let reportsHtml = `
                <div class="user-reports">
                    <div class="user-summary">
                        <h4>${user.email}</h4>
                        <p>Total Quizzes: ${quizzes.length}</p>
                    </div>
                    
                    <div class="quiz-reports-list">
            `;
            
            if (quizzes.length === 0) {
                reportsHtml += '<p class="text-center text-muted">No quiz reports found</p>';
            } else {
                quizzes.forEach(quiz => {
                    const date = new Date(quiz.completedAt).toLocaleDateString();
                    const time = new Date(quiz.completedAt).toLocaleTimeString();
                    
                    reportsHtml += `
                        <div class="quiz-report-item">
                            <div class="quiz-summary">
                                <h5>${quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)} Quiz</h5>
                                <p>Score: ${quiz.score}% | ${date} at ${time}</p>
                                <p>Correct: ${quiz.correctAnswers}/${quiz.totalQuestions}</p>
                            </div>
                            <button onclick="Admin.viewDetailedQuizReport('${quiz._id}')" 
                                    class="btn btn-outline btn-sm">
                                View Details
                            </button>
                        </div>
                    `;
                });
            }
            
            reportsHtml += '</div></div>';
            
            Modal.show(`Quiz Reports - ${user.email}`, reportsHtml);
            
        } catch (error) {
            Utils.showMessage('Failed to load user reports: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // View detailed quiz report
    async viewDetailedQuizReport(quizId) {
        try {
            Utils.showLoading();
            
            // This would require a new API endpoint for admin to view detailed quiz reports
            // For now, show a placeholder
            Modal.show('Detailed Quiz Report', 
                '<p>Detailed quiz report functionality would be implemented here.</p>');
            
        } catch (error) {
            Utils.showMessage('Failed to load detailed report: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

// Add CSS for admin styles
const adminStyle = document.createElement('style');
adminStyle.textContent = `
    .admin-form .form-group {
        margin-bottom: 20px;
    }
    
    .admin-form select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 16px;
    }
    
    .user-management-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e9ecef;
    }
    
    .user-stats span {
        margin-right: 15px;
        color: #666;
        font-weight: 500;
    }
    
    .user-filters {
        display: flex;
        gap: 10px;
    }
    
    .user-filters select {
        padding: 8px 12px;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        font-size: 14px;
    }
    
    .user-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .user-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 10px;
        background: #f8f9fa;
    }
    
    .user-details h4 {
        margin-bottom: 8px;
        color: #333;
    }
    
    .user-meta {
        display: flex;
        gap: 15px;
        margin-bottom: 5px;
    }
    
    .user-role {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .user-role.admin {
        background: #ffd6cc;
        color: #c53030;
    }
    
    .user-role.user {
        background: #d6f5d6;
        color: #38a169;
    }
    
    .user-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .user-status.active {
        background: #d6f5d6;
        color: #38a169;
    }
    
    .user-status.inactive {
        background: #ffd6d6;
        color: #e53e3e;
    }
    
    .join-date {
        color: #666;
        font-size: 12px;
    }
    
    .user-stats-mini {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: #666;
    }
    
    .user-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    
    .btn-danger {
        color: #e53e3e;
        border-color: #e53e3e;
    }
    
    .btn-danger:hover {
        background: #e53e3e;
        color: white;
    }
    
    .pagination {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #e9ecef;
    }
    
    .quiz-report-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 10px;
        background: #f8f9fa;
    }
    
    .quiz-summary h5 {
        margin-bottom: 5px;
        color: #333;
    }
    
    .quiz-summary p {
        margin: 0;
        color: #666;
        font-size: 14px;
    }
`;
document.head.appendChild(adminStyle);

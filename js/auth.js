class AuthService {
    // Check if user is authenticated
    static isAuthenticated() {
        const token = localStorage.getItem('auth_token');
        if (!token) return false;

        try {
            // Decode token payload
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // Check if token is expired
            if (payload.exp < Date.now() / 1000) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // Get current user
    static getCurrentUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    // Get auth token
    static getToken() {
        return localStorage.getItem('auth_token');
    }

    // Logout
    static logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = 'login.html';
    }

    // Check user role
    static hasRole(requiredRole) {
        const user = this.getCurrentUser();
        return user && user.role === requiredRole;
    }

    // Check if user is admin
    static isAdmin() {
        return this.hasRole('admin');
    }

    // Verify token with server (optional)
    static async verifyToken() {
        try {
            const token = this.getToken();
            if (!token) return false;

            const response = await fetch('/api/verify-token.php', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // Add auth header to requests
    static authHeaders() {
        return {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json'
        };
    }
}

// Protect routes - use this in every page
function requireAuth() {
    if (!AuthService.isAuthenticated()) {
        // Store the current page to redirect back after login
        sessionStorage.setItem('redirect_url', window.location.href);
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Protect admin routes
function requireAdmin() {
    if (!AuthService.isAuthenticated()) {
        sessionStorage.setItem('redirect_url', window.location.href);
        window.location.href = 'login.html';
        return false;
    }

    if (!AuthService.isAdmin()) {
        window.location.href = 'unauthorized.html';
        return false;
    }

    return true;
}

// Initialize auth check on page load
function initAuth() {
    if (requireAuth()) {
        // User is authenticated, you can update UI accordingly
        updateUIForLoggedInUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const user = AuthService.getCurrentUser();
    if (user) {
        // Update user info in navbar
        const userElements = document.querySelectorAll('[data-user-name]');
        userElements.forEach(el => {
            el.textContent = user.name;
        });

        const userEmailElements = document.querySelectorAll('[data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });

        // Show/hide elements based on role
        if (AuthService.isAdmin()) {
            document.querySelectorAll('[data-role="admin"]').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            document.querySelectorAll('[data-role="admin"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Show logout button
        document.querySelectorAll('[data-auth="authenticated"]').forEach(el => {
            el.style.display = 'block';
        });

        // Hide login button
        document.querySelectorAll('[data-auth="unauthenticated"]').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Password visibility toggle
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.parentNode.querySelector('.fa-eye');
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
            'bg-blue-500';

    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up`;
    toast.textContent = message;

    const container = document.getElementById('toastContainer');
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Token storage
function storeToken(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
}

// Form submission
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const buttonSpinner = document.getElementById('buttonSpinner');

    // Show loading state
    submitButton.disabled = true;
    buttonText.textContent = 'جاري تسجيل الدخول...';
    buttonSpinner.classList.remove('hidden');

    try {
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        const response = await fetch('/api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            // Store token and user data
            storeToken(result.token, result.user);

            showToast(result.message, 'success');
            setTimeout(() => {
                //go index 
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast(result.message, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        buttonText.textContent = 'تسجيل الدخول';
        buttonSpinner.classList.add('hidden');
    }
});

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        window.location.href = 'index.html';
    }
}

// Run auth check on page load
checkAuth();
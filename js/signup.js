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

// Form submission
document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const buttonSpinner = document.getElementById('buttonSpinner');

    // Show loading state
    submitButton.disabled = true;
    buttonText.textContent = 'جاري التسجيل...';
    buttonSpinner.classList.remove('hidden');

    try {
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value
        };

        if (formData.password !== formData.confirm_password) {
            showToast('كلمة المرور وتأكيد كلمة المرور غير متطابقين.', 'error');
            return;
        }

        const response = await fetch('/api/signup.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showToast(result.message, 'success');
            // store user data in local storage 
            storeToken(result.data.token, result.data.user);
            

            setTimeout(() => {
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
        buttonText.textContent = 'إنشاء حساب';
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


// confirme password check real time
document.getElementById('confirm-password-error').addEventListener('input', function () {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const errorElement = document.getElementById('confirm-password-error');

    if (password !== confirmPassword) {
        errorElement.textContent = 'كلمة المرور وتأكيد كلمة المرور غير متطابقين.';
    } else {
        errorElement.textContent = '';
    }
});

// Token storage
function storeToken(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
}
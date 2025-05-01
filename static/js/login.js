document.addEventListener('DOMContentLoaded', function () {
    const themeBtns = document.querySelectorAll('.theme-btn');
    const body = document.body;

    themeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const theme = this.getAttribute('data-theme');
            themeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    const activeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
    if (activeBtn) activeBtn.classList.add('active');
});

function toggleForm(type) {
    document.getElementById('login-form').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = type === 'register' ? 'block' : 'none';
    document.querySelector('.auth-container').scrollIntoView({ behavior: 'smooth' });
}

function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling.querySelector('i');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'text' ? 'far fa-eye-slash' : 'far fa-eye';
}

function showLoading(id) {
    const btn = document.getElementById(id);
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
}

function resetButton(id, content) {
    const btn = document.getElementById(id);
    btn.innerHTML = content;
    btn.disabled = false;
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const loginBtn = document.getElementById('login-button');
    const original = '<span>Đăng nhập</span><i class="fas fa-arrow-right"></i>';

    if (email && password) {
        showLoading('login-button');
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ email, password })
            });
            const data = await response.json();

            if (data.success) {
                alert('Đăng nhập thành công!');
                // Redirect to home or dashboard
                window.location.href = '/home';
            } else {
                alert(data.message);
            }
            resetButton('login-button', original);
        } catch (error) {
            console.error('Error:', error);
            alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
            resetButton('login-button', original);
        }
    } else {
        alert('Vui lòng điền đầy đủ thông tin');
    }
}

async function handleRegister() {
const name = document.getElementById('register-name').value.trim();
const email = document.getElementById('register-email').value.trim();
const password = document.getElementById('register-password').value;
const confirm = document.getElementById('register-confirm-password').value;
const registerBtn = document.getElementById('register-button');
const original = '<span>Đăng ký</span><i class="fas fa-user-plus"></i>';

if (name && email && password && confirm) {
if (password !== confirm) {
    alert('Mật khẩu xác nhận không khớp');
    return;
}
showLoading('register-button');
try {
    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            full_name: name,
            email,
            password
        })
    });
    const data = await response.json();

    if (data.success) {
        alert('Đăng ký thành công!');
        toggleForm('login');
    } else {
        alert(data.message);
    }
    resetButton('register-button', original);
} catch (error) {
    console.error('Error:', error);
    alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    resetButton('register-button', original);
}
} else {
alert('Vui lòng điền đầy đủ thông tin');
}
}


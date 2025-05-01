document.addEventListener('DOMContentLoaded', () => {
    // Xử lý theme (chế độ tối/sáng)
    const themeBtns = document.querySelectorAll('.theme-btn');
    const body = document.body;

    themeBtns.forEach(btn => {
        // Gán sự kiện click cho mỗi nút thay đổi theme
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            themeBtns.forEach(b => b.classList.remove('active')); // Loại bỏ 'active' từ tất cả nút
            btn.classList.add('active'); // Thêm 'active' cho nút hiện tại
            body.setAttribute('data-theme', theme); // Đổi theme của trang
            localStorage.setItem('theme', theme); // Lưu theme vào localStorage
        });
    });

    // Lấy theme đã lưu trong localStorage (nếu có) và áp dụng
    const savedTheme = localStorage.getItem('theme') || 'light'; // Mặc định là 'light' nếu không có
    body.setAttribute('data-theme', savedTheme);
    const activeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
    if (activeBtn) activeBtn.classList.add('active'); // Thêm 'active' vào nút tương ứng với theme đã lưu
});

// Hàm chuyển đổi giữa form đăng nhập và đăng ký
function toggleForm(type) {
    // Hiển thị form đăng nhập hoặc đăng ký dựa trên tham số 'type'
    document.getElementById('login-form').style.display = (type === 'login') ? 'block' : 'none';
    document.getElementById('register-form').style.display = (type === 'register') ? 'block' : 'none';
    document.querySelector('.auth-container').scrollIntoView({ behavior: 'smooth' }); // Cuộn tới container của form
}

// Hàm thay đổi kiểu hiển thị mật khẩu
function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling.querySelector('i');
    input.type = (input.type === 'password') ? 'text' : 'password'; // Thay đổi kiểu input giữa password và text
    icon.className = (input.type === 'text') ? 'far fa-eye-slash' : 'far fa-eye'; // Thay đổi icon mắt
}

// Hàm hiển thị spinner khi bấm nút (hiển thị đang tải)
function showLoading(id) {
    const btn = document.getElementById(id);
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Thêm spinner vào nút
    btn.disabled = true; // Vô hiệu hóa nút
}

// Hàm đặt lại trạng thái nút về trạng thái ban đầu
function resetButton(id, content) {
    const btn = document.getElementById(id);
    btn.innerHTML = content; // Đặt lại nội dung ban đầu cho nút
    btn.disabled = false; // Kích hoạt nút
}

// Hàm xử lý đăng nhập
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const loginBtn = document.getElementById('login-button');
    const original = '<span>Đăng nhập</span><i class="fas fa-arrow-right"></i>'; // Nội dung ban đầu của nút đăng nhập

    if (email && password) {
        showLoading('login-button'); // Hiển thị loading khi đang xử lý
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ email, password })
            });
            const data = await response.json();

            if (data.success) {
                alert('Đăng nhập thành công!');
                window.location.href = '/home'; // Chuyển hướng đến trang chính
            } else {
                alert(data.message); // Hiển thị thông báo lỗi
            }
            resetButton('login-button', original); // Đặt lại trạng thái nút
        } catch (error) {
            console.error('Error:', error);
            alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
            resetButton('login-button', original); // Đặt lại nút khi có lỗi
        }
    } else {
        alert('Vui lòng điền đầy đủ thông tin'); // Cảnh báo khi thiếu thông tin
    }
}

// Hàm xử lý đăng ký
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
                toggleForm('login'); // Chuyển về form đăng nhập
            } else {
                alert(data.message); // Thông báo lỗi khi đăng ký thất bại
            }
            resetButton('register-button', original); // Đặt lại trạng thái nút
        } catch (error) {
            console.error('Error:', error);
            alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
            resetButton('register-button', original);
        }
    } else {
        alert('Vui lòng điền đầy đủ thông tin'); // Cảnh báo nếu thiếu thông tin
    }
}

// Kiểm tra session người dùng và chuyển hướng nếu đã đăng nhập
function checkSession() {
    fetch('/check_session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            if (data.id && data.full_name) {
                window.location.href = '/home'; // Chuyển hướng nếu người dùng đã đăng nhập
            } else {
                alert('Chưa đăng nhập'); // Thông báo nếu chưa đăng nhập
            }
        })
        .catch(error => {
            console.error('Lỗi khi kiểm tra session:', error);
        });
}

// Gọi hàm checkSession khi trang được tải
checkSession();

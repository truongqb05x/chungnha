document.addEventListener('DOMContentLoaded', function() {
    // === CÁC PHẦN CHUNG ===
    const body = document.body;
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const themeIconContainer = document.querySelector('.header-icon.theme-icon');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeIcon = themeIconContainer.querySelector('i');

    // === 1. Mobile menu toggle ===
    function toggleMenu() {
        sidebar.classList.toggle('active');
        body.classList.toggle('sidebar-active');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
    }

    // Mở/đóng menu khi nhấn vào icon
    mobileMenuBtn.addEventListener('click', toggleMenu);

    // Đóng menu khi click bên ngoài sidebar
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target) && sidebar.classList.contains('active')) {
            toggleMenu();
        }
    });

    // Đóng menu tự động khi resize màn hình
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            toggleMenu();
        }
    });

    // === 2. Theme toggle ===
    themeIconContainer.addEventListener('click', toggleTheme);
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.getAttribute('data-theme')));
    });

    // === 3. Load saved theme on page load ===
    setTheme(savedTheme);

    // Hàm thay đổi theme và lưu vào localStorage
    function setTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-theme') === theme));
    }

    // Hàm chuyển theme khi nhấn vào icon
    function toggleTheme() {
        const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
});

// === Kiểm tra trạng thái đăng nhập ===
function checkLoginStatus() {
    fetch('/check_session', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (!data.id || !data.full_name) {
            window.location.href = '/';  // Chuyển hướng nếu chưa đăng nhập
        }
    })
    .catch(error => console.error('Lỗi khi kiểm tra session:', error));
}

// Gọi hàm kiểm tra đăng nhập mỗi khi cần
checkLoginStatus();

// Hàm để lấy nhóm của người dùng
async function fetchUserGroup(userId) {
    try {
        const response = await fetch(`/api/user_group?user_id=${userId}`);
        const data = await response.json();

        if (response.ok && data.group) {
            document.querySelector('.sidebar-group').textContent = `Nhóm: ${data.group}`;
        } else {
            alert(data.message || 'Lỗi khi lấy tên nhóm');
        }
    } catch (error) {
        console.error('Lỗi khi gọi API fetchUserGroup:', error);
        alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
}

// Hàm kiểm tra session và lấy user_id
async function checkSession() {
    try {
        const response = await fetch('/check_session');
        const data = await response.json();

        if (response.ok && data.id) {
            return data.id;  // Trả về user_id
        } else {
            return null;  // Không có user_id
        }
    } catch (error) {
        console.error('Lỗi khi gọi API check_session:', error);
        alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
        return null;
    }
}

// Gọi hàm checkSession để lấy user_id và sau đó lấy tên nhóm
checkSession().then(userId => {
    if (userId) {
        fetchUserGroup(userId);  // Gọi API để lấy tên nhóm
    } else {
        console.log('Người dùng chưa đăng nhập');
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    const avatarEl = document.querySelector('.user-avatar');
    try {
      // Gọi API lấy 2 chữ cái đầu của tên user
      const res = await fetch('/api/user_initials');
      if (!res.ok) {
        console.error('Lấy initials thất bại:', res.status);
        return;
      }
      const { initials } = await res.json();
      // Cập nhật nội dung <a> với initials mới
      avatarEl.textContent = initials;
    } catch (err) {
      console.error('Lỗi khi gọi API /api/user_initials:', err);
    }
  });
  
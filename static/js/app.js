        document.addEventListener('DOMContentLoaded', function() {
            // Mobile menu toggle
            const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
            const sidebar = document.querySelector('.sidebar');
            
            mobileMenuBtn.addEventListener('click', function() {
                sidebar.classList.toggle('active');
                mobileMenuBtn.innerHTML = sidebar.classList.contains('active') 
                    ? '<i class="fas fa-times"></i>' 
                    : '<i class="fas fa-bars"></i>';
            });

            // Theme toggle
            const themeToggle = document.querySelector('.theme-toggle');
            const themeBtns = document.querySelectorAll('.theme-btn');
            const body = document.body;
            
            themeBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const theme = this.getAttribute('data-theme');
                    
                    themeBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    body.setAttribute('data-theme', theme);
                    localStorage.setItem('theme', theme);
                    
                    const themeIcon = document.querySelector('.theme-icon i');
                    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                });
            });

            const savedTheme = localStorage.getItem('theme') || 'light';
            body.setAttribute('data-theme', savedTheme);
            
            const activeThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
            if (activeThemeBtn) {
                themeBtns.forEach(b => b.classList.remove('active'));
                activeThemeBtn.classList.add('active');
                
                const themeIcon = document.querySelector('.theme-icon i');
                themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        });

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
  // === Kiểm tra trạng thái đăng nhập ===
function checkLoginStatus() {
    fetch('/check_session', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        // Nếu không có id hoặc full_name, coi như chưa đăng nhập
        if (!data.id || !data.full_name) {
            // Chuyển hướng về trang cá nhân
            window.location.href = '/trang-ca-nhan';
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
  
      const sidebarGroup = document.querySelector('.sidebar-group');
      if (!sidebarGroup) return;
  
      if (response.ok && data.group) {
        // Đã có nhóm
        sidebarGroup.textContent = `Nhóm: ${data.group}`;
      } else {
        // Chưa tham gia hoặc chưa có nhóm
        sidebarGroup.textContent = 'Chưa có nhóm';
      }
    } catch (error) {
      console.error('Lỗi khi gọi API fetchUserGroup:', error);
      const sidebarGroup = document.querySelector('.sidebar-group');
      if (sidebarGroup) {
        sidebarGroup.textContent = 'Không thể tải thông tin nhóm';
      }
    }
  }
  
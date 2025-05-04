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
  (function() {
  // Tạo một namespace duy nhất để tránh xung đột
  const MODAL_PREFIX = 'custom-modal-';

  // Animation cho các thẻ
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });

  // Tạo và chèn CSS cho modal
  const style = document.createElement('style');
  style.textContent = `
    .${MODAL_PREFIX}modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      animation: ${MODAL_PREFIX}fadeIn 0.3s ease-out;
    }
    @keyframes ${MODAL_PREFIX}fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .${MODAL_PREFIX}modal-content {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px; width: 90%;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: ${MODAL_PREFIX}slideUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
      position: relative; overflow: hidden;
    }
    @keyframes ${MODAL_PREFIX}slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);  opacity: 1; }
    }
    .${MODAL_PREFIX}modal-header { margin-bottom: 20px; position: relative; }
    .${MODAL_PREFIX}modal-icon { width:80px; height:80px; margin:0 auto 15px;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);
      border-radius:50%; color:white; font-size:40px;
    }
    .${MODAL_PREFIX}modal-content h2 {
      margin:0 0 10px; font-size:28px; font-weight:700; color:#2d3748;
    }
    .${MODAL_PREFIX}modal-content p {
      margin:0 0 30px; color:#4a5568; font-size:16px; line-height:1.6;
    }
    .${MODAL_PREFIX}modal-actions { display:flex; gap:15px; justify-content:center; }
    .${MODAL_PREFIX}btn {
      padding:12px 30px; border-radius:8px; font-size:16px;
      font-weight:600; cursor:pointer; transition:all .3s; border:none;
    }
    .${MODAL_PREFIX}btn-primary {
      background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);
      color:white; box-shadow:0 4px 15px rgba(79,172,254,.3);
    }
    .${MODAL_PREFIX}btn-primary:hover {
      transform:translateY(-2px); box-shadow:0 6px 20px rgba(79,172,254,.4);
    }
    .${MODAL_PREFIX}btn-secondary {
      background:#f7fafc; color:#4a5568; border:1px solid #e2e8f0;
    }
    .${MODAL_PREFIX}btn-secondary:hover { background:#edf2f7; }
    .${MODAL_PREFIX}close-btn {
      position:absolute; top:15px; right:15px; width:36px; height:36px;
      border-radius:50%; background:#f7fafc; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .2s;
    }
    .${MODAL_PREFIX}close-btn:hover { background:#edf2f7; }
    .${MODAL_PREFIX}benefits-list {
      text-align:left; margin:0 auto 25px; max-width:350px;
    }
    .${MODAL_PREFIX}benefit-item {
      display:flex; align-items:center; margin-bottom:12px; color:#4a5568;
    }
    .${MODAL_PREFIX}benefit-item svg { margin-right:10px; color:#48bb78; min-width:20px; }
    @media (max-width:480px) {
      .${MODAL_PREFIX}modal-content { padding:25px; }
      .${MODAL_PREFIX}modal-content h2 { font-size:24px; }
      .${MODAL_PREFIX}modal-actions { flex-direction:column; gap:10px; }
      .${MODAL_PREFIX}btn { width:100%; }
    }
  `;
  document.head.appendChild(style);

  // Tạo và chèn HTML cho modal
  const modalOverlay = document.createElement('div');
  modalOverlay.className = `${MODAL_PREFIX}modal-overlay`;
  modalOverlay.innerHTML = `
    <div class="${MODAL_PREFIX}modal-content">
      <button class="${MODAL_PREFIX}close-btn" aria-label="Đóng">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12" stroke="#4A5568" stroke-width="2"/>
          <path d="M4 4L12 12" stroke="#4A5568" stroke-width="2"/>
        </svg>
      </button>
      <div class="${MODAL_PREFIX}modal-header">
        <div class="${MODAL_PREFIX}modal-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M17 21V19C17 17.94 16.58 16.92 15.83 16.17C15.08 15.42 14.06 15 13 15H5C3.94 15 2.92 15.42 2.17 16.17C1.42 16.92 1 17.94 1 19V21" stroke="white" stroke-width="2"/>
            <path d="M9 11C11.21 11 13 9.21 13 7C13 4.79 11.21 3 9 3C6.79 3 5 4.79 5 7C5 9.21 6.79 11 9 11Z" stroke="white" stroke-width="2"/>
          </svg>
        </div>
        <h2>Bạn chưa có nhóm</h2>
      </div>
      <div class="${MODAL_PREFIX}modal-header">
        <p>Kết nối với những người chung nhà</p>
      </div>
      <div class="${MODAL_PREFIX}benefits-list">
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Kết nối tức thì</span>
        </div>
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Thao tác mượt mà</span>
        </div>
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.ChromeExtension 33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Cộng đồng bền chặt</span>
        </div>
      </div>
      <div class="${MODAL_PREFIX}modal-actions">
        <button class="${MODAL_PREFIX}btn ${MODAL_PREFIX}btn-primary">Tham gia ngay</button>
        <button class="${MODAL_PREFIX}btn ${MODAL_PREFIX}btn-secondary">Tìm hiểu thêm</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);

  // Lấy các nút
  const closeBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}close-btn`);
  const joinBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}btn-primary`);
  const learnMoreBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}btn-secondary`);

  // Đóng modal
  closeBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) modalOverlay.style.display = 'none';
  });

  // Nhấn Tham gia ngay → chuyển /tao-nhom
  joinBtn.addEventListener('click', () => {
    window.location.href = '/tao-nhom';
  });

  // Nhấn Tìm hiểu thêm → chỉ đóng modal
  learnMoreBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });

  // Hàm kiểm tra và hiển thị modal nếu cần
  async function displayGroupName() {
    try {
      const userId = await checkSession();
      if (!userId) {
        console.log('Người dùng chưa đăng nhập');
        return;
      }
      const resp = await fetch(`/api/user_group?user_id=${userId}`);
      const data = await resp.json();

      if (resp.ok && data.group) {
        const el = document.querySelector('.highlight');
        if (el) el.textContent = data.group;
      } else {
        // Chưa tham gia hoặc chưa có nhóm → mở modal
        modalOverlay.style.display = 'flex';
      }
    } catch (err) {
      console.error('Lỗi khi hiển thị tên nhóm:', err);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  }

  document.addEventListener('DOMContentLoaded', displayGroupName);
})();
// hiển thị modal nếu chưa join nhóm nào
(function() {
  // Tạo một namespace duy nhất để tránh xung đột
  const MODAL_PREFIX = 'custom-modal-';

  // Animation cho các thẻ
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });

  // Tạo và chèn CSS cho modal
  const style = document.createElement('style');
  style.textContent = `
    .${MODAL_PREFIX}modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      animation: ${MODAL_PREFIX}fadeIn 0.3s ease-out;
    }
    @keyframes ${MODAL_PREFIX}fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .${MODAL_PREFIX}modal-content {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px; width: 90%;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: ${MODAL_PREFIX}slideUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
      position: relative; overflow: hidden;
    }
    @keyframes ${MODAL_PREFIX}slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);  opacity: 1; }
    }
    .${MODAL_PREFIX}modal-header { margin-bottom: 20px; position: relative; }
    .${MODAL_PREFIX}modal-icon { width:80px; height:80px; margin:0 auto 15px;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);
      border-radius:50%; color:white; font-size:40px;
    }
    .${MODAL_PREFIX}modal-content h2 {
      margin:0 0 10px; font-size:28px; font-weight:700; color:#2d3748;
    }
    .${MODAL_PREFIX}modal-content p {
      margin:0 0 30px; color:#4a5568; font-size:16px; line-height:1.6;
    }
    .${MODAL_PREFIX}modal-actions { display:flex; gap:15px; justify-content:center; }
    .${MODAL_PREFIX}btn {
      padding:12px 30px; border-radius:8px; font-size:16px;
      font-weight:600; cursor:pointer; transition:all .3s; border:none;
    }
    .${MODAL_PREFIX}btn-primary {
      background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);
      color:white; box-shadow:0 4px 15px rgba(79,172,254,.3);
    }
    .${MODAL_PREFIX}btn-primary:hover {
      transform:translateY(-2px); box-shadow:0 6px 20px rgba(79,172,254,.4);
    }
    .${MODAL_PREFIX}btn-secondary {
      background:#f7fafc; color:#4a5568; border:1px solid #e2e8f0;
    }
    .${MODAL_PREFIX}btn-secondary:hover { background:#edf2f7; }
    .${MODAL_PREFIX}close-btn {
      position:absolute; top:15px; right:15px; width:36px; height:36px;
      border-radius:50%; background:#f7fafc; border:none;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .2s;
    }
    .${MODAL_PREFIX}close-btn:hover { background:#edf2f7; }
    .${MODAL_PREFIX}benefits-list {
      text-align:left; margin:0 auto 25px; max-width:350px;
    }
    .${MODAL_PREFIX}benefit-item {
      display:flex; align-items:center; margin-bottom:12px; color:#4a5568;
    }
    .${MODAL_PREFIX}benefit-item svg { margin-right:10px; color:#48bb78; min-width:20px; }
    @media (max-width:480px) {
      .${MODAL_PREFIX}modal-content { padding:25px; }
      .${MODAL_PREFIX}modal-content h2 { font-size:24px; }
      .${MODAL_PREFIX}modal-actions { flex-direction:column; gap:10px; }
      .${MODAL_PREFIX}btn { width:100%; }
    }
  `;
  document.head.appendChild(style);

  // Tạo và chèn HTML cho modal
  const modalOverlay = document.createElement('div');
  modalOverlay.className = `${MODAL_PREFIX}modal-overlay`;
  modalOverlay.innerHTML = `
    <div class="${MODAL_PREFIX}modal-content">
      <button class="${MODAL_PREFIX}close-btn" aria-label="Đóng">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12" stroke="#4A5568" stroke-width="2"/>
          <path d="M4 4L12 12" stroke="#4A5568" stroke-width="2"/>
        </svg>
      </button>
      <div class="${MODAL_PREFIX}modal-header">
        <div class="${MODAL_PREFIX}modal-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M17 21V19C17 17.94 16.58 16.92 15.83 16.17C15.08 15.42 14.06 15 13 15H5C3.94 15 2.92 15.42 2.17 16.17C1.42 16.92 1 17.94 1 19V21" stroke="white" stroke-width="2"/>
            <path d="M9 11C11.21 11 13 9.21 13 7C13 4.79 11.21 3 9 3C6.79 3 5 4.79 5 7C5 9.21 6.79 11 9 11Z" stroke="white" stroke-width="2"/>
          </svg>
        </div>
        <h2>Bạn chưa có nhóm</h2>
      </div>
      <div class="${MODAL_PREFIX}modal-header">
        <p>Kết nối với những người chung nhà</p>
      </div>
      <div class="${MODAL_PREFIX}benefits-list">
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Kết nối tức thì</span>
        </div>
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Thao tác mượt mà</span>
        </div>
        <div class="${MODAL_PREFIX}benefit-item">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.67 5L7.5 14.17L3.ChromeExtension 33 10" stroke="#48BB78" stroke-width="2"/>
          </svg>
          <span>Cộng đồng bền chặt</span>
        </div>
      </div>
      <div class="${MODAL_PREFIX}modal-actions">
        <button class="${MODAL_PREFIX}btn ${MODAL_PREFIX}btn-primary">Tham gia ngay</button>
        <button class="${MODAL_PREFIX}btn ${MODAL_PREFIX}btn-secondary">Tìm hiểu thêm</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);

  // Lấy các nút
  const closeBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}close-btn`);
  const joinBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}btn-primary`);
  const learnMoreBtn = modalOverlay.querySelector(`.${MODAL_PREFIX}btn-secondary`);

  // Đóng modal
  closeBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) modalOverlay.style.display = 'none';
  });

  // Nhấn Tham gia ngay → chuyển /tao-nhom
  joinBtn.addEventListener('click', () => {
    window.location.href = '/tao-nhom';
  });

  // Nhấn Tìm hiểu thêm → chỉ đóng modal
  learnMoreBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });

  // Hàm kiểm tra và hiển thị modal nếu cần
  async function displayGroupName() {
    try {
      const userId = await checkSession();
      if (!userId) {
        console.log('Người dùng chưa đăng nhập');
        return;
      }
      const resp = await fetch(`/api/user_group?user_id=${userId}`);
      const data = await resp.json();

      if (resp.ok && data.group) {
        const el = document.querySelector('.highlight');
        if (el) el.textContent = data.group;
      } else {
        // Chưa tham gia hoặc chưa có nhóm → mở modal
        modalOverlay.style.display = 'flex';
      }
    } catch (err) {
      console.error('Lỗi khi hiển thị tên nhóm:', err);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  }

  document.addEventListener('DOMContentLoaded', displayGroupName);
})();
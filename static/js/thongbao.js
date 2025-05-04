let currentGroupId = 1;  // Replace with actual logic to set this value

document.addEventListener('DOMContentLoaded', function () {
    const announcementList = document.getElementById('announcement-list');
    const badge = document.querySelector('.badge');
    const titleInput = document.getElementById('announcement-title');
    const contentInput = document.getElementById('announcement-content');
    const prioritySelect = document.getElementById('announcement-priority');
    const currentMemberId = 1; // Nhập đúng ID thành viên hiện tại

    let announcements = [];

    // 1) Lấy thông báo từ API
    async function fetchAnnouncements() {
        const res = await fetch(`/api/announcements/${currentGroupId}`);
        announcements = await res.json();
        renderAnnouncements();
    }

    // 2) Hiển thị thông báo
    function renderAnnouncements() {
        announcementList.innerHTML = '';
        // Đếm chưa đọc
        const unread = announcements.filter(a => !a.readBy.includes(currentMemberId)).length;
        badge.textContent = unread;
        // Sắp xếp mới nhất trước
        announcements.forEach(a => {
            const isRead = a.readBy.includes(currentMemberId);
            const prioText = { high: 'Quan trọng', medium: 'Trung bình', low: 'Thấp' }[a.priority];
            const prioIcon = { high: 'fa-exclamation-circle', medium: 'fa-info-circle', low: 'fa-chevron-circle-down' }[a.priority];
            const item = document.createElement('div');
            item.className = 'announcement-item';
            item.innerHTML = `
        <div class="announcement-priority ${a.priority}">
            <i class="fas ${prioIcon}"></i> ${prioText}
        </div>
        <div class="announcement-title">${a.title}</div>
        <div class="announcement-meta">
            <span><i class="fas fa-user"></i> ${a.author_name}</span>
            <span><i class="fas fa-clock"></i> ${new Date(a.timestamp).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}</span>
        </div>
        <div class="announcement-content">${a.content}</div>
        <div class="announcement-actions">
            <button class="action-btn mark-read" onclick="markAsRead(${a.id})" ${isRead ? 'disabled' : ''}>
                <i class="fas fa-check"></i> ${isRead ? 'Đã đọc' : 'Đánh dấu đã đọc'}
            </button>
        </div>`;
            announcementList.appendChild(item);
        });
    }

    // 3) Đăng thông báo mới
    window.addAnnouncement = async function () {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const priority = prioritySelect.value;
        const group_id = sessionStorage.getItem('currentGroupId');
        const author_id = currentMemberId;  // Thêm author_id là ID của thành viên tạo thông báo

        if (!group_id) {
            return alert('Bạn chưa tham gia nhóm nào. Vui lòng chọn nhóm.');
        }

        if (!title || !content) {
            return alert('Vui lòng nhập tiêu đề và nội dung!');
        }

        await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, priority, group_id, author_id })
        });

        titleInput.value = '';
        contentInput.value = '';
        await fetchAnnouncements();
        alert('Thông báo đã được đăng!');
    }

    // 4) Đánh dấu đã đọc
    window.markAsRead = async function (id) {
        await fetch(`/api/announcements/${id}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: currentMemberId })
        });
        await fetchAnnouncements();
    }

    // Khởi tạo
    fetchAnnouncements();
});

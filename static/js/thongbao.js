document.addEventListener('DOMContentLoaded', function () {
    const announcementList = document.getElementById('announcement-list');
    const badge = document.querySelector('.badge');
    const titleInput = document.getElementById('announcement-title');
    const contentInput = document.getElementById('announcement-content');
    const prioritySelect = document.getElementById('announcement-priority');
    const currentMemberId = 1; // Thay bằng logic lấy member_id từ session hoặc API

    let announcements = [];

    // Lấy group_id từ sessionStorage hoặc API
    async function getCurrentGroupId() {
        let groupId = sessionStorage.getItem('currentGroupId');
        if (!groupId) {
            // Gọi API để lấy nhóm hiện tại của người dùng
            try {
                const res = await fetch('/api/user/current-group', {
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.group_id) {
                    groupId = data.group_id;
                    sessionStorage.setItem('currentGroupId', groupId);
                } else {
                    throw new Error('No group found');
                }
            } catch (error) {
                console.error('Error fetching current group:', error);
                alert('Bạn chưa tham gia nhóm nào. Vui lòng tham gia một nhóm.');
                return null;
            }
        }
        return groupId;
    }

    // Lấy thông báo từ API
    async function fetchAnnouncements() {
        const groupId = await getCurrentGroupId();
        if (!groupId) return;

        try {
            const res = await fetch(`/api/announcements/${groupId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch announcements');
            }
            announcements = await res.json();
            renderAnnouncements();
        } catch (error) {
            console.error('Error fetching announcements:', error);
            alert('Không thể tải thông báo. Vui lòng thử lại.');
        }
    }

    // Hiển thị thông báo (giữ nguyên logic cũ)
    function renderAnnouncements() {
        announcementList.innerHTML = '';
        const unread = announcements.filter(a => !a.readBy.includes(currentMemberId)).length;
        badge.textContent = unread;
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

    // Đăng thông báo mới
    window.addAnnouncement = async function () {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const priority = prioritySelect.value;
        const groupId = await getCurrentGroupId();
        const author_id = currentMemberId;

        if (!groupId) {
            return; // Thông báo lỗi đã được hiển thị trong getCurrentGroupId
        }

        if (!title || !content) {
            return alert('Vui lòng nhập tiêu đề và nội dung!');
        }

        try {
            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, priority, group_id: groupId, author_id })
            });
            if (!res.ok) {
                throw new Error('Failed to create announcement');
            }
            titleInput.value = '';
            contentInput.value = '';
            await fetchAnnouncements();
            alert('Thông báo đã được đăng!');
        } catch (error) {
            console.error('Error creating announcement:', error);
            alert('Không thể đăng thông báo. Vui lòng thử lại.');
        }
    }

    // Đánh dấu đã đọc
    window.markAsRead = async function (id) {
        try {
            await fetch(`/api/announcements/${id}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: currentMemberId })
            });
            await fetchAnnouncements();
        } catch (error) {
            console.error('Error marking as read:', error);
            alert('Không thể đánh dấu đã đọc. Vui lòng thử lại.');
        }
    }

    // Khởi tạo
    fetchAnnouncements();
});
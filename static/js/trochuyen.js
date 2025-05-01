// trochuyen.js
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const searchMessagesBtn = document.getElementById('searchMessagesBtn');
    const chatInfoBtn = document.getElementById('chatInfoBtn');
    const moreActionsBtn = document.getElementById('moreActionsBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const muteChatBtn = document.getElementById('muteChatBtn');
    const addMembersBtn = document.getElementById('addMembersBtn');
    const leaveGroupBtn = document.getElementById('leaveGroupBtn');
    const reportBtn = document.getElementById('reportBtn');

    // API base URL
    const API_BASE_URL = '/api';

    // Hàm lấy token xác thực
    function getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    // Hàm gửi yêu cầu API với token
    async function apiRequest(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
        const options = { method, headers };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
    }

    // Tạo modal tìm kiếm
    const searchModal = document.createElement('div');
    searchModal.className = 'search-modal';
    searchModal.innerHTML = `
        <div class="search-container">
            <div class="search-header">
                <h3>Tìm kiếm tin nhắn</h3>
                <button class="close-search">×</button>
            </div>
            <div class="search-input-container">
                <input type="text" placeholder="Nhập từ khóa tìm kiếm..." id="searchMessageInput">
            </div>
            <div class="search-results" id="searchResults">
                <!-- Kết quả tìm kiếm sẽ hiển thị ở đây -->
            </div>
        </div>
    `;
    document.body.appendChild(searchModal);

    // Tạo modal thông tin
    const infoModal = document.createElement('div');
    infoModal.className = 'info-modal';
    infoModal.innerHTML = `
        <div class="info-container">
            <div class="info-header">
                <h3>Thông tin trò chuyện</h3>
                <button class="close-info">×</button>
            </div>
            <div class="info-content" id="infoContent">
                <!-- Nội dung thông tin sẽ hiển thị ở đây -->
            </div>
        </div>
    `;
    document.body.appendChild(infoModal);

    // Xử lý sự kiện click nút tìm kiếm
    searchMessagesBtn.addEventListener('click', function() {
        searchModal.style.display = 'flex';
        document.getElementById('searchMessageInput').focus();
    });

    // Xử lý sự kiện click nút thông tin
    chatInfoBtn.addEventListener('click', async function() {
        if (!selectedChat) return;

        try {
            const conversation = await apiRequest(`/conversations/${selectedChat}`);
            let infoHTML = '';

            if (conversation.is_group) {
                const members = await apiRequest(`/groups/${conversation.group_id}/members`);
                infoHTML = `
                    <div class="info-group">
                        <div class="info-group-title">Thông tin nhóm</div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <div class="info-item-content">
                                <div class="info-item-title">${conversation.group_name}</div>
                                <div class="info-item-desc">${members.length} thành viên</div>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div class="info-item-content">
                                <div class="info-item-title">Ngày tạo</div>
                                <div class="info-item-desc">${new Date(conversation.created_at).toLocaleDateString('vi-VN')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="info-group">
                        <div class="info-group-title">Thành viên</div>
                        ${members.map(member => `
                            <div class="info-item">
                                <div class="member-avatar small">${member.avatar || member.full_name.slice(0, 2)}</div>
                                <div class="info-item-content">
                                    <div class="info-item-title">${member.full_name}</div>
                                    <div class="info-item-desc">${member.is_online ? 'Đang hoạt động' : 'Offline'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                const participant = await apiRequest(`/users/${conversation.participants.find(p => p.id !== currentUser.id).id}`);
                infoHTML = `
                    <div class="info-group">
                        <div class="info-group-title">Thông tin cá nhân</div>
                        <div class="info-item">
                            <div class="member-avatar large">${participant.avatar || participant.full_name.slice(0, 2)}</div>
                            <div class="info-item-content">
                                <div class="info-item-title">${participant.full_name}</div>
                                <div class="info-item-desc">${participant.is_online ? 'Đang hoạt động' : 'Offline'}</div>
                            </div>
                        </div>
                    </div>
                    <div class="info-group">
                        <div class="info-group-title">Thông tin liên hệ</div>
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <div class="info-item-content">
                                <div class="info-item-title">Số điện thoại</div>
                                <div class="info-item-desc">${participant.phone || 'Không có'}</div>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-envelope"></i>
                            <div class="info-item-content">
                                <div class="info-item-title">Email</div>
                                <div class="info-item-desc">${participant.email}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            document.getElementById('infoContent').innerHTML = infoHTML;
            infoModal.style.display = 'flex';
        } catch (error) {
            alert('Lỗi khi lấy thông tin trò chuyện: ' + error.message);
        }
    });

    // Xử lý sự kiện click nút đóng modal
    document.querySelector('.close-search').addEventListener('click', function() {
        searchModal.style.display = 'none';
    });

    document.querySelector('.close-info').addEventListener('click', function() {
        infoModal.style.display = 'none';
    });

    searchModal.addEventListener('click', function(e) {
        if (e.target === searchModal) {
            searchModal.style.display = 'none';
        }
    });

    infoModal.addEventListener('click', function(e) {
        if (e.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });

    // Xử lý tìm kiếm tin nhắn
    document.getElementById('searchMessageInput').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const resultsContainer = document.getElementById('searchResults');

        if (!searchTerm) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-light);">Nhập từ khóa để tìm kiếm tin nhắn</div>';
            return;
        }

        if (!selectedChat) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-light);">Không có cuộc trò chuyện nào được chọn</div>';
            return;
        }

        const foundMessages = messages[selectedChat]?.filter(msg => 
            msg.content.toLowerCase().includes(searchTerm)
        ) || [];

        if (foundMessages.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-light);">Không tìm thấy tin nhắn phù hợp</div>';
            return;
        }

        resultsContainer.innerHTML = foundMessages.map(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const time = formatTime(new Date(msg.timestamp));
            return `
                <div class="search-result-item" data-id="${msg.id}">
                    <div style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem;">
                        ${isSent ? 'Bạn' : msg.sender_name} • ${time}
                    </div>
                    <div>${highlightSearchTerm(msg.content, searchTerm)}</div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const messageId = this.getAttribute('data-id');
                scrollToMessage(messageId);
                searchModal.style.display = 'none';
            });
        });
    });

    // Hàm highlight từ khóa tìm kiếm
    function highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(term, 'gi');
        return text.replace(regex, match => `<span style="background-color: rgba(255, 109, 40, 0.3);">${match}</span>`);
    }

    // Hàm cuộn đến tin nhắn cụ thể
    function scrollToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.style.animation = 'highlight 1.5s';
            setTimeout(() => {
                messageElement.style.animation = '';
            }, 1500);
        }
    }

    // Thêm CSS cho highlight
    const style = document.createElement('style');
    style.textContent = `
        @keyframes highlight {
            0% { background-color: rgba(255, 109, 40, 0); }
            50% { background-color: rgba(255, 109, 40, 0.2); }
            100% { background-color: rgba(255, 109, 40, 0); }
        }
        .member-avatar.small {
            width: 32px;
            height: 32px;
            font-size: 0.9rem;
            margin-right: 0.75rem;
        }
        .member-avatar.large {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
            margin-right: 1rem;
        }
    `;
    document.head.appendChild(style);

    // Xử lý các tùy chọn trong dropdown menu
    clearChatBtn.addEventListener('click', async function() {
        if (!selectedChat) return;
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?')) {
            try {
                await apiRequest(`/conversations/${selectedChat}`, 'DELETE');
                messages[selectedChat] = [];
                renderMessages();
                const conversation = conversations.find(c => c.id === selectedChat);
                conversation.unread_count = 0;
                renderMemberList();
            } catch (error) {
                alert('Lỗi khi xóa trò chuyện: ' + error.message);
            }
        }
    });

    muteChatBtn.addEventListener('click', async function() {
        if (!selectedChat) return;
        try {
            const conversation = conversations.find(c => c.id === selectedChat);
            const isMuted = !conversation.is_muted;
            await apiRequest(`/notifications/${conversation.id}`, 'PUT', { is_muted: isMuted });
            conversation.is_muted = isMuted;
            alert(`Đã ${isMuted ? 'tắt' : 'bật'} thông báo cho cuộc trò chuyện`);
        } catch (error) {
            alert('Lỗi khi cập nhật thông báo: ' + error.message);
        }
    });

    addMembersBtn.addEventListener('click', function() {
        if (!selectedChat) return;
        const conversation = conversations.find(c => c.id === selectedChat);
        if (conversation.is_group) {
            alert('Chức năng thêm thành viên vào nhóm sẽ được mở sau');
        } else {
            alert('Chỉ có thể thêm thành viên vào nhóm trò chuyện');
        }
    });

    leaveGroupBtn.addEventListener('click', async function() {
        if (!selectedChat) return;
        const conversation = conversations.find(c => c.id === selectedChat);
        if (conversation.is_group) {
            if (confirm(`Bạn có chắc chắn muốn rời nhóm ${conversation.group_name}?`)) {
                try {
                    await apiRequest(`/groups/${conversation.group_id}/members/${currentUser.id}`, 'DELETE');
                    alert('Bạn đã rời khỏi nhóm thành công');
                    conversations = conversations.filter(c => c.id !== selectedChat);
                    selectedChat = null;
                    renderMemberList();
                    renderMessages();
                } catch (error) {
                    alert('Lỗi khi rời nhóm: ' + error.message);
                }
            }
        } else {
            alert('Chỉ có thể rời khỏi nhóm trò chuyện');
        }
    });

    reportBtn.addEventListener('click', function() {
        if (!selectedChat) return;
        const conversation = conversations.find(c => c.id === selectedChat);
        const reportReason = prompt(`Nhập lý do báo cáo ${conversation.group_name || conversation.participants[0].full_name}:`);
        if (reportReason) {
            alert(`Đã gửi báo cáo với lý do: ${reportReason}`);
            // Có thể gửi yêu cầu API để báo cáo nếu backend hỗ trợ
        }
    });
});

// app.js
document.addEventListener('DOMContentLoaded', function() {
    // Auto-resize textarea
    const messageInput = document.getElementById('messageInput');
    
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        document.getElementById('sendMessage').disabled = this.value.trim() === '';
    });

    // Chat page functionality
    const searchMembers = document.getElementById('searchMembers');
    const memberList = document.getElementById('memberList');
    const chatTitleContainer = document.getElementById('chatTitleContainer');
    const chatAvatar = document.getElementById('chatAvatar');
    const chatTitle = document.getElementById('chatTitle');
    const chatSubtitle = document.getElementById('chatSubtitle');
    const chatMessages = document.getElementById('chatMessages');
    const sendMessage = document.getElementById('sendMessage');

    // API base URL
    const API_BASE_URL = '/api';

    // Hàm lấy token xác thực
    function getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    // Hàm gửi yêu cầu API với token
    async function apiRequest(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
        const options = { method, headers };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
    }

    // Dữ liệu động
    let currentUser = null;
    let selectedChat = null;
    let conversations = [];
    let messages = {};

    // Lấy thông tin người dùng hiện tại
    async function fetchCurrentUser() {
        try {
            const response = await fetch('/check_session');
            if (!response.ok) throw new Error("Không có session hợp lệ");
    
            const user = await response.json();
            currentUser = {
                id: user.id,
                name: user.full_name,
                avatar: user.avatar || user.full_name.slice(0, 2)
            };
            console.log("Người dùng hiện tại:", currentUser);
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            alert('Vui lòng đăng nhập lại');
            // Redirect về trang login nếu muốn:
            // window.location.href = '/login.html';
        }
    }
    
    // Lấy danh sách cuộc trò chuyện
    async function fetchConversations() {
        try {
            const response = await apiRequest(`/conversations?user_id=${currentUser.id}`);
            conversations = response.conversations.map(conv => ({
                id: conv.id,
                name: conv.is_group ? conv.group_name : conv.participants.find(p => p.id !== currentUser.id).full_name,
                avatar: conv.is_group ? 'GC' : conv.participants.find(p => p.id !== currentUser.id).full_name.slice(0, 2),
                is_group: conv.is_group,
                group_id: conv.group_id,
                unread_count: conv.unread_count || 0,
                participants: conv.participants || [],
                is_muted: conv.is_muted || false
            }));
            renderMemberList();
        } catch (error) {
            console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
        }
    }

    // Lấy tin nhắn cho cuộc trò chuyện
    async function fetchMessages(conversationId) {
        try {
            const response = await apiRequest(`/conversations/${conversationId}/messages?user_id=${currentUser.id}`);
            messages[conversationId] = response.messages.map(msg => ({
                id: msg.id,
                sender_id: msg.sender_id,
                sender_name: msg.sender_name,
                content: msg.content,
                timestamp: msg.timestamp,
                is_read: msg.is_read
            }));
            renderMessages();
        } catch (error) {
            console.error('Lỗi khi lấy tin nhắn:', error);
        }
    }

    // Gửi tin nhắn mới
    async function sendNewMessage() {
        const content = messageInput.value.trim();
        if (content && selectedChat) {
            try {
                const response = await apiRequest(`/conversations/${selectedChat}/messages`, 'POST', {
                    sender_id: currentUser.id,
                    content
                });
                messages[selectedChat].push({
                    id: response.message_id,
                    sender_id: currentUser.id,
                    sender_name: currentUser.name,
                    content: response.content,
                    timestamp: new Date().toISOString(),
                    is_read: false
                });
                messageInput.value = '';
                messageInput.style.height = 'auto';
                sendMessage.disabled = true;
                renderMessages();
                await fetchConversations(); // Cập nhật danh sách cuộc trò chuyện
            } catch (error) {
                alert('Lỗi khi gửi tin nhắn: ' + error.message);
            }
        }
    }

    function renderMemberList() {
        const searchTerm = searchMembers.value.toLowerCase();
        memberList.innerHTML = '';

        conversations
            .filter(conv => conv.name.toLowerCase().includes(searchTerm))
            .forEach(conv => {
                const memberItem = document.createElement('div');
                memberItem.className = `member-item ${selectedChat === conv.id ? 'active' : ''}`;
                memberItem.dataset.id = conv.id;
                memberItem.innerHTML = `
                    <div class="member-avatar">${conv.avatar}</div>
                    <div class="member-info">
                        <div class="member-name">${conv.name}</div>
                        <div class="member-last-msg">${conv.last_message || 'Bắt đầu trò chuyện'}</div>
                    </div>
                    <div class="member-meta">
                        <div class="member-time">${conv.last_message_time || ''}</div>
                        ${conv.unread_count > 0 ? `<div class="member-badge">${conv.unread_count}</div>` : ''}
                    </div>
                `;
                memberItem.addEventListener('click', async () => {
                    selectedChat = conv.id;
                    chatAvatar.textContent = conv.avatar;
                    chatTitle.textContent = conv.name;
                    chatSubtitle.textContent = conv.is_group ? `${conv.participants.length} thành viên` : (conv.participants.find(p => p.id !== currentUser.id)?.is_online ? 'Đang hoạt động' : 'Offline');
                    await fetchMessages(conv.id);
                    renderMemberList();
                    messageInput.focus();
                });
                memberList.appendChild(memberItem);
            });
    }

    function renderMessages() {
        if (!selectedChat) {
            chatMessages.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-comment-dots"></i>
                    </div>
                    <h3 class="empty-title">Chưa có cuộc trò chuyện nào được chọn</h3>
                    <p class="empty-text">Chọn một thành viên từ danh sách bên trái để bắt đầu trò chuyện hoặc tạo nhóm mới</p>
                </div>
            `;
            return;
        }

        chatMessages.innerHTML = '';
        const chatMessagesList = messages[selectedChat] || [];
        let currentDate = null;

        if (chatMessagesList.length === 0) {
            chatMessages.innerHTML = `
                <div class="empty-state" style="height: 100%; justify-content: center;">
                    <div class="empty-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3 class="empty-title">Bắt đầu cuộc trò chuyện với ${conversations.find(c => c.id === selectedChat).name}</h3>
                    <p class="empty-text">Gửi tin nhắn đầu tiên để bắt đầu trò chuyện</p>
                </div>
            `;
            return;
        }

        chatMessagesList.forEach((msg, index) => {
            const messageDate = new Date(msg.timestamp);
            const messageDay = messageDate.toDateString();

            if (!currentDate || currentDate !== messageDay) {
                currentDate = messageDay;
                const dateDiv = document.createElement('div');
                dateDiv.className = 'message-date';
                dateDiv.innerHTML = `<span>${formatDate(messageDate)}</span>`;
                chatMessages.appendChild(dateDiv);
            }

            const isSent = msg.sender_id === currentUser.id;
            const message = document.createElement('div');
            message.className = `message ${isSent ? 'sent' : 'received'} fade-in`;
            message.dataset.messageId = msg.id;
            message.style.animationDelay = `${index * 0.05}s`;

            let statusIcon = '';
            if (isSent) {
                statusIcon = msg.is_read 
                    ? '<i class="fas fa-check-double message-status" title="Đã xem"></i>' 
                    : '<i class="fas fa-check message-status" title="Đã gửi"></i>';
            }

            message.innerHTML = `
                ${!isSent ? `<div class="message-sender">${msg.sender_name}</div>` : ''}
                <div>${msg.content}</div>
                <div class="message-timestamp">
                    ${formatTime(messageDate)}
                    ${statusIcon}
                </div>
            `;
            chatMessages.appendChild(message);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hôm nay';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Hôm qua';
        } else {
            return date.toLocaleDateString('vi-VN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'numeric' 
            });
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Event listeners
    searchMembers.addEventListener('input', renderMemberList);

    sendMessage.addEventListener('click', sendNewMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNewMessage();
        }
    });

    // Khởi tạo
    async function init() {
        await fetchCurrentUser();
        await fetchConversations();
        if (memberList.firstChild) {
            memberList.firstChild.click();
        }
    }

    init();
});
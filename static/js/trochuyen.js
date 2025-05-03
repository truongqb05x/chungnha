document.addEventListener('DOMContentLoaded', function() {
    console.log('[app.js] DOMContentLoaded');

    // DOM elements
    const messageInput = document.getElementById('messageInput');
    const searchMembers = document.getElementById('searchMembers');
    const memberList = document.getElementById('memberList');
    const chatTitleContainer = document.getElementById('chatTitleContainer');
    const chatAvatar = document.getElementById('chatAvatar');
    const chatTitle = document.getElementById('chatTitle');
    const chatSubtitle = document.getElementById('chatSubtitle');
    const chatMessages = document.getElementById('chatMessages');
    const sendMessage = document.getElementById('sendMessage');
    const errorMessage = document.getElementById('errorMessage');

    if (!memberList || !chatMessages) {
        console.error('[app.js] Missing DOM elements:', { memberList, chatMessages });
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Lỗi giao diện: Thiếu thành phần chính';
        return;
    }

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendMessage.disabled = this.value.trim() === '';
    });

    // API base URL
    const API_BASE_URL = '/api';

    // Hàm lấy token xác thực
    function getAuthToken() {
        const token = localStorage.getItem('authToken') || '';
        console.log('[getAuthToken] Token:', token ? 'Found' : 'Not found');
        return token;
    }

    // Hàm gửi yêu cầu API với token
    async function apiRequest(endpoint, method = 'GET', data = null) {
        console.log('[apiRequest] Requesting:', endpoint, { method, data });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
        const options = { method, headers };
        if (data) {
            options.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            console.log('[apiRequest] Response status:', response.status);
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText} (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error('[apiRequest] Error:', error.message);
            throw error;
        }
    }

    // Dữ liệu động
    let currentUser = null;
    let selectedChat = null;
    let conversations = [];
    let messages = {};

    // Lấy thông tin người dùng hiện tại
    async function fetchCurrentUser() {
        console.log('[fetchCurrentUser] Fetching current user');
        try {
            const response = await fetch('/check_session');
            console.log('[fetchCurrentUser] Response status:', response.status);
            if (!response.ok) throw new Error("Không có session hợp lệ");
            const user = await response.json();
            currentUser = {
                id: user.id,
                name: user.full_name,
                avatar: user.avatar || user.full_name.slice(0, 2)
            };
            console.log('[fetchCurrentUser] Current user:', currentUser);
        } catch (error) {
            console.error('[fetchCurrentUser] Error:', error.message);
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Lỗi khi lấy thông tin người dùng. Vui lòng đăng nhập lại.';
            throw error;
        }
    }

    // Lấy danh sách cuộc trò chuyện
    async function fetchConversations() {
        console.log('[fetchConversations] Fetching conversations for user:', currentUser?.id);
        if (!currentUser) {
            console.error('[fetchConversations] No current user');
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Không tìm thấy thông tin người dùng';
            return;
        }
        try {
            const response = await apiRequest(`/conversations?user_id=${currentUser.id}`);
            console.log('[fetchConversations] API response:', response);
            if (!response.conversations || !Array.isArray(response.conversations)) {
                console.error('[fetchConversations] Invalid response format:', response);
                throw new Error('Invalid API response format');
            }
            conversations = await Promise.all(response.conversations.map(async conv => {
                console.log('[fetchConversations] Processing conversation:', conv.id);
                const conversation = {
                    id: conv.id,
                    name: conv.is_group ? conv.group_name : conv.participants.find(p => p.id !== currentUser.id)?.full_name || 'Unknown',
                    avatar: conv.is_group ? 'GC' : conv.participants.find(p => p.id !== currentUser.id)?.avatar || 'U',
                    is_group: conv.is_group,
                    group_id: conv.group_id,
                    unread_count: conv.unread_count || 0,
                    participants: conv.participants || [],
                    is_muted: conv.is_muted || false,
                    last_message: conv.last_message ? {
                        id: conv.last_message.id,
                        content: conv.last_message.content,
                        timestamp: conv.last_message.timestamp,
                        sender_name: conv.last_message.sender_name
                    } : null
                };
                // Lấy danh sách thành viên trong nhóm
                if (conv.is_group && conv.group_id) {
                    try {
                        const groupMembers = await apiRequest(`/groups/${conv.group_id}/members`);
                        conversation.members = groupMembers.members.filter(member => member.id !== currentUser.id);
                        console.log('[fetchConversations] Group members for', conv.group_id, ':', conversation.members);
                    } catch (error) {
                        console.error('[fetchConversations] Error fetching group members:', error.message);
                        conversation.members = [];
                    }
                }
                return conversation;
            }));

            // Sắp xếp: nhóm chat trước, sau đó là cuộc trò chuyện cá nhân
            conversations.sort((a, b) => {
                if (a.is_group && !b.is_group) return -1;
                if (!a.is_group && b.is_group) return 1;
                return 0;
            });

            console.log('[fetchConversations] Sorted conversations:', conversations);
            renderMemberList();
        } catch (error) {
            console.error('[fetchConversations] Error:', error.message);
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Lỗi khi tải danh sách trò chuyện: ' + error.message;
        }
    }

    // Hàm làm mới danh sách cuộc trò chuyện
    async function refreshConversations() {
        console.log('[refreshConversations] Refreshing conversations');
        await fetchConversations();
        if (conversations.length > 0 && !selectedChat) {
            console.log('[refreshConversations] Auto-selecting first conversation');
            const firstConversation = memberList.querySelector('.member-item');
            if (firstConversation) {
                firstConversation.click();
            }
        }
    }

    // Lấy tin nhắn cho cuộc trò chuyện
    async function fetchMessages(conversationId) {
        console.log('[fetchMessages] Fetching messages for conversation:', conversationId);
        try {
            const response = await apiRequest(`/conversations/${conversationId}/messages?user_id=${currentUser.id}`);
            console.log('[fetchMessages] API response:', response);
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
            console.error('[fetchMessages] Error:', error.message);
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Lỗi khi tải tin nhắn: ' + error.message;
        }
    }

    // Gửi tin nhắn mới
    async function sendNewMessage() {
        const content = messageInput.value.trim();
        console.log('[sendNewMessage] Sending message:', { content, selectedChat });
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
                await fetchConversations();
            } catch (error) {
                console.error('[sendNewMessage] Error:', error.message);
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Lỗi khi gửi tin nhắn: ' + error.message;
            }
        }
    }

    function renderMemberList() {
        console.log('[renderMemberList] Rendering conversations:', conversations);
        const searchTerm = searchMembers.value.toLowerCase();
        memberList.innerHTML = '';

        if (conversations.length === 0) {
            memberList.innerHTML = '<div style="padding: 10px; text-align: center;">Không có cuộc trò chuyện nào</div>';
            console.log('[renderMemberList] No conversations to render');
            return;
        }

        conversations.forEach(conv => {
            // Hiển thị nhóm chat
            if (conv.is_group) {
                const memberItem = document.createElement('div');
                memberItem.className = `member-item ${selectedChat === conv.id ? 'active' : ''}`;
                memberItem.dataset.id = conv.id;
                memberItem.innerHTML = `
                    <div class="member-avatar">${conv.avatar}</div>
                    <div class="member-info">
                        <div class="member-name">${conv.name}</div>
                        <div class="member-last-msg">${conv.last_message?.content || 'Bắt đầu trò chuyện'}</div>
                    </div>
                    <div class="member-meta">
                        <div class="member-time">${conv.last_message ? formatTime(new Date(conv.last_message.timestamp)) : ''}</div>
                        ${conv.unread_count > 0 ? `<div class="member-badge">${conv.unread_count}</div>` : ''}
                    </div>
                `;
                memberItem.addEventListener('click', async () => {
                    console.log('[renderMemberList] Group chat clicked:', conv.id);
                    selectedChat = conv.id;
                    chatAvatar.textContent = conv.avatar;
                    chatTitle.textContent = conv.name;
                    chatSubtitle.textContent = `${conv.participants.length} thành viên`;
                    await fetchMessages(conv.id);
                    renderMemberList();
                    messageInput.focus();
                });
                memberList.appendChild(memberItem);
            }

            // Hiển thị cuộc trò chuyện cá nhân với các thành viên trong nhóm
            if (conv.is_group && conv.members) {
                conv.members.forEach(member => {
                    const memberItem = document.createElement('div');
                    memberItem.className = `member-item ${selectedChat === `${conv.id}-${member.id}` ? 'active' : ''}`;
                    memberItem.dataset.id = `${conv.id}-${member.id}`;
                    memberItem.innerHTML = `
                        <div class="member-avatar">${member.avatar || member.full_name.slice(0, 2)}</div>
                        <div class="member-info">
                            <div class="member-name">${member.full_name}</div>
                            <div class="member-last-msg">${conv.last_message?.content || 'Bắt đầu trò chuyện'}</div>
                        </div>
                        <div class="member-meta">
                            <div class="member-time">${conv.last_message ? formatTime(new Date(conv.last_message.timestamp)) : ''}</div>
                            ${conv.unread_count > 0 ? `<div class="member-badge">${conv.unread_count}</div>` : ''}
                        </div>
                    `;
                    memberItem.addEventListener('click', async () => {
                        console.log('[renderMemberList] Member chat clicked:', member.id);
                        selectedChat = `${conv.id}-${member.id}`;
                        chatAvatar.textContent = member.avatar || member.full_name.slice(0, 2);
                        chatTitle.textContent = member.full_name;
                        chatSubtitle.textContent = member.is_online ? 'Đang hoạt động' : 'Offline';
                        const existingConv = conversations.find(c => !c.is_group && c.participants.some(p => p.id === member.id));
                        if (existingConv) {
                            selectedChat = existingConv.id;
                            await fetchMessages(existingConv.id);
                        } else {
                            try {
                                const response = await apiRequest('/conversations', 'POST', {
                                    is_group: false,
                                    participants: [currentUser.id, member.id]
                                });
                                conversations.push({
                                    id: response.conversation_id,
                                    name: member.full_name,
                                    avatar: member.avatar || member.full_name.slice(0, 2),
                                    is_group: false,
                                    participants: [
                                        { id: currentUser.id, full_name: currentUser.name, avatar: currentUser.avatar },
                                        member
                                    ],
                                    unread_count: 0,
                                    is_muted: false
                                });
                                selectedChat = response.conversation_id;
                                messages[selectedChat] = [];
                                renderMessages();
                            } catch (error) {
                                console.error('[renderMemberList] Error creating conversation:', error.message);
                                errorMessage.style.display = 'block';
                                errorMessage.textContent = 'Lỗi khi tạo cuộc trò chuyện: ' + error.message;
                            }
                        }
                        renderMemberList();
                        messageInput.focus();
                    });
                    memberList.appendChild(memberItem);
                });
            }
        });
    }

    function renderMessages() {
        console.log('[renderMessages] Rendering messages for chat:', selectedChat);
        if (!selectedChat) {
            chatMessages.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-comment-dots"></i>
                    </div>
                    <h3 class="empty-title">Chưa có cuộc trò chuyện nào được chọn</h3>
                    <p class="empty-text">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu trò chuyện hoặc tạo nhóm mới</p>
                </div>
            `;
            return;
        }

        chatMessages.innerHTML = '';
        const chatMessagesList = messages[selectedChat] || [];
        let currentDate = null;

        if (chatMessagesList.length === 0) {
            const conv = conversations.find(c => c.id === selectedChat);
            chatMessages.innerHTML = `
                <div class="empty-state" style="height: 100%; justify-content: center;">
                    <div class="empty-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3 class="empty-title">Bắt đầu cuộc trò chuyện với ${conv ? conv.name : 'người dùng'}</h3>
                    <p class="empty-text">Gửi tin nhắn đầu tiên để bắt đầu trò chuyện</p>
                </div>
            `;
            console.log('[renderMessages] No messages to render');
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
        console.log('[renderMessages] Messages rendered:', chatMessagesList.length);
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
    searchMembers.addEventListener('input', () => {
        console.log('[searchMembers] Search term:', searchMembers.value);
        renderMemberList();
    });

    sendMessage.addEventListener('click', sendNewMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNewMessage();
        }
    });

    // Khởi tạo
    async function init() {
        console.log('[init] Initializing app');
        try {
            await fetchCurrentUser();
            await refreshConversations();
        } catch (error) {
            console.error('[init] Initialization error:', error.message);
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Lỗi khởi tạo ứng dụng: ' + error.message;
        }
    }

    init();
});document.addEventListener('DOMContentLoaded', function() {
    console.log('[trochuyen.js] DOMContentLoaded');

    const searchMessagesBtn = document.getElementById('searchMessagesBtn');
    const chatInfoBtn = document.getElementById('chatInfoBtn');
    const moreActionsBtn = document.getElementById('moreActionsBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const muteChatBtn = document.getElementById('muteChatBtn');
    const addMembersBtn = document.getElementById('addMembersBtn');
    const leaveGroupBtn = document.getElementById('leaveGroupBtn');
    const reportBtn = document.getElementById('reportBtn');

    if (!searchMessagesBtn || !chatInfoBtn || !addMembersBtn) {
        console.error('[trochuyen.js] Missing DOM elements:', { searchMessagesBtn, chatInfoBtn, addMembersBtn });
        return;
    }

    const API_BASE_URL = '/api';

    function getAuthToken() {
        const token = localStorage.getItem('authToken') || '';
        console.log('[getAuthToken] Token:', token ? 'Found' : 'Not found');
        return token;
    }

    async function apiRequest(endpoint, method = 'GET', data = null) {
        console.log('[apiRequest] Requesting:', endpoint, { method, data });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
        const options = { method, headers };
        if (data) {
            options.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            console.log('[apiRequest] Response status:', response.status);
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText} (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error('[apiRequest] Error:', error.message);
            throw error;
        }
    }

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

    searchMessagesBtn.addEventListener('click', function() {
        console.log('[searchMessagesBtn] Clicked');
        searchModal.style.display = 'flex';
        document.getElementById('searchMessageInput').focus();
    });

    chatInfoBtn.addEventListener('click', async function() {
        console.log('[chatInfoBtn] Clicked, selectedChat:', selectedChat);
        if (!selectedChat) {
            console.warn('[chatInfoBtn] No chat selected');
            return;
        }

        try {
            let conversation = conversations.find(c => c.id === selectedChat);
            if (!conversation) {
                const [groupId, userId] = selectedChat.split('-');
                conversation = conversations.find(c => c.group_id === parseInt(groupId));
                if (!conversation) {
                    throw new Error('Không tìm thấy cuộc trò chuyện');
                }
                const member = conversation.members.find(m => m.id === parseInt(userId));
                conversation = {
                    is_group: false,
                    participants: [
                        { id: currentUser.id, full_name: currentUser.name, avatar: currentUser.avatar },
                        member
                    ],
                    created_at: new Date().toISOString()
                };
            }

            let infoHTML = '';
            if (conversation.is_group) {
                const members = await apiRequest(`/groups/${conversation.group_id}/members`);
                console.log('[chatInfoBtn] Group members:', members);
                infoHTML = `
                    <div class="info-group">
                        <div class="info-group-title">Thông tin nhóm</div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <div class="info-item-content">
                                <div class="info-item-title">${conversation.group_name}</div>
                                <div class="info-item-desc">${members.members.length} thành viên</div>
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
                        ${members.members.map(member => `
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
                const participant = conversation.participants.find(p => p.id !== currentUser.id);
                console.log('[chatInfoBtn] Participant:', participant);
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
                                <div class="info-item-desc">${participant.email || 'Không có'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            document.getElementById('infoContent').innerHTML = infoHTML;
            infoModal.style.display = 'flex';
            console.log('[chatInfoBtn] Info modal displayed');
        } catch (error) {
            console.error('[chatInfoBtn] Error:', error.message);
            alert('Lỗi khi lấy thông tin trò chuyện: ' + error.message);
        }
    });

    document.querySelector('.close-search').addEventListener('click', function() {
        console.log('[close-search] Clicked');
        searchModal.style.display = 'none';
    });

    document.querySelector('.close-info').addEventListener('click', function() {
        console.log('[close-info] Clicked');
        infoModal.style.display = 'none';
    });

    searchModal.addEventListener('click', function(e) {
        if (e.target === searchModal) {
            console.log('[searchModal] Clicked outside');
            searchModal.style.display = 'none';
        }
    });

    infoModal.addEventListener('click', function(e) {
        if (e.target === infoModal) {
            console.log('[infoModal] Clicked outside');
            infoModal.style.display = 'none';
        }
    });

    document.getElementById('searchMessageInput').addEventListener('input', function() {
        console.log('[searchMessageInput] Input:', this.value);
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
                console.log('[search-result-item] Clicked, messageId:', this.getAttribute('data-id'));
                const messageId = this.getAttribute('data-id');
                scrollToMessage(messageId);
                searchModal.style.display = 'none';
            });
        });
    });

    function highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(term, 'gi');
        return text.replace(regex, match => `<span style="background-color: rgba(255, 109, 40, 0.3);">${match}</span>`);
    }

    function scrollToMessage(messageId) {
        console.log('[scrollToMessage] Scrolling to message:', messageId);
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.style.animation = 'highlight 1.5s';
            setTimeout(() => {
                messageElement.style.animation = '';
            }, 1500);
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

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

    clearChatBtn.addEventListener('click', async function() {
        console.log('[clearChatBtn] Clicked, selectedChat:', selectedChat);
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
                console.error('[clearChatBtn] Error:', error.message);
                alert('Lỗi khi xóa trò chuyện: ' + error.message);
            }
        }
    });

    muteChatBtn.addEventListener('click', async function() {
        console.log('[muteChatBtn] Clicked, selectedChat:', selectedChat);
        if (!selectedChat) return;
        try {
            const conversation = conversations.find(c => c.id === selectedChat);
            const isMuted = !conversation.is_muted;
            await apiRequest(`/notifications/${conversation.id}`, 'PUT', { is_muted: isMuted });
            conversation.is_muted = isMuted;
            alert(`Đã ${isMuted ? 'tắt' : 'bật'} thông báo cho cuộc trò chuyện`);
        } catch (error) {
            console.error('[muteChatBtn] Error:', error.message);
            alert('Lỗi khi cập nhật thông báo: ' + error.message);
        }
    });

    addMembersBtn.addEventListener('click', function() {
        console.log('[addMembersBtn] Clicked, selectedChat:', selectedChat);
        if (!selectedChat) return;
        const conversation = conversations.find(c => c.id === selectedChat);
        if (conversation.is_group) {
            alert('Chức năng thêm thành viên vào nhóm sẽ được mở sau');
        } else {
            alert('Chỉ có thể thêm thành viên vào nhóm trò chuyện');
        }
    });

    leaveGroupBtn.addEventListener('click', async function() {
        console.log('[leaveGroupBtn] Clicked, selectedChat:', selectedChat);
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
                    console.error('[leaveGroupBtn] Error:', error.message);
                    alert('Lỗi khi rời nhóm: ' + error.message);
                }
            }
        } else {
            alert('Chỉ có thể rời khỏi nhóm trò chuyện');
        }
    });

    reportBtn.addEventListener('click', function() {
        console.log('[reportBtn] Clicked, selectedChat:', selectedChat);
        if (!selectedChat) return;
        const conversation = conversations.find(c => c.id === selectedChat);
        const reportReason = prompt(`Nhập lý do báo cáo ${conversation.group_name || conversation.participants[0].full_name}:`);
        if (reportReason) {
            alert(`Đã gửi báo cáo với lý do: ${reportReason}`);
        }
    });
});
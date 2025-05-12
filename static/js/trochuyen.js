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
    let groups = []; // Lưu danh sách nhóm từ /api/chat-groups
    let conversations = []; // Lưu danh sách cuộc trò chuyện (bao gồm nhóm và cá nhân)
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

    // Lấy danh sách nhóm và thành viên từ /api/chat-groups
    async function fetchChatGroups() {
    console.log('[fetchChatGroups] Fetching chat groups for user:', currentUser?.id);
    if (!currentUser) {
        console.error('[fetchChatGroups] No current user');
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Không tìm thấy thông tin người dùng';
        return;
    }
    try {
        groups = await apiRequest('/chat-groups?limit=25&offset=0');
        console.log('[fetchChatGroups] API response:', groups);

        // Tạo conversations từ groups
        conversations = await Promise.all(groups.map(async (group) => {
            // Kiểm tra xem nhóm có cuộc trò chuyện nhóm không
            let conversationId = null;
            try {
                const convResponse = await apiRequest(`/conversations?group_id=${group.group_id}`);
                const groupConv = convResponse.conversations.find(c => c.is_group && c.group_id === group.group_id);
                conversationId = groupConv ? String(groupConv.id) : null; // Chuyển thành chuỗi
            } catch (error) {
                console.error('[fetchChatGroups] Error fetching group conversation:', error.message);
            }

            return {
                id: conversationId || `group-${group.group_id}`, // Đảm bảo id là chuỗi
                name: group.group_name,
                avatar: group.group_name.slice(0, 2),
                is_group: true,
                group_id: group.group_id,
                unread_count: 0,
                participants: group.members.map(m => ({
                    id: m.user_id,
                    full_name: m.full_name,
                    avatar: m.avatar
                })),
                members: group.members,
                is_muted: false,
                last_message: null
            };
        }));

        console.log('[fetchChatGroups] Conversations:', conversations);
        renderMemberList();
    } catch (error) {
        console.error('[fetchChatGroups] Error:', error.message);
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Lỗi khi tải danh sách nhóm: ' + error.message;
    }
}

    // Hàm làm mới danh sách nhóm và cuộc trò chuyện
    async function refreshConversations() {
        console.log('[refreshConversations] Refreshing conversations');
        await fetchChatGroups();
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
                await refreshConversations();
            } catch (error) {
                console.error('[sendNewMessage] Error:', error.message);
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Lỗi khi gửi tin nhắn: ' + error.message;
            }
        }
    }

    // Hiển thị danh sách nhóm và thành viên
    function renderMemberList() {
    console.log('[renderMemberList] Rendering groups:', groups);
    const searchTerm = searchMembers.value.toLowerCase();
    memberList.innerHTML = '';

    if (groups.length === 0) {
        memberList.innerHTML = '<div style="padding: 10px; text-align: center;">Không có nhóm nào</div>';
        console.log('[renderMemberList] No groups to render');
        return;
    }

    groups.forEach(group => {
        const conv = conversations.find(c => c.group_id === group.group_id);
        if (!conv) {
            console.warn('[renderMemberList] No conversation found for group:', group.group_id);
            return;
        }

        // Lọc nhóm theo search term
        if (searchTerm && !group.group_name.toLowerCase().includes(searchTerm)) {
            return;
        }

        // Hiển thị nhóm
        const groupItem = document.createElement('div');
        groupItem.className = `member-item ${selectedChat === conv.id ? 'active' : ''}`;
        groupItem.dataset.id = conv.id;
        groupItem.innerHTML = `
            <div class="member-avatar">${conv.avatar}</div>
            <div class="member-info">
                <div class="member-name">${group.group_name}</div>
                <div class="member-last-msg">${conv.last_message?.content || 'Bắt đầu trò chuyện'}</div>
            </div>
            <div class="member-meta">
                <div class="member-time">${conv.last_message ? formatTime(new Date(conv.last_message.timestamp)) : ''}</div>
                ${conv.unread_count > 0 ? `<div class="member-badge">${conv.unread_count}</div>` : ''}
            </div>
        `;
        groupItem.addEventListener('click', async () => {
            console.log('[renderMemberList] Group clicked:', group.group_id);
            if (!conv || !conv.id) {
                console.error('[renderMemberList] Invalid conversation:', conv);
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'Lỗi: Cuộc trò chuyện không hợp lệ';
                return;
            }

            selectedChat = conv.id;
            chatAvatar.textContent = conv.avatar;
            chatTitle.textContent = group.group_name;
            chatSubtitle.textContent = `${group.members.length + 1} thành viên`;

            // Kiểm tra xem id có phải là tạm thời (group-)
            if (String(conv.id).startsWith('group-')) { // Chuyển thành chuỗi
                try {
                    console.log('[renderMemberList] Creating new group conversation for group_id:', group.group_id);
                    const response = await apiRequest('/conversations', 'POST', {
                        is_group: true,
                        group_id: group.group_id,
                        participants: [currentUser.id, ...group.members.map(m => m.user_id)]
                    });
                    console.log('[renderMemberList] Conversation created:', response);
                    conv.id = String(response.conversation_id); // Đảm bảo là chuỗi
                    conversations = conversations.map(c => c.group_id === group.group_id ? { ...c, id: conv.id } : c);
                } catch (error) {
                    console.error('[renderMemberList] Error creating group conversation:', error.message);
                    errorMessage.style.display = 'block';
                    errorMessage.textContent = 'Lỗi khi tạo cuộc trò chuyện nhóm: ' + error.message;
                    return;
                }
            }
            console.log('[renderMemberList] Fetching messages for conversation:', conv.id);
            await fetchMessages(conv.id);
            renderMemberList();
            messageInput.focus();
        });
        memberList.appendChild(groupItem);

        // Hiển thị thành viên trong nhóm
        group.members.forEach(member => {
            if (searchTerm && !member.full_name.toLowerCase().includes(searchTerm)) {
                return;
            }

            const memberItem = document.createElement('div');
            memberItem.className = `member-item member-subitem ${selectedChat === `${conv.id}-${member.user_id}` ? 'active' : ''}`;
            memberItem.dataset.id = `${conv.id}-${member.user_id}`;
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
                console.log('[renderMemberList] Member clicked:', member.user_id);
                selectedChat = `${conv.id}-${member.user_id}`;
                chatAvatar.textContent = member.avatar || member.full_name.slice(0, 2);
                chatTitle.textContent = member.full_name;
                chatSubtitle.textContent = member.is_online ? 'Đang hoạt động' : 'Offline';

                let existingConv = conversations.find(c => !c.is_group && c.participants.some(p => p.id === member.user_id));
                if (existingConv) {
                    selectedChat = existingConv.id;
                    await fetchMessages(existingConv.id);
                } else {
                    try {
                        const response = await apiRequest('/conversations', 'POST', {
                            is_group: false,
                            participants: [currentUser.id, member.user_id]
                        });
                        conversations.push({
                            id: String(response.conversation_id), // Đảm bảo là chuỗi
                            name: member.full_name,
                            avatar: member.avatar || member.full_name.slice(0, 2),
                            is_group: false,
                            participants: [
                                { id: currentUser.id, full_name: currentUser.name, avatar: currentUser.avatar },
                                { id: member.user_id, full_name: member.full_name, avatar: member.avatar }
                            ],
                            unread_count: 0,
                            is_muted: false
                        });
                        selectedChat = String(response.conversation_id);
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
});

// CSS bổ sung để thụt lề thành viên
const style = document.createElement('style');
style.textContent = `
    .member-subitem {
        padding-left: 20px; /* Thụt lề thành viên */
        background-color: rgba(0, 0, 0, 0.02); /* Nền nhạt để phân biệt */
    }
    .member-item {
        display: flex;
        align-items: center;
        padding: 10px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
    }
    .member-item.active {
        background-color: #e6f0ff;
    }
    .member-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #007bff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        margin-right: 10px;
    }
    .member-info {
        flex: 1;
    }
    .member-name {
        font-weight: 500;
    }
    .member-last-msg {
        font-size: 0.85rem;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .member-meta {
        text-align: right;
    }
    .member-time {
        font-size: 0.75rem;
        color: #999;
    }
    .member-badge {
        background-color: #ff6d28;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.75rem;
        margin-top: 4px;
    }
`;
document.head.appendChild(style);
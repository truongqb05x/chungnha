let groupId, memberId;

document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    


   
    

    // === Modal Thêm nội quy ===
    const modal = document.getElementById('addRuleModal');
    const openModalBtn = document.getElementById('openAddRuleModal');
    const closeModalBtn = modal.querySelector('.close-modal');
    const cancelModalBtn = modal.querySelector('.btn-cancel');
    const submitModalBtn = modal.querySelector('.btn-submit');

    function resetModalForm() {
        modal.querySelector('#modal-rule-title').value = '';
        modal.querySelector('#modal-rule-content').value = '';
    }
    
    function openModal() { 
        modal.style.display = 'block'; 
        modal.querySelector('#modal-rule-title').focus();
    }
    
    function closeModal() { 
        modal.style.display = 'none'; 
        resetModalForm(); 
    }

    openModalBtn.addEventListener('click', openModal);
    [closeModalBtn, cancelModalBtn].forEach(btn => 
        btn.addEventListener('click', closeModal)
    );
    window.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // === Load & render rules ===
    async function loadRules() {
try {
// gọi endpoint tự động
const res = await fetch('/api/groups/my/rules');
if (!res.ok) {
    const err = await res.json();
    if (res.status === 401) return window.location.href = '/login';
    throw new Error(err.error || 'Failed to load rules');
}
// nhận về group + member + danh sách rules
const { group_id, member_id, rules } = await res.json();
groupId  = group_id;
memberId = member_id;

const container = document.getElementById('rules-list');
container.innerHTML = '';
if (rules.length === 0) {
    container.innerHTML = '<p class="no-rules">Chưa có nội quy nào được đăng</p>';
    return;
}
rules.forEach(renderRule);
} catch (error) {
console.error('Error loading rules:', error);
alert('Có lỗi xảy ra khi tải nội quy. Vui lòng thử lại.');
}
}

    function renderRule(r) {
        const card = document.createElement('div');
        card.className = 'rule-card';
        card.innerHTML = `
            <div class="rule-header">
                <div class="rule-avatar">${r.avatar || r.full_name.charAt(0)}</div>
                <div class="rule-info">
                    <div class="rule-author">${r.full_name}</div>
                    <div class="rule-meta">
                        <span class="rule-time">${formatTime(r.created_at)}</span>
                        <span class="rule-privacy">
                            <i class="fas fa-globe-asia"></i> ${r.privacy === 'public' ? 'Công khai' : 'Riêng tư'}
                        </span>
                    </div>
                </div>
                ${memberId == r.member_id ? `
                <div class="rule-menu">
                    <i class="fas fa-ellipsis-h"></i>
                </div>` : ''}
            </div>
            <div class="rule-content">
                <h3 class="rule-title">${r.title}</h3>
                <p class="rule-text">${r.content}</p>
            </div>
            <div class="rule-actions">
                <div class="action-btn like-btn ${r.liked ? 'active' : ''}" data-rule-id="${r.id}">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Thích</span>
                    <span class="like-count">(${r.like_count})</span>
                </div>
                <div class="action-btn comment-toggle-btn" data-rule-id="${r.id}">
                    <i class="fas fa-comment"></i>
                    <span>Bình luận</span>
                    <span class="comment-count">(${r.comment_count})</span>
                </div>
            </div>
            <div class="comment-section" id="comments-${r.id}" style="display:none;">
                <div class="comment-form">
                    <div class="comment-avatar">${r.avatar || r.full_name.charAt(0)}</div>
                    <textarea class="comment-input" placeholder="Viết bình luận..." data-rule-id="${r.id}"></textarea>
                    <button class="comment-submit-btn" data-rule-id="${r.id}">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="comment-list"></div>
            </div>
        `;
        document.getElementById('rules-list').appendChild(card);
    }

    function formatTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = Math.floor((now - date) / 1000); // Đơn vị: giây
        
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    }

    // === Delegated events ===
        document.getElementById('rules-list').addEventListener('click', async (e) => {
            // Like/Unlike rule
            if (e.target.closest('.like-btn')) {
                const btn = e.target.closest('.like-btn');
                const ruleId = btn.dataset.ruleId;
                
                try {
                    const res = await fetch(`/api/rules/${ruleId}/like`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ member_id: memberId })
    });

                
                if (!res.ok) {
                    if (res.status === 401) {
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error('Failed to toggle like');
                }
                
                const { action } = await res.json();
                const span = btn.querySelector('.like-count');
                let count = parseInt(span.textContent.match(/\d+/)[0] || 0);
                
                if (action === 'liked') {
                    btn.classList.add('active');
                    count++;
                } else {
                    btn.classList.remove('active');
                    count = Math.max(0, count - 1);
                }
                
                span.textContent = `(${count})`;
            } catch (error) {
                console.error('Error toggling like:', error);
                alert('Có lỗi xảy ra khi thích bài viết');
            }
        }
        
        // Toggle comments
        else if (e.target.closest('.comment-toggle-btn')) {
            const btn = e.target.closest('.comment-toggle-btn');
            const ruleId = btn.dataset.ruleId;
            const sec = document.getElementById(`comments-${ruleId}`);
            
            if (sec.style.display === 'none') {
                sec.style.display = 'block';
                loadComments(ruleId);
            } else {
                sec.style.display = 'none';
            }
        }
        
        // Submit comment
        else if (e.target.closest('.comment-submit-btn')) {
            const btn = e.target.closest('.comment-submit-btn');
            const ruleId = btn.dataset.ruleId;
            const textarea = document.querySelector(`.comment-input[data-rule-id="${ruleId}"]`);
            const content = textarea.value.trim();
            
            if (!content) {
                alert('Vui lòng nhập nội dung bình luận');
                return;
            }
            
            try {
                const res = await fetch(`/api/rules/${ruleId}/comments`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({content})
                });
                
                if (!res.ok) {
                    if (res.status === 401) {
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error('Failed to post comment');
                }
                
                textarea.value = '';
                loadComments(ruleId);
                
                // Cập nhật số lượng bình luận
                const commentCount = document.querySelector(`.comment-count[data-rule-id="${ruleId}"]`);
                if (commentCount) {
                    const count = parseInt(commentCount.textContent.match(/\d+/)[0] || 0);
                    commentCount.textContent = `(${count + 1})`;
                }
            } catch (error) {
                console.error('Error posting comment:', error);
                alert('Có lỗi xảy ra khi đăng bình luận');
            }
        }
        
        // Like comment
        else if (e.target.closest('.comment-like')) {
            const likeBtn = e.target.closest('.comment-like');
            const commentId = likeBtn.dataset.commentId;
            
            try {
                const res = await fetch(`/api/comments/${commentId}/like`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'}
                });
                
                if (!res.ok) {
                    if (res.status === 401) {
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error('Failed to toggle comment like');
                }
                
                const { action } = await res.json();
                let count = parseInt(likeBtn.textContent.match(/\d+/)) || 0;
                
                if (action === 'liked') {
                    likeBtn.classList.add('active');
                    count++;
                } else {
                    likeBtn.classList.remove('active');
                    count = Math.max(0, count - 1);
                }
                
                likeBtn.textContent = `Thích${count > 0 ? ` (${count})` : ''}`;
            } catch (error) {
                console.error('Error toggling comment like:', error);
            }
        }
    });

    // === Load comments ===
    async function loadComments(ruleId) {
        try {
            const res = await fetch(`/api/rules/${ruleId}/comments`);
            
            if (!res.ok) {
                throw new Error('Failed to load comments');
            }
            
            const comments = await res.json();
            const list = document.querySelector(`#comments-${ruleId} .comment-list`);
            list.innerHTML = '';
            
            if (comments.length === 0) {
                list.innerHTML = '<p class="no-comments">Chưa có bình luận nào</p>';
                return;
            }
            
            comments.forEach(c => {
                const div = document.createElement('div');
                div.className = 'comment';
                div.innerHTML = `
                    <div class="comment-avatar">${c.avatar || c.full_name.charAt(0)}</div>
                    <div class="comment-content">
                        <div class="comment-author">${c.full_name}</div>
                        <div class="comment-text">${c.content}</div>
                        <div class="comment-meta">
                            <span class="comment-time">${formatTime(c.created_at)}</span>
                            <span class="comment-like ${c.liked ? 'active' : ''}" data-comment-id="${c.id}">
                                Thích${c.like_count > 0 ? ` (${c.like_count})` : ''}
                            </span>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    // === Submit new rule ===
    submitModalBtn.addEventListener('click', async () => {
        const title = modal.querySelector('#modal-rule-title').value.trim();
        const content = modal.querySelector('#modal-rule-content').value.trim();
        
        if (!title || !content) {
            alert('Vui lòng nhập tiêu đề và nội dung');
            return;
        }
        
        try {
            const res = await fetch(`/api/groups/${groupId}/rules`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title, content})
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to create rule');
            }
            
            closeModal();
            loadRules();
        } catch (error) {
            console.error('Error creating rule:', error);
            alert('Có lỗi xảy ra khi tạo nội quy mới');
        }
    });

    // Khởi chạy lần đầu
    loadRules();
});

document.addEventListener('DOMContentLoaded', function() {
    // User state
    const userState = {
        isLoggedIn: true,
        hasJoinedGroup: false,
        currentGroup: null
    };

    // DOM elements
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const themeToggle = document.querySelector('.theme-toggle');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const body = document.body;
    const currentGroupEl = document.getElementById('current-group');
    const openModalBtn = document.getElementById('open-group-modal-btn');
    const groupModal = document.getElementById('group-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const uploadQrInput = document.getElementById('upload-qr-input');
    const createGroupBtn = document.getElementById('create-group-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const qrImage = document.getElementById('qr-image');
    const qrPlaceholder = document.querySelector('.qr-placeholder');
    const qrCodeContainer = document.getElementById('qr-code-container');

    // Store original modal content
    const originalModalContent = document.querySelector('.modal-content').innerHTML;

    // Open/Close modal
    function openGroupModal() {
        groupModal.style.display = 'flex';
        body.style.overflow = 'hidden';
    }
    function closeGroupModal() {
        groupModal.style.display = 'none';
        body.style.overflow = 'auto';
        resetQRUpload();
    }

    // Reset QR upload UI
    function resetQRUpload() {
        qrImage.style.display = 'none';
        qrPlaceholder.style.display = 'block';
        qrImage.src = '';
        uploadQrInput.value = '';
        qrCodeContainer.classList.remove('active');
    }

    // Join group UI update
    function joinGroup(group) {
        userState.hasJoinedGroup = true;
        userState.currentGroup = group.name;
        currentGroupEl.textContent = `Nhóm: ${group.name}`;
        navItems.forEach(item => item.classList.remove('disabled'));
        document.querySelector('.main-content').innerHTML = `
            <h2>Chào mừng đến với nhóm ${group.name}</h2>
            <p>Bắt đầu quản lý bữa ăn cùng mọi người nào!</p>
            <p>Mã nhóm: ${group.code}</p>
            <p>Số thành viên: ${group.member_count}</p>
        `;
    }

    // Success state after scanning QR
    function showSuccessState(group) {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            <div class="modal-header">
                <div class="modal-title"><i class="fas fa-check-circle"></i> Thành công!</div>
                <div class="modal-subtitle">Bạn đã tìm thấy nhóm. Xác nhận để tham gia ngay.</div>
            </div>
            <div class="success-state">
                <i class="fas fa-check-circle success-icon"></i>
                <div>Bạn được mời tham gia nhóm</div>
                <div class="group-name">${group.name}</div>
                <div style="color: var(--text-light); margin-bottom: 20px;"><i class="fas fa-user-friends"></i> ${group.member_count} thành viên</div>
            </div>
            <div class="action-buttons">
                <button class="modal-btn btn-primary" id="confirm-join-btn"><i class="fas fa-users"></i> Tham gia nhóm</button>
                <button class="modal-btn btn-outline" id="cancel-join-btn"><i class="fas fa-times"></i> Hủy bỏ</button>
            </div>
        `;
        document.getElementById('confirm-join-btn').addEventListener('click', async () => {
            try {
                const res = await fetch('/api/join-group', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({group_code: group.code})
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Không thể tham gia nhóm');
                joinGroup(group);
                closeGroupModal();
                window.location.href = '/home';
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
            }
        });
        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            modalContent.innerHTML = originalModalContent;
            setupModalEvents();
            resetQRUpload();
        });
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    }

    // Loading state in modal
    function showLoadingState(message = 'Đang xử lý...') {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            <div style="padding:40px 20px; text-align:center;">
                <div class="loading-spinner"></div>
                <div style="margin-top:20px; font-weight:500;">${message}</div>
            </div>
        `;
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    }

    // API calls
    async function createGroup(groupName) {
        const res = await fetch('/api/group', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({group_name: groupName})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể tạo nhóm');
        return data.group;
    }
    async function scanQRCode(file) {
        const form = new FormData(); form.append('qr_image', file);
        const res = await fetch('/api/scan-qr', {method:'POST', body: form});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể xử lý mã QR');
        return data.group;
    }

    // Setup modal buttons
    function setupModalEvents() {
        openModalBtn.addEventListener('click', openGroupModal);
        closeModalBtn.addEventListener('click', closeGroupModal);
        qrCodeContainer.addEventListener('click', () => uploadQrInput.click());
        uploadQrInput.addEventListener('change', handleQRUpload);
        createGroupBtn.addEventListener('click', openCreateModal);
    }

    // Handlers
    async function handleQRUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            qrImage.src = ev.target.result; qrImage.style.display = 'block'; qrPlaceholder.style.display = 'none'; qrCodeContainer.classList.add('active');
            showLoadingState('Đang xử lý mã QR...');
            try {
                const group = await scanQRCode(file);
                showSuccessState(group);
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
                const modalContent = document.querySelector('.modal-content');
                modalContent.innerHTML = originalModalContent;
                setupModalEvents(); resetQRUpload();
            }
        };
        reader.readAsDataURL(file);
    }

    function openCreateModal() {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            <div class="modal-header">
                <div class="modal-title"><i class="fas fa-plus-circle"></i> Tạo nhóm mới</div>
                <div class="modal-subtitle">Đặt tên cho nhóm của bạn và bắt đầu mời thành viên</div>
            </div>
            <div class="form-group">
                <label for="group-name-input" class="form-label">Tên nhóm</label>
                <input id="group-name-input" class="form-input" placeholder="Ví dụ: Nhà Mình A2, Bếp Chung 2023" maxlength="30" />
            </div>
            <div class="action-buttons">
                <button class="modal-btn btn-primary" id="confirm-create-btn"><i class="fas fa-plus"></i> Tạo nhóm</button>
                <button class="modal-btn btn-outline" id="back-to-options-btn"><i class="fas fa-arrow-left"></i> Quay lại</button>
            </div>
        `;
        document.getElementById('confirm-create-btn').addEventListener('click', async function() {
            const name = document.getElementById('group-name-input').value.trim();
            if (!name) return alert('Vui lòng nhập tên nhóm');
            const btn = this; const old = btn.innerHTML;
            btn.innerHTML = `<span class="loading-spinner"></span> Đang tạo...`; btn.disabled = true;
            try {
                const group = await createGroup(name);
                joinGroup(group);
                closeGroupModal();
                window.location.href = '/home';
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
            } finally {
                btn.innerHTML = old; btn.disabled = false;
            }
        });
        document.getElementById('back-to-options-btn').addEventListener('click', () => {
            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = originalModalContent;
            setupModalEvents();
        });
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    }

    // Init
    setupModalEvents();

    // Disable nav items and auto-open modal
    if (!userState.hasJoinedGroup) {
        navItems.forEach((item, i) => { if (i > 0) item.classList.add('disabled'); });
        setTimeout(openGroupModal, 1000);
    }
});
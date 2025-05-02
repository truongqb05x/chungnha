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

    // Group modal functions
    function openGroupModal() {
        groupModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeGroupModal() {
        groupModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetQRUpload();
    }

    function resetQRUpload() {
        qrImage.style.display = 'none';
        qrPlaceholder.style.display = 'block';
        qrImage.src = '';
        uploadQrInput.value = '';
        qrCodeContainer.classList.remove('active');
    }

    function joinGroup(group) {
        userState.hasJoinedGroup = true;
        userState.currentGroup = group.name;
        
        // Update UI
        currentGroupEl.textContent = `Nhóm: ${group.name}`;
        
        // Enable nav items
        navItems.forEach(item => {
            if (item.classList.contains('disabled')) {
                item.classList.remove('disabled');
            }
        });
        
        // Show group content
        document.querySelector('.main-content').innerHTML = `
            <h2>Chào mừng đến với nhóm ${group.name}</h2>
            <p>Bắt đầu quản lý bữa ăn cùng mọi người nào!</p>
            <p>Mã nhóm: ${group.code}</p>
            <p>Số thành viên: ${group.member_count}</p>
        `;
    }

    function showSuccessState(groupName = "Nhà Mình A2", memberCount = 5) {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            
            <div class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-check-circle"></i>
                    Thành công!
                </div>
                <div class="modal-subtitle">
                    Bạn đã tìm thấy nhóm. Xác nhận để tham gia ngay.
                </div>
            </div>
            
            <div class="success-state">
                <i class="fas fa-check-circle success-icon"></i>
                <div>Bạn được mời tham gia nhóm</div>
                <div class="group-name">${groupName}</div>
                <div style="color: var(--text-light); margin-bottom: 20px;">
                    <i class="fas fa-user-friends"></i> ${memberCount} thành viên
                </div>
            </div>
            
            <div class="action-buttons">
                <button class="modal-btn btn-primary" id="confirm-join-btn">
                    <i class="fas fa-users"></i> Tham gia nhóm
                </button>
                <button class="modal-btn btn-outline" id="cancel-join-btn">
                    <i class="fas fa-times"></i> Hủy bỏ
                </button>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('confirm-join-btn').addEventListener('click', function() {
            joinGroup({ name: groupName, code: 'UNKNOWN', member_count: memberCount });
            closeGroupModal();
        });
        
        document.getElementById('cancel-join-btn').addEventListener('click', function() {
            modalContent.innerHTML = originalModalContent;
            setupModalEvents();
            resetQRUpload();
        });
        
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    }

    function showLoadingState(message = "Đang xử lý...") {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            <div style="padding: 40px 20px; text-align: center;">
                <div class="loading-spinner"></div>
                <div style="margin-top: 20px; font-weight: 500;">${message}</div>
            </div>
        `;
        
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    }

    // API call to create group
    async function createGroup(groupName) {
        try {
            const response = await fetch('/api/group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ group_name: groupName })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Không thể tạo nhóm');
            }
            return data.group;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    // Event listeners
    openModalBtn.addEventListener('click', openGroupModal);
    closeModalBtn.addEventListener('click', closeGroupModal);

    uploadQrInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                qrImage.src = e.target.result;
                qrImage.style.display = 'block';
                qrPlaceholder.style.display = 'none';
                qrCodeContainer.classList.add('active');

                // Show loading state
                showLoadingState("Đang xử lý hình ảnh...");
                
                // Simulate processing delay (1-2 seconds)
                setTimeout(() => {
                    const demoGroups = [
                        { name: "Nhà Mình A2", members: 5 },
                        { name: "Bếp Chung 2023", members: 8 },
                        { name: "Gia Đình Nấu Ăn", members: 4 },
                        { name: "Căn Hộ Happy", members: 3 }
                    ];
                    const randomGroup = demoGroups[Math.floor(Math.random() * demoGroups.length)];
                    showSuccessState(randomGroup.name, randomGroup.members);
                }, 1500);
            };
            reader.readAsDataURL(file);
        }
    });

    createGroupBtn.addEventListener('click', function() {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="close-modal-btn">×</button>
            
            <div class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-plus-circle modal-title-icon"></i>
                    Tạo nhóm mới
                </div>
                <div class="modal-subtitle">
                    Đặt tên cho nhóm của bạn và bắt đầu mời thành viên
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="group-name-input">Tên nhóm</label>
                <input type="text" id="group-name-input" class="form-input" placeholder="Ví dụ: Nhà Mình A2, Bếp Chung 2023" maxlength="30">
                <div style="font-size: 13px; color: var(--text-light); margin-top: 6px;">Tối đa 30 ký tự</div>
            </div>
            
            <div class="action-buttons">
                <button class="modal-btn btn-primary" id="confirm-create-btn">
                    <i class="fas fa-plus"></i> Tạo nhóm
                </button>
                <button class="modal-btn btn-outline" id="back-to-options-btn">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </button>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('confirm-create-btn').addEventListener('click', async function() {
            const groupName = document.getElementById('group-name-input').value.trim();
            if (!groupName) {
                alert('Vui lòng nhập tên nhóm');
                return;
            }

            const btn = this;
            const originalText = btn.innerHTML;
            btn.innerHTML = `<span class="loading-spinner"></span> Đang tạo nhóm...`;
            btn.disabled = true;

            try {
                const group = await createGroup(groupName);
                joinGroup(group);
                closeGroupModal();
            } catch (error) {
                alert `\Lỗi: ${error.message}`;
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
        
        document.getElementById('back-to-options-btn').addEventListener('click', function() {
            modalContent.innerHTML = originalModalContent;
            setupModalEvents();
        });
        
        document.getElementById('close-modal-btn').addEventListener('click', closeGroupModal);
    });

    // Make QR container clickable
    qrCodeContainer.addEventListener('click', function() {
        uploadQrInput.click();
    });

    function setupModalEvents() {
        uploadQrInput.addEventListener('change', uploadQrInput.onchange);
        createGroupBtn.addEventListener('click', createGroupBtn.onclick);
        closeModalBtn.addEventListener('click', closeGroupModal);
        qrCodeContainer.addEventListener('click', function() {
            uploadQrInput.click();
        });
    }

    // Initialize modal events
    setupModalEvents();
    
    // Disable nav items if not in a group
    if (!userState.hasJoinedGroup) {
        navItems.forEach((item, index) => {
            if (index > 0) { // Keep Home enabled
                item.classList.add('disabled');
            }
        });
    }

    // Show modal automatically if not in a group
    if (!userState.hasJoinedGroup) {
        setTimeout(openGroupModal, 1000);
    }
});
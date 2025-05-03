document.addEventListener('DOMContentLoaded', function() {
    const membersTableBody = document.getElementById('membersTableBody');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const showQrBtn = document.getElementById('showQrBtn');
    const showQrBtnEmpty = document.getElementById('showQrBtnEmpty');
    const scanQrBtn = document.getElementById('scanQrBtn');
    const scanQrBtnEmpty = document.getElementById('scanQrBtnEmpty');
    const qrModal = document.getElementById('qrModal');
    const scanModal = document.getElementById('scanModal');
    const closeQrModal = document.getElementById('closeQrModal');
    const closeScanModal = document.getElementById('closeScanModal');
    const qrCodeElement = document.getElementById('qrCode');

    let currentPage = 1;
    const membersPerPage = 5;
    let isAdmin = false;
    let isMember = false;
    let qrCodeInstance = null;
    let qrScanner = null;
    const groupId = new URLSearchParams(window.location.search).get('group_id') || '1';

    // Ẩn/hiện cột Hành động
    function toggleActionColumn() {
        const actionHeader = document.querySelector('th:last-child');
        const actionCells = document.querySelectorAll('td:last-child');
        if (!isAdmin) {
            if (actionHeader) actionHeader.style.display = 'none';
            actionCells.forEach(cell => cell.style.display = 'none');
        } else {
            if (actionHeader) actionHeader.style.display = '';
            actionCells.forEach(cell => cell.style.display = '');
        }
    }

    // Ẩn/hiện nút mời tham gia hoặc quét mã
    function toggleButtons() {
        if (isMember) {
            showQrBtn.style.display = 'inline-block';
            showQrBtnEmpty.style.display = 'inline-block';
            scanQrBtn.style.display = 'none';
            scanQrBtnEmpty.style.display = 'none';
        } else {
            showQrBtn.style.display = 'none';
            showQrBtnEmpty.style.display = 'none';
            scanQrBtn.style.display = 'inline-block';
            scanQrBtnEmpty.style.display = 'inline-block';
        }
    }

    // Tạo hoặc cập nhật mã QR
    function generateQRCode(groupCode) {
        if (qrCodeInstance) {
            qrCodeInstance.clear();
        }
        const joinUrl = `https://your-app.com/join?code=${groupCode}`;
        qrCodeInstance = new QRCode(qrCodeElement, {
            text: joinUrl,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Khởi tạo QR Scanner
    function initializeQRScanner() {
        qrScanner = new Html5Qrcode("qrScanner");
        qrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText, decodedResult) => {
                // Xử lý mã QR được quét
                alert(`Đã quét mã: ${decodedText}`);
                qrScanner.stop().then(() => {
                    scanModal.classList.remove('active');
                });
            },
            (errorMessage) => {
                // Xử lý lỗi (có thể bỏ qua)
            }
        ).catch(err => {
            console.error("Không thể khởi động máy quét QR:", err);
            alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
        });
    }

    // Lấy danh sách thành viên
    function fetchMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedRole = roleFilter.value;
        const selectedStatus = statusFilter.value;

        fetch(`/api/members?group_id=${groupId}&page=${currentPage}&perPage=${membersPerPage}` +
              `&search=${searchTerm}&role=${selectedRole}&status=${selectedStatus}`)
            .then(response => {
                console.log('[fetchMembers] HTTP status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to fetch members');
                }
                return response.json();
            })
            .then(data => {
                console.log('[fetchMembers] data:', data);
                isAdmin = data.is_admin;
                isMember = data.members.length > 0 || data.totalMembers > 0;
                toggleButtons();
                renderMembers(data.members);
                updatePagination(data.totalMembers);

                qrCodeElement.innerHTML = '';
                if (isMember && data.group && data.group.qr_image_url) {
                    qrCodeElement.innerHTML = 
                        `<img src="${data.group.qr_image_url}" alt="QR code nhóm" style="width:180px;height:180px;">`;
                } else if (data.group_code) {
                    const qrUrl = `/static/qrcodes/${data.group_code}.png`;
                    qrCodeElement.innerHTML = 
                        `<img src="${qrUrl}" alt="QR code nhóm" style="width:180px;height:180px;">`;
                }

                document.querySelector('.sidebar-group').textContent =
                    `Nhóm: ${data.group_name || 'Nhà Mình A2'}`;
            })
            .catch(error => {
                console.error('[fetchMembers] error:', error);
                membersTableBody.innerHTML =
                    '<tr><td colspan="4">Đã xảy ra lỗi khi tải danh sách thành viên.</td></tr>';
            });
    }

    // Render danh sách thành viên
    function renderMembers(members) {
        membersTableBody.innerHTML = '';
        if (members.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            document.getElementById('emptyState').style.display = 'none';
        }

        members.forEach(member => {
            const row = document.createElement('tr');
            let actionButtons = '';
            if (isAdmin) {
                if (member.status === 'Pending') {
                    actionButtons = `
                        <button class="action-btn approve-btn" data-id="${member.member_id}" title="Duyệt thành viên">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject-btn" data-id="${member.member_id}" title="Từ chối thành viên">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                } else if (member.can_delete) {
                    actionButtons = `
                        <button class="action-btn delete-btn" data-id="${member.member_id}" title="Xóa thành viên">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }

            row.innerHTML = `
                <td>
                    <div class="member-name">
                        <div class="member-avatar">${member.initials || '?'}</div>
                        <div>${member.full_name}<div class="member-email">${member.email}</div></div>
                    </div>
                </td>
                <td>${member.role}</td>
                <td>
                    <span class="status status-${member.status.toLowerCase()}">
                        <span class="status-dot"></span>
                        ${member.status}
                    </span>
                </td>
                <td>${actionButtons}</td>
            `;
            membersTableBody.appendChild(row);
        });

        if (isAdmin) {
            // Xử lý nút duyệt
            document.querySelectorAll('.approve-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const memberId = this.getAttribute('data-id');
                    if (memberId && confirm('Bạn có chắc chắn muốn duyệt thành viên này không?')) {
                        approveMember(memberId);
                    }
                });
            });

            // Xử lý nút từ chối
            document.querySelectorAll('.reject-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const memberId = this.getAttribute('data-id');
                    if (memberId && confirm('Bạn có chắc chắn muốn từ chối thành viên này không?')) {
                        rejectMember(memberId);
                    }
                });
            });

            // Xử lý nút xóa
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const memberId = this.getAttribute('data-id');
                    if (memberId && confirm('Bạn có chắc chắn muốn xóa thành viên này không?')) {
                        deleteMember(memberId);
                    }
                });
            });
        }

        toggleActionColumn();
    }

    // Duyệt thành viên
    function approveMember(memberId) {
        fetch(`/api/member/${memberId}/approve`, {
            method: 'POST',
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401) {
                    throw new Error('Bạn cần đăng nhập để thực hiện hành động này.');
                } else if (response.status === 403) {
                    throw new Error('Bạn không có quyền duyệt thành viên này.');
                } else if (response.status === 404) {
                    throw new Error('Không tìm thấy thành viên.');
                } else {
                    throw new Error('Lỗi server.');
                }
            })
            .then(data => {
                alert(data.message);
                fetchMembers();
            })
            .catch(error => {
                console.error('Error approving member:', error);
                alert(error.message);
                fetchMembers();
            });
    }

    // Từ chối thành viên
    function rejectMember(memberId) {
        fetch(`/api/member/${memberId}/reject`, {
            method: 'POST',
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401) {
                    throw new Error('Bạn cần đăng nhập để thực hiện hành động này.');
                } else if (response.status === 403) {
                    throw new Error('Bạn không có quyền từ chối thành viên này.');
                } else if (response.status === 404) {
                    throw new Error('Không tìm thấy thành viên.');
                } else {
                    throw new Error('Lỗi server.');
                }
            })
            .then(data => {
                alert(data.message);
                fetchMembers();
            })
            .catch(error => {
                console.error('Error rejecting member:', error);
                alert(error.message);
                fetchMembers();
            });
    }

    // Xóa thành viên
    function deleteMember(memberId) {
        fetch(`/api/member/${memberId}`, {
            method: 'DELETE',
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401) {
                    throw new Error('Bạn cần đăng nhập để thực hiện hành động này.');
                } else if (response.status === 403) {
                    throw new Error('Bạn không có quyền xóa thành viên này.');
                } else if (response.status === 404) {
                    throw new Error('Không tìm thấy thành viên hoặc đã bị xóa.');
                } else if (response.status === 400) {
                    throw new Error('Không thể thực hiện hành động này.');
                } else {
                    throw new Error('Lỗi server.');
                }
            })
            .then(data => {
                alert(data.message);
                fetchMembers();
            })
            .catch(error => {
                console.error('Error deleting member:', error);
                alert(error.message);
                fetchMembers();
            });
    }

    // Cập nhật phân trang
    function updatePagination(totalMembers) {
        const totalPages = Math.ceil(totalMembers / membersPerPage);
        prevPage.disabled = currentPage <= 1;
        nextPage.disabled = currentPage >= totalPages;

        prevPage.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                fetchMembers();
            }
        });

        nextPage.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                fetchMembers();
            }
        });
    }

    // Khởi tạo
    fetchMembers();

    // Sự kiện tìm kiếm và lọc
    searchInput.addEventListener('input', fetchMembers);
    roleFilter.addEventListener('change', fetchMembers);
    statusFilter.addEventListener('change', fetchMembers);

    // Hiển thị modal mã QR
    showQrBtn.addEventListener('click', function() {
        qrModal.classList.add('active');
    });

    showQrBtnEmpty.addEventListener('click', function() {
        qrModal.classList.add('active');
    });

    // Hiển thị modal quét mã QR
    scanQrBtn.addEventListener('click', function() {
        scanModal.classList.add('active');
        initializeQRScanner();
    });

    scanQrBtnEmpty.addEventListener('click', function() {
        scanModal.classList.add('active');
        initializeQRScanner();
    });

    // Đóng modal mã QR
    closeQrModal.addEventListener('click', function() {
        qrModal.classList.remove('active');
    });

    // Đóng modal quét mã QR
    closeScanModal.addEventListener('click', function() {
        scanModal.classList.remove('active');
        if (qrScanner) {
            qrScanner.stop().then(() => {
                qrScanner = null;
            });
        }
    });
});
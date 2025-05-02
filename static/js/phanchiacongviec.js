let tasks = [];
let currentEditingId = null;

// Fetch tasks from server
async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) throw new Error('Không thể tải danh sách công việc');
        tasks = await res.json();
        renderTasks(tasks);
        updateStats(tasks);
        populateAssigneeFilter();
    } catch (error) {
        console.error('Lỗi khi tải công việc:', error);
        alert('Đã xảy ra lỗi khi tải danh sách công việc');
    }
}

window.addEventListener('load', fetchTasks);

// Update statistics
function updateStats(tasksList) {
    const today = new Date().toISOString().split('T')[0];
    const completedCount = tasksList.filter(t => t.completed).length;
    const pendingCount = tasksList.filter(t => !t.completed && t.due_date >= today).length;
    const overdueCount = tasksList.filter(t => !t.completed && t.due_date < today).length;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('overdue-count').textContent = overdueCount;
    document.getElementById('total-count').textContent = tasksList.length;
}

// Populate assignee filter dynamically
function populateAssigneeFilter() {
    const assigneeSelect = document.getElementById('filter-assignee');
    const uniqueAssignees = [...new Set(tasks.map(t => t.assignee_name))].filter(name => name);
    
    // Keep the "Tất cả" option and clear other options
    assigneeSelect.innerHTML = '<option value="all">Tất cả</option>';
    
    // Add unique assignees to the filter
    uniqueAssignees.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assigneeSelect.appendChild(option);
    });
}

// Filter tasks
function filterTasks() {
    const statusFilter = document.getElementById('filter-status').value;
    const assigneeFilter = document.getElementById('filter-assignee').value;
    const fromDate = document.getElementById('filter-date').value;
    const toDate = document.getElementById('filter-to-date').value;
    const today = new Date().toISOString().split('T')[0];

    let filteredTasks = [...tasks];

    // Filter by status
    if (statusFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => {
            const isOverdue = !t.completed && t.due_date < today;
            if (statusFilter === 'completed') return t.completed;
            if (statusFilter === 'pending') return !t.completed && !isOverdue;
            if (statusFilter === 'overdue') return isOverdue;
            return true;
        });
    }

    // Filter by assignee
    if (assigneeFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.assignee_name === assigneeFilter);
    }

    // Filter by date range
    if (fromDate) {
        filteredTasks = filteredTasks.filter(t => t.due_date >= fromDate);
    }
    if (toDate) {
        filteredTasks = filteredTasks.filter(t => t.due_date <= toDate);
    }

    renderTasks(filteredTasks);
    updateStats(filteredTasks);
}

// Render tasks
function renderTasks(tasksList) {
    const tbody = document.getElementById('task-list');
    tbody.innerHTML = '';
    if (!tasksList.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;">Không có công việc nào</td></tr>`;
        return;
    }
    const today = new Date().toISOString().split('T')[0];
    tasksList.forEach((t) => {
        const isOverdue = !t.completed && t.due_date < today;
        const statusClass = t.completed ? 'completed' : isOverdue ? 'overdue' : 'pending';
        const statusText = t.completed ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : 'Chưa làm';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${new Date(t.due_date).toLocaleDateString('vi-VN')}</td>
                <td>${t.custom_type}</td>
                <td>${t.description || '-'}</td>
                <td>${t.assignee_name || '-'}</td>
                <td><span class="task-status ${statusClass}">${statusText}</span></td>
                <td>
                    ${!t.completed ? `<button onclick="doComplete(${t.id})" class="task-btn complete">
                        <i class="fas fa-check"></i> Hoàn thành
                    </button>` : ''}
                    <button onclick="openEdit(${t.id})" class="task-btn edit">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button onclick="doDelete(${t.id})" class="task-btn delete">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `);
    });
}

// Validate form
function validateForm() {
    let isValid = true;
    const type = document.getElementById('modal-task-type').value;
    const assignee = document.getElementById('modal-task-assignee').value;
    const date = document.getElementById('modal-task-date').value;

    // Reset error messages
    document.getElementById('task-type-error').style.display = 'none';
    document.getElementById('task-assignee-error').style.display = 'none';
    document.getElementById('task-date-error').style.display = 'none';

    if (!type) {
        document.getElementById('task-type-error').style.display = 'block';
        isValid = false;
    }
    if (!assignee) {
        document.getElementById('task-assignee-error').style.display = 'block';
        isValid = false;
    }
    if (!date) {
        document.getElementById('task-date-error').style.display = 'block';
        isValid = false;
    }

    return isValid;
}

// Save task
async function saveTask() {
    if (!validateForm()) return;

    const id = document.getElementById('task-id').value;
    const type = document.getElementById('modal-task-type').value;
    const desc = document.getElementById('modal-task-desc').value;
    const assignee = document.getElementById('modal-task-assignee').value;
    const date = document.getElementById('modal-task-date').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;

    const payload = {
        group_id: 1,
        type,
        desc,
        assignee,
        date,
        priority,
        completed: false
    };

    try {
        let response;
        if (id) {
            // Update task
            response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new task
            response = await fetch('/api/creat_tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) throw new Error('Không thể lưu công việc');
        closeModal();
        await fetchTasks();
    } catch (error) {
        console.error('Lỗi khi lưu công việc:', error);
        alert('Đã xảy ra lỗi khi lưu công việc');
    }
}

// Delete task
async function doDelete(id) {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
        try {
            const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Không thể xóa công việc');
            await fetchTasks();
        } catch (error) {
            console.error('Lỗi khi xóa công việc:', error);
            alert('Đã xảy ra lỗi khi xóa công việc');
        }
    }
}

// Complete task
async function doComplete(id) {
    try {
        const response = await fetch(`/api/tasks/${id}/complete`, { method: 'PATCH' });
        if (!response.ok) throw new Error('Không thể hoàn thành công việc');
        await fetchTasks();
    } catch (error) {
        console.error('Lỗi khi hoàn thành công việc:', error);
        alert('Đã xảy ra lỗi khi hoàn thành công việc');
    }
}

// Modal functions
function openTaskModal() {
    document.getElementById('task-modal').style.display = 'block';
    document.getElementById('task-id').value = '';
    document.getElementById('task-form').reset();
    document.querySelector('input[name="priority"][value="low"]').checked = true;
    document.getElementById('modal-save-btn').innerHTML = `
        <span>Lưu công việc</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L10 17L19 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    document.getElementById('modal-title').textContent = 'Thêm công việc mới';
    
    // Reset error messages
    document.getElementById('task-type-error').style.display = 'none';
    document.getElementById('task-assignee-error').style.display = 'none';
    document.getElementById('task-date-error').style.display = 'none';
}

function closeModal() {
    document.getElementById('task-modal').style.display = 'none';
}

// Open edit modal
function openEdit(id) {
    const t = tasks.find(x => x.id === id);
    openTaskModal();
    document.getElementById('task-id').value = t.id;
    document.getElementById('modal-task-type').value = t.custom_type;
    document.getElementById('modal-task-desc').value = t.description || '';
    document.getElementById('modal-task-assignee').value = t.assignee_id;
    document.getElementById('modal-task-date').value = t.due_date;
    document.querySelector(`input[name="priority"][value="${t.priority}"]`).checked = true;
    document.getElementById('modal-save-btn').innerHTML = `
        <span>Cập nhật</span>
        <svg width="18" height="18keyboard_arrow_up</svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L10 17L19 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    document.getElementById('modal-title').textContent = 'Sửa công việc';
}

// Export to Excel
function exportToExcel() {
    // Prepare data for Excel
    const today = new Date().toISOString().split('T')[0];
    const excelData = tasks.map(t => {
        const isOverdue = !t.completed && t.due_date < today;
        const statusText = t.completed ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : 'Chưa làm';
        return {
            'Ngày': new Date(t.due_date).toLocaleDateString('vi-VN'),
            'Công việc': t.custom_type,
            'Mô tả': t.description || '-',
            'Người phụ trách': t.assignee_name || '-',
            'Trạng thái': statusText,
            'Mức độ ưu tiên': t.priority === 'low' ? 'Thấp' : t.priority === 'medium' ? 'Trung bình' : 'Cao'
        };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Define column widths (optional, for better formatting)
    worksheet['!cols'] = [
        { wch: 15 }, // Ngày
        { wch: 20 }, // Công việc
        { wch: 30 }, // Mô tả
        { wch: 20 }, // Người phụ trách
        { wch: 15 }, // Trạng thái
        { wch: 15 }  // Mức độ ưu tiên
    ];

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách công việc');

    // Generate Excel file and trigger download
    const fileName = `Danh_sach_cong_viec_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
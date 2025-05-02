/* Task Management Frontend (JavaScript) */

// Define your current group context
const GROUP_ID = 1;  // TODO: Replace with dynamic group ID if needed
let tasks = [];
let currentEditingId = null;

// Fetch tasks from server
async function fetchTasks() {
    try {
        const res = await fetch(`/api/tasks?group_id=${GROUP_ID}`);
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
    assigneeSelect.innerHTML = '<option value="all">Tất cả</option>';
    uniqueAssignees.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assigneeSelect.appendChild(option);
    });
}

// Filter tasks
function filterTasks() {
    const statusFilter   = document.getElementById('filter-status').value;
    const assigneeFilter = document.getElementById('filter-assignee').value;
    const fromDate       = document.getElementById('filter-date').value;
    const toDate         = document.getElementById('filter-to-date').value;
    const today          = new Date().toISOString().split('T')[0];

    let filtered = [...tasks];

    // By status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => {
            const isOverdue = !t.completed && t.due_date < today;
            if (statusFilter === 'completed') return t.completed;
            if (statusFilter === 'pending')   return !t.completed && !isOverdue;
            if (statusFilter === 'overdue')   return isOverdue;
            return true;
        });
    }
    // By assignee
    if (assigneeFilter !== 'all') {
        filtered = filtered.filter(t => t.assignee_name === assigneeFilter);
    }
    // By date range
    if (fromDate) filtered = filtered.filter(t => t.due_date >= fromDate);
    if (toDate)   filtered = filtered.filter(t => t.due_date <= toDate);

    renderTasks(filtered);
    updateStats(filtered);
}

defaultValue = '-';
// Render tasks
function renderTasks(tasksList) {
    const tbody = document.getElementById('task-list');
    tbody.innerHTML = '';
    if (!tasksList.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-tasks">Không có công việc nào</td></tr>`;
        return;
    }
    const today = new Date().toISOString().split('T')[0];
    tasksList.forEach(t => {
        const isOverdue   = !t.completed && t.due_date < today;
        const statusClass = t.completed ? 'completed' : isOverdue ? 'overdue' : 'pending';
        const statusText  = t.completed ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : 'Chưa làm';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${new Date(t.due_date).toLocaleDateString('vi-VN')}</td>
                <td>${t.custom_type}</td>
                <td>${t.description || defaultValue}</td>
                <td>${t.assignee_name || defaultValue}</td>
                <td><span class="task-status ${statusClass}">${statusText}</span></td>
                <td>
${!t.completed ? `<button onclick="doComplete(${t.id})" class="task-btn complete">
    <i class="fas fa-check"></i> Hoàn thành
</button>` : ''}
                    <button onclick="openEdit(${t.id})" class="task-btn edit"><i class="fas fa-edit"></i></button>
                    <button onclick="doDelete(${t.id})" class="task-btn delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `);
    });
}

// Validate form
function validateForm() {
    let valid = true;
    ['modal-task-type','modal-task-assignee','modal-task-date'].forEach(id => {
        const el = document.getElementById(id);
        const err = document.getElementById(id.replace('modal-','') + '-error');
        err.style.display = el.value ? 'none' : 'block';
        if (!el.value) valid = false;
    });
    return valid;
}

// Save (create/update) task
async function saveTask() {
    if (!validateForm()) return;
    const id       = document.getElementById('task-id').value;
    const payload  = {
        group_id : GROUP_ID,
        type     : document.getElementById('modal-task-type').value,
        desc     : document.getElementById('modal-task-desc').value,
        assignee : document.getElementById('modal-task-assignee').value,
        date     : document.getElementById('modal-task-date').value,
        priority : document.querySelector('input[name="priority"]:checked').value,
        completed: false
    };
    try {
        let url = id ? `/api/tasks/${id}?group_id=${GROUP_ID}` : '/api/creat_tasks';
        let method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Không thể lưu công việc');
        closeModal();
        fetchTasks();
    } catch (e) {
        console.error('Lỗi khi lưu:', e);
        alert('Đã xảy ra lỗi khi lưu công việc');
    }
}

// Delete task
async function doDelete(taskId) {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
        const res = await fetch(`/api/tasks/${taskId}?group_id=${GROUP_ID}`, {method:'DELETE'});
        if (!res.ok) throw new Error('Không thể xóa công việc');
        fetchTasks();
    } catch (e) {
        console.error('Lỗi khi xóa:', e);
        alert('Đã xảy ra lỗi khi xóa công việc');
    }
}

// Complete task
async function doComplete(taskId) {
    try {
        const res = await fetch(`/api/tasks/${taskId}/complete?group_id=${GROUP_ID}`, {method:'PATCH'});
        if (!res.ok) throw new Error('Không thể hoàn thành công việc');
        fetchTasks();
    } catch (e) {
        console.error('Lỗi khi hoàn thành:', e);
        alert('Đã xảy ra lỗi khi hoàn thành công việc');
    }
}

// Modal control
function openTaskModal() {
    document.getElementById('task-modal').style.display = 'block';
    document.getElementById('task-id').value = '';
    document.getElementById('task-form').reset();
    document.querySelector('input[name="priority"][value="low"]').checked = true;
    document.getElementById('modal-title').textContent = 'Thêm công việc mới';
    document.getElementById('modal-save-btn').textContent = 'Lưu công việc';
    ['task-type-error','task-assignee-error','task-date-error'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

function openEdit(taskId) {
    const t = tasks.find(x => x.id === taskId);
    openTaskModal();
    document.getElementById('task-id').value = t.id;
    document.getElementById('modal-task-type').value = t.custom_type;
    document.getElementById('modal-task-desc').value = t.description || '';
    document.getElementById('modal-task-assignee').value = t.assignee_id;
    document.getElementById('modal-task-date').value = t.due_date;
    document.querySelector(`input[name="priority"][value="${t.priority}"]`).checked = true;
    document.getElementById('modal-title').textContent = 'Sửa công việc';
    document.getElementById('modal-save-btn').textContent = 'Cập nhật';
}

function closeModal() {
    document.getElementById('task-modal').style.display = 'none';
}

// Export to Excel
function exportToExcel() {
    const today = new Date().toISOString().split('T')[0];
    const data = tasks.map(t => {
        const isOverdue = !t.completed && t.due_date < today;
        const status    = t.completed ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : 'Chưa làm';
        return {
            'Ngày': new Date(t.due_date).toLocaleDateString('vi-VN'),
            'Công việc': t.custom_type,
            'Mô tả': t.description || defaultValue,
            'Người phụ trách': t.assignee_name || defaultValue,
            'Trạng thái': status,
            'Ưu tiên': t.priority === 'low' ? 'Thấp' : t.priority === 'medium' ? 'Trung bình' : 'Cao'
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:15},{wch:20},{wch:30},{wch:20},{wch:15},{wch:15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Công Việc');
    const fname = `Danh_sach_cong_viec_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb, fname);
}
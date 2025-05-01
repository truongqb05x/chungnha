let tasks = [];
let members = ['A','B','C'];
let currentEditingId = null;

// 1) Khi load trang: lấy danh sách từ server
async function fetchTasks() {
    // có thể thêm query params nếu cần filter mặc định
    const res = await fetch('/api/tasks');
    tasks = await res.json();
    renderTasks(tasks);
    updateStats(tasks);
}
window.addEventListener('load', fetchTasks);

// 2) Render & stats không thay đổi (chỉ đổi nguồn dữ liệu)
function updateStats(tasksList) {
    const today = new Date().toISOString().split('T')[0];
    const completedCount = tasksList.filter(t=>t.completed).length;
    const pendingCount   = tasksList.filter(t=>!t.completed && t.due_date>=today).length;
    const overdueCount   = tasksList.filter(t=>!t.completed && t.due_date<today).length;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('pending-count').textContent   = pendingCount;
    document.getElementById('overdue-count').textContent   = overdueCount;
    document.getElementById('total-count').textContent     = tasksList.length;
}

function renderTasks(tasksList) {
    const tbody = document.getElementById('task-list');
    tbody.innerHTML = '';
    if (!tasksList.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;">Không có công việc nào</td></tr>`;
        return;
    }
    const today = new Date().toISOString().split('T')[0];
    tasksList.forEach((t, i) => {
        const isOverdue = !t.completed && t.due_date < today;
        const statusClass = t.completed ? 'completed' : isOverdue ? 'overdue' : 'pending';
        const statusText  = t.completed ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : 'Chưa làm';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
              <td>${new Date(t.due_date).toLocaleDateString('vi-VN')}</td>
              <td>${t.custom_type}</td>
              <td>${t.description||'-'}</td>
              <td>${members.find(m=>m==t.assignee_id)||'-'}</td>
              <td><span class="task-status ${statusClass}">${statusText}</span></td>
              <td>
                ${!t.completed?`<button onclick="doComplete(${t.id})" class="task-btn complete">
                  <i class="fas fa-check"></i> Hoàn thành
                </button>`: ''}
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

// 3) Lưu (create / update)
async function saveTask() {
    const id      = document.getElementById('task-id').value;
    const type    = document.getElementById('modal-task-type').value;
    const desc    = document.getElementById('modal-task-desc').value;
    const assignee= document.getElementById('modal-task-assignee').value;
    const date    = document.getElementById('modal-task-date').value;
    const priority= document.getElementById('modal-task-priority').value;
    if (!type||!assignee||!date) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }
    const payload = { type, desc, assignee, date, priority, completed: false };

    if (id) {
        // cập nhật
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
    } else {
        // tạo mới
        await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
    }
    closeModal();
    await fetchTasks();
}

// 4) Xóa
async function doDelete(id) {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        await fetchTasks();
    }
}

// 5) Hoàn thành
async function doComplete(id) {
    await fetch(`/api/tasks/${id}/complete`, { method: 'PATCH' });
    await fetchTasks();
}

// 6) Mở modal sửa
function openEdit(id) {
    const t = tasks.find(x=>x.id===id);
    openTaskModal();  // dùng function cũ để show modal
    document.getElementById('task-id').value            = t.id;
    document.getElementById('modal-task-type').value    = t.custom_type;
    document.getElementById('modal-task-desc').value    = t.description;
    document.getElementById('modal-task-assignee').value= t.assignee_id;
    document.getElementById('modal-task-date').value    = t.due_date;
    document.getElementById('modal-task-priority').value= t.priority;
    document.getElementById('modal-save-btn').textContent = 'Cập nhật';
}
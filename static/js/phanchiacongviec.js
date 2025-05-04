/* Task Management Frontend (JavaScript) */

// Global state
let tasks = [];
let membersList = [];

// On load
document.addEventListener('DOMContentLoaded', () => {
    fetchMembers();
    fetchTasks();
});

// 1) Fetch members for selects
async function fetchMembers() {
    try {
        const res = await fetch('/api/members_exp');
        if (!res.ok) throw new Error('Không thể tải danh sách thành viên');
        membersList = await res.json();
        populateModalAssignee();
        populateFilterAssignee();
    } catch (error) {
        console.error('Lỗi khi tải thành viên:', error);
    }
}

// Populate assignee <select> in modal
function populateModalAssignee() {
    const select = document.getElementById('modal-task-assignee');
    select.innerHTML = '<option value="" disabled selected>Chọn người phụ trách</option>';
    membersList.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.full_name;
        select.appendChild(opt);
    });
}

// Populate filter assignee <select>
function populateFilterAssignee() {
    const filter = document.getElementById('filter-assignee');
    filter.innerHTML = '<option value="all">Tất cả</option>';
    membersList.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.full_name;
        opt.textContent = m.full_name;
        filter.appendChild(opt);
    });
}

// 2) Fetch tasks
async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) throw new Error('Không thể tải danh sách công việc');
        tasks = await res.json();
        renderTasks(tasks);
        updateStats(tasks);
    } catch (error) {
        console.error('Lỗi khi tải công việc:', error);
        alert('Đã xảy ra lỗi khi tải danh sách công việc');
    }
}

// 3) Update stats
function updateStats(list) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('completed-count').textContent = list.filter(t => t.completed).length;
    document.getElementById('pending-count').textContent   = list.filter(t => !t.completed && t.due_date >= today).length;
    document.getElementById('overdue-count').textContent   = list.filter(t => !t.completed && t.due_date < today).length;
    document.getElementById('total-count').textContent     = list.length;
}

// 4) Filter tasks
function filterTasks() {
    const status = document.getElementById('filter-status').value;
    const assignee = document.getElementById('filter-assignee').value;
    const from = document.getElementById('filter-date').value;
    const to = document.getElementById('filter-to-date').value;
    const today = new Date().toISOString().split('T')[0];

    let filtered = [...tasks];
    if (status !== 'all') {
        filtered = filtered.filter(t => {
            const overdue = !t.completed && t.due_date < today;
            return (status === 'completed' && t.completed)
                || (status === 'pending'   && !t.completed && !overdue)
                || (status === 'overdue'   && overdue);
        });
    }
    if (assignee !== 'all') {
        filtered = filtered.filter(t => t.assignee_name === assignee);
    }
    if (from) filtered = filtered.filter(t => t.due_date >= from);
    if (to)   filtered = filtered.filter(t => t.due_date <= to);

    renderTasks(filtered);
    updateStats(filtered);
}

defaultValue = '-';

// 5) Render tasks
function renderTasks(list) {
    const tbody = document.getElementById('task-list');
    tbody.innerHTML = '';
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-tasks">Không có công việc nào</td></tr>`;
        return;
    }
    const today = new Date().toISOString().split('T')[0];
    list.sort((a,b)=> new Date(b.due_date)-new Date(a.due_date)).forEach(t => {
        const overdue = !t.completed && t.due_date < today;
        const cls = t.completed ? 'completed' : overdue ? 'overdue':'pending';
        const txt = t.completed ? 'Hoàn thành' : overdue ? 'Quá hạn':'Chưa làm';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${new Date(t.due_date).toLocaleDateString('vi-VN')}</td>
                <td>${t.custom_type}</td>
                <td>${t.description||defaultValue}</td>
                <td>${t.assignee_name||defaultValue}</td>
                <td><span class="task-status ${cls}">${txt}</span></td>
                <td>
                    ${!t.completed?`<button onclick="doComplete(${t.id})" class="task-btn complete"><i class="fas fa-check"></i></button>`:''}
                    <button onclick="openEdit(${t.id})" class="task-btn edit"><i class="fas fa-edit"></i></button>
                    <button onclick="doDelete(${t.id})" class="task-btn delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `);
    });
}

// 6) Validate modal form
function validateForm() {
    let ok = true;
    ['modal-task-type','modal-task-assignee','modal-task-date'].forEach(id=>{
        const el = document.getElementById(id);
        const err= document.getElementById(id.replace('modal-','')+'-error');
        if (!el.value) { err.style.display='block'; ok=false;} else {err.style.display='none';}
    });
    return ok;
}

// 7) Save task
async function saveTask() {
    if (!validateForm()) return;
    const id = document.getElementById('task-id').value;
    const payload={
        type: document.getElementById('modal-task-type').value,
        desc: document.getElementById('modal-task-desc').value,
        assignee: document.getElementById('modal-task-assignee').value,
        date: document.getElementById('modal-task-date').value,
        priority: document.querySelector('input[name="priority"]:checked').value,
        completed:false
    };
    try {
        const url = id?`/api/tasks/${id}`:'/api/tasks';
        const method=id?'PUT':'POST';
        const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if (!res.ok) throw new Error('Lưu lỗi');
        closeModal();fetchTasks();
    } catch(err){console.error(err);alert('Lỗi khi lưu');}
}

// 8) Delete task
async function doDelete(id){ if(!confirm('Xóa?'))return; try{ const res=await fetch(`/api/tasks/${id}`,{method:'DELETE'}); if(!res.ok)throw''; fetchTasks(); }catch{alert('Xóa lỗi');}}

// 9) Complete task
async function doComplete(id){ try{ const res=await fetch(`/api/tasks/${id}/complete`,{method:'PATCH'}); if(!res.ok)throw''; fetchTasks(); }catch{alert('Hoàn thành lỗi');}}

// 10) Open modal
function openTaskModal(){
    document.getElementById('task-modal').style.display='block';
    document.getElementById('task-id').value='';
    document.getElementById('task-form').reset();
    document.querySelector('input[name="priority"][value="low"]').checked=true;
    document.getElementById('modal-title').textContent='Thêm công việc mới';
    document.getElementById('modal-save-btn').textContent='Lưu công việc';
    ['task-type-error','task-assignee-error','task-date-error'].forEach(id=>document.getElementById(id).style.display='none');
}

// 11) Edit task
function openEdit(id){
    const t=tasks.find(x=>x.id===id);openTaskModal();
    document.getElementById('task-id').value=t.id;
    document.getElementById('modal-task-type').value=t.custom_type;
    document.getElementById('modal-task-desc').value=t.description||'';
    document.getElementById('modal-task-assignee').value=t.assignee_id;
    document.getElementById('modal-task-date').value=t.due_date;
    document.querySelector(`input[name="priority"][value="${t.priority}"]`).checked=true;
    document.getElementById('modal-title').textContent='Sửa công việc';
    document.getElementById('modal-save-btn').textContent='Cập nhật';
}

// 12) Close modal
function closeModal(){ document.getElementById('task-modal').style.display='none'; }

// 13) Export Excel
function exportToExcel(){
    const today=new Date().toISOString().split('T')[0];
    const data=tasks.map(t=>({
        'Ngày':new Date(t.due_date).toLocaleDateString('vi-VN'),
        'Công việc':t.custom_type,
        'Mô tả':t.description||defaultValue,
        'Người phụ trách':t.assignee_name||defaultValue,
        'Trạng thái':t.completed?'Hoàn thành':(!t.completed&&t.due_date<today)?'Quá hạn':'Chưa làm',
        'Ưu tiên':t.priority==='low'?'Thấp':t.priority==='medium'?'Trung bình':'Cao'
    }));
    const ws=XLSX.utils.json_to_sheet(data);
    ws['!cols']=[{wch:15},{wch:20},{wch:30},{wch:20},{wch:15},{wch:15}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Công Việc');
    const fname=`Danh_sach_cong_viec_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb,fname);
}

// Export globals
window.fetchTasks=fetchTasks;
window.filterTasks=filterTasks;
window.saveTask=saveTask;
window.validateForm=validateForm;
window.openTaskModal=openTaskModal;
window.openEdit=openEdit;
window.closeModal=closeModal;
window.doDelete=doDelete;
window.doComplete=doComplete;
window.exportToExcel=exportToExcel;

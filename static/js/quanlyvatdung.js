const API_BASE = '/api';
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar & Theme (unchanged)
    // ...

    // Fetch initial data
    loadCategories();
    loadInventory();
    loadShoppingList();

    document.getElementById('clear-list-btn').addEventListener('click', clearShoppingList);
});

// Load categories into modal select
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const cats = await res.json();
        const sel = document.getElementById('modal-item-category');
        cats.forEach(c => {
            const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name;
            sel.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

// Inventory functions
async function loadInventory() {
    const tbody = document.getElementById('inventory-list'); tbody.innerHTML = '';
    try {
        const res = await fetch(`${API_BASE}/items`);
        const items = await res.json();
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fas fa-box-open"></i><p>Kho vật dụng trống</p></td></tr>`;
            return;
        }
        items.forEach(item => {
            const status = getStockStatus(item.quantity, item.threshold);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.threshold}</td>
                <td><span class="stock-status ${status}">${status === 'low'? 'Hết hàng': status==='warning'? 'Sắp hết':'Đủ'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="changeQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="changeQuantity(${item.id}, -1)" ${item.quantity===0?'disabled':''}><i class="fas fa-minus"></i></button>
                        <button class="btn btn-primary btn-sm" onclick="addToShopping(${item.id},'${item.name}')"><i class="fas fa-cart-plus"></i></button>
                        <button class="btn btn-sm" onclick="openEditModal(${item.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

function getStockStatus(q, t) { if (q===0) return 'low'; if (q<=t) return 'warning'; return 'normal'; }

async function quickAddItem() {
    const name = document.getElementById('item-name').value.trim();
    const qty = parseInt(document.getElementById('item-quantity').value)||0;
    if (!name) return alert('Vui lòng nhập tên vật dụng!');
    await fetch(`${API_BASE}/items`, {
        method: 'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, quantity: qty, threshold: Math.max(1, Math.floor(qty/2)) })
    });
    document.getElementById('item-name').value = '';
    document.getElementById('item-quantity').value = '';
    loadInventory();
}

async function changeQuantity(id, delta) {
    await fetch(`${API_BASE}/items/${id}/quantity`, {
        method: 'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ change: delta })
    });
    loadInventory();
}

async function deleteItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa vật dụng này?')) return;
    await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' });
    loadInventory();
}

// Modal handling
let currentEditId = null;
function openAddItemModal() {
    currentEditId = null;
    resetModal();
    document.querySelector('.modal-title').innerText = 'Thêm vật dụng mới';
    document.getElementById('modal-save-btn').onclick = saveNewItem;
    document.getElementById('add-item-modal').style.display = 'flex';
}
async function openEditModal(id) {
    const res = await fetch(`${API_BASE}/items`);
    const items = await res.json();
    const item = items.find(i=>i.id===id);
    if (!item) return;
    currentEditId = id;
    document.getElementById('modal-item-name').value = item.name;
    document.getElementById('modal-item-quantity').value = item.quantity;
    document.getElementById('modal-item-threshold').value = item.threshold;
    document.getElementById('modal-item-category').value = item.category_id;
    document.getElementById('modal-item-note').value = item.description||'';
    document.querySelector('.modal-title').innerText = 'Sửa vật dụng';
    document.getElementById('modal-save-btn').onclick = saveEditedItem;
    document.getElementById('add-item-modal').style.display = 'flex';
}
// Đóng modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
function resetModal() {
    ['modal-item-name','modal-item-quantity','modal-item-threshold','modal-item-category','modal-item-note']
    .forEach(id=>document.getElementById(id).value='');
}
    window.onclick = function(event) {
        const modal = document.getElementById('add-item-modal');
        if (event.target === modal) {
            closeModal('add-item-modal');
        }
    }

async function saveNewItem() {
    const data = collectModalData();
    await fetch(`${API_BASE}/items`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
    });
    closeModal(); loadInventory();
}
async function saveEditedItem() {
    const data = collectModalData();
    await fetch(`${API_BASE}/items/${currentEditId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
    });
    closeModal(); loadInventory();
}
function collectModalData() {
    return {
        name: document.getElementById('modal-item-name').value.trim(),
        quantity: parseInt(document.getElementById('modal-item-quantity').value)||0,
        threshold: parseInt(document.getElementById('modal-item-threshold').value)||1,
        category_id: document.getElementById('modal-item-category').value||null,
        description: document.getElementById('modal-item-note').value.trim()
    };
}

// Shopping list
// Load danh sách mua sắm
async function loadShoppingList() {
    const tbody = document.getElementById('shopping-list');
    const emptyState = document.getElementById('empty-shopping-list');
    const clearBtn = document.getElementById('clear-list-btn');
    
    try {
        const items = await fetchItems();
        tbody.innerHTML = '';
        
        if (items.length === 0) {
            emptyState.style.display = 'flex';
            clearBtn.disabled = true;
            return;
        }
        
        emptyState.style.display = 'none';
        clearBtn.disabled = false;
        
        items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.item_name}</td>
                <td>${item.quantity} ${item.unit || ''}</td>
                <td><span class="priority-status ${item.priority}">${getPriorityText(item.priority)}</span></td>
                <td><span class="item-status ${item.is_completed ? 'completed' : 'pending'}"><span class="status-dot"></span> ${item.is_completed ? 'Đã mua' : 'Chưa mua'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon complete-btn" onclick="toggleComplete(${item.id}, ${item.is_completed})" title="${item.is_completed ? 'Đánh dấu chưa mua' : 'Đánh dấu đã mua'}">
                            <i class="fas ${item.is_completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="btn-icon delete-btn" onclick="removeFromList(${item.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Lỗi khi tải danh sách mua sắm:', err);
        emptyState.style.display = 'flex';
        clearBtn.disabled = true;
    }
}
// Fetch danh sách mua sắm từ API
async function fetchItems() {
    const res = await fetch(`${API_BASE}/shopping-list`);
    if (!res.ok) throw new Error('Lỗi khi lấy danh sách mua sắm');
    return res.json();
}
async function drawShoppingItems(items) {
    const ul = document.getElementById('shopping-list'); const empty = document.getElementById('empty-shopping-list');
    ul.innerHTML = '';
    if (items.length===0) { empty.style.display='block'; return { length:0 }; }
    empty.style.display='none';
    items.forEach(i=>{
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="list-item-info">
                <input type="checkbox" onchange="toggleComplete(${i.id})" ${i.is_completed?'checked':''}>
                <span class="list-item-name ${i.is_completed?'completed':''}">${i.item_name}</span>
                <span class="list-item-quantity">${i.quantity} ${i.unit||''}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeFromList(${i.id})"><i class="fas fa-trash"></i></button>
        `;
        ul.appendChild(li);
    });
    return { length: items.length };
}
async function addToShopping(itemId, name) {
    await fetch(`${API_BASE}/shopping-list`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ item_id: itemId, item_name: name, quantity:1 })
    });
    loadShoppingList();
}
// Xóa item khỏi danh sách
async function removeFromList(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa vật dụng này khỏi danh sách?')) return;
    try {
        await fetch(`${API_BASE}/shopping-list/${id}`, {
            method: 'DELETE'
        });
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi xóa vật dụng:', err);
        alert('Đã xảy ra lỗi!');
    }
}
async function toggleComplete(id) {
    await fetch(`${API_BASE}/shopping-list/${id}/complete`,{ method:'PATCH' }); loadShoppingList();
}
// Xóa toàn bộ danh sách
async function clearShoppingList() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách mua sắm?')) return;
    try {
        await fetch(`${API_BASE}/shopping-list/clear`, {
            method: 'DELETE'
        });
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi xóa danh sách:', err);
        alert('Đã xảy ra lỗi!');
    }
}

// Export inventory (still client-side JSON)
function exportInventory() {
    // optional: re-fetch items and export
}
// Mở modal thêm mới
function openAddShoppingItemModal() {
    document.getElementById('add-shopping-item-modal').style.display = 'flex';
}


// Thêm item vào danh sách
async function addShoppingItem() {
    const name = document.getElementById('shopping-item-name').value.trim();
    const quantity = parseInt(document.getElementById('shopping-item-quantity').value) || 1;
    const unit = document.getElementById('shopping-item-unit').value.trim();
    const priority = document.getElementById('shopping-item-priority').value;
    const notes = document.getElementById('shopping-item-notes').value.trim();
    
    if (!name) {
        alert('Vui lòng nhập tên vật dụng!');
        return;
    }
    
    try {
        await fetch(`${API_BASE}/shopping-list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: name,
                quantity,
                unit: unit || null,
                priority,
                notes: notes || null
            })
        });
        closeModal('add-shopping-item-modal');
        resetAddForm();
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi thêm vật dụng:', err);
        alert('Đã xảy ra lỗi khi thêm vật dụng!');
    }
}
// Lấy văn bản ưu tiên
function getPriorityText(priority) {
    const priorities = {
        'normal': 'Bình thường',
        'high': 'Ưu tiên',
        'urgent': 'Khẩn cấp'
    };
    return priorities[priority] || 'Bình thường';
}
// Đánh dấu hoàn thành hoặc chưa hoàn thành
async function toggleComplete(id, isCompleted) {
    try {
        await fetch(`${API_BASE}/shopping-list/${id}/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: !isCompleted })
        });
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái:', err);
        alert('Đã xảy ra lỗi!');
    }
}
// Xóa item khỏi danh sách
async function removeFromList(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa vật dụng này khỏi danh sách?')) return;
    try {
        await fetch(`${API_BASE}/shopping-list/${id}`, {
            method: 'DELETE'
        });
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi xóa vật dụng:', err);
        alert('Đã xảy ra lỗi!');
    }
}
// Cập nhật số thứ tự
function updateRowNumbers() {
    const rows = document.querySelectorAll('#shopping-list tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Reset form thêm mới
function resetAddForm() {
    document.getElementById('shopping-item-name').value = '';
    document.getElementById('shopping-item-quantity').value = '1';
    document.getElementById('shopping-item-unit').value = '';
    document.getElementById('shopping-item-priority').value = 'normal';
    document.getElementById('shopping-item-notes').value = '';
}

// Kiểm tra trạng thái trống
function checkEmptyState() {
    const isEmpty = document.getElementById('shopping-list').children.length === 0;
    document.getElementById('empty-shopping-list').style.display = isEmpty ? 'flex' : 'none';
    document.getElementById('clear-list-btn').disabled = isEmpty;
}

// Xóa toàn bộ danh sách
async function clearShoppingList() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách mua sắm?')) return;
    try {
        await fetch(`${API_BASE}/shopping-list/clear`, {
            method: 'DELETE'
        });
        loadShoppingList();
    } catch (err) {
        console.error('Lỗi khi xóa danh sách:', err);
        alert('Đã xảy ra lỗi!');
    }
}

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
function closeModal() {
    document.getElementById('add-item-modal').style.display = 'none';
}
function resetModal() {
    ['modal-item-name','modal-item-quantity','modal-item-threshold','modal-item-category','modal-item-note']
    .forEach(id=>document.getElementById(id).value='');
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
async function loadShoppingList() {
    const ul = document.getElementById('shopping-list'); ul.innerHTML = '';
    const { length } = await drawShoppingItems(await fetchItems());
    document.getElementById('clear-list-btn').disabled = length===0;
}
async function fetchItems() {
    const res = await fetch(`${API_BASE}/shopping-list`);
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
async function removeFromList(id) {
    await fetch(`${API_BASE}/shopping-list/${id}`,{ method:'DELETE' }); loadShoppingList();
}
async function toggleComplete(id) {
    await fetch(`${API_BASE}/shopping-list/${id}/complete`,{ method:'PATCH' }); loadShoppingList();
}
async function clearShoppingList() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách mua sắm?')) return;
    await fetch(`${API_BASE}/shopping-list/clear`,{ method:'DELETE' }); loadShoppingList();
}

// Export inventory (still client-side JSON)
function exportInventory() {
    // optional: re-fetch items and export
}
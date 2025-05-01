const addExpenseBtn   = document.getElementById('addExpenseBtn');
const expenseModal    = document.getElementById('expenseModal');
const closeModalBtn   = document.getElementById('closeModal');
const cancelBtn       = document.getElementById('cancelBtn');
const expenseForm     = document.getElementById('expenseForm');
const tableBody       = document.getElementById('expensesTableBody');
const searchInput     = document.getElementById('searchInput');
const statusFilter    = document.getElementById('statusFilter');
const prevPageBtn     = document.getElementById('prevPage');
const nextPageBtn     = document.getElementById('nextPage');
const totalExpenseEl  = document.getElementById('totalExpense');
const avgExpenseEl    = document.getElementById('avgExpense');
const balanceEl       = document.getElementById('balance');
const chartCtx        = document.getElementById('expenseChart').getContext('2d');
const payerSelect     = document.getElementById('payer');

let expenses   = [];
let members    = [];
let currentPage = 1;
const perPage   = 10;
let chartInstance = null;

// --- Khởi động ---
window.addEventListener('load', async () => {
  await fetchMembers();
  await fetchExpenses();
});

// --- Lấy members để đổ vào <select> ---
async function fetchMembers() {
  const res = await fetch('/api/members_exp');
  members = await res.json();
  payerSelect.innerHTML = members
      .map(m => `<option value="${m.id}">${m.full_name}</option>`)
      .join('');
}

// --- Lấy expenses từ server ---
async function fetchExpenses() {
  const res = await fetch('/api/expenses_exp');
  expenses = await res.json();
  currentPage = 1;
  renderExpenses();
}

// --- Render bảng, filter, paginate ---
function filterExpenses() {
  const term   = searchInput.value.toLowerCase();
  const status = statusFilter.value;
  return expenses.filter(e =>
    e.description.toLowerCase().includes(term) &&
    (!status || e.status === status)
  );
}

function renderExpenses() {
  const filtered = filterExpenses();
  const totalPages = Math.ceil(filtered.length / perPage);
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  // Bảng
  tableBody.innerHTML = '';
  if (!pageItems.length) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;">Không có chi phí</td></tr>`;
  } else {
    pageItems.forEach(e => {
      const paidClass = e.status === 'Paid'
        ? 'status-paid' : 'status-pending';
      tableBody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td>${e.description}</td>
          <td>${formatCurrency(e.amount)}</td>
          <td>${e.payer_name}</td>
          <td><span class="status ${paidClass}">
                ${e.status==='Paid'?'Đã thanh toán':'Chưa thanh toán'}
              </span></td>
          <td>
            <button class="action-btn edit-btn" data-id="${e.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" data-id="${e.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `);
    });
  }

  // Pagination
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages===0;

  // Overview & Chart
  updateOverview(filtered);
  updateChart(filtered);
}

// --- Thống kê tổng, trung bình, cân bằng ---
function updateOverview(list) {
  const total = list.reduce((s,e)=>s+e.amount,0);
  const payers = [...new Set(list.map(e=>e.payer_name))];
  const avg   = payers.length ? total / payers.length : 0;
  const diffs = payers.map(p => {
    const paid = list.filter(e=>e.payer_name===p)
                     .reduce((s,e)=>s+e.amount,0);
    return paid - avg;
  });
  const maxBal = diffs.reduce((a,b)=>Math.max(a,Math.abs(b)),0);

  totalExpenseEl.textContent = formatCurrency(total);
  avgExpenseEl.textContent   = formatCurrency(avg);
  balanceEl.textContent      = formatCurrency(maxBal);
}

// --- Vẽ chart ---
function updateChart(list) {
  const payers = [...new Set(list.map(e=>e.payer_name))];
  const data   = payers.map(p =>
    list.filter(e=>e.payer_name===p).reduce((s,e)=>s+e.amount,0)
  );
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(chartCtx, {
    type: 'bar',
    data: {
      labels: payers,
      datasets: [{ label:'Chi phí (VND)', data }]
    },
    options: { responsive:true }
  });
}

// --- Format helpers ---
function formatDate(d) {
  return new Date(d)
    .toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function formatCurrency(v) {
  return v.toLocaleString('vi-VN',{style:'currency',currency:'VND'});
}


/////////////////////////////////////
// XỬ LÝ SỰ KIỆN CRUD           //
/////////////////////////////////////

// Mở modal thêm
addExpenseBtn.onclick = () => {
  expenseForm.reset();
  document.querySelector('.modal-title').textContent = 'Thêm chi phí';
  expenseModal.classList.add('active');
};

// Đóng modal
closeModalBtn.onclick = cancelBtn.onclick = () =>
  expenseModal.classList.remove('active');

// Submit form thêm/sửa
expenseForm.onsubmit = async e => {
  e.preventDefault();
  const payload = {
    date:        document.getElementById('date').value,
    description: document.getElementById('description').value,
    amount:      parseInt(document.getElementById('amount').value),
    payer_id:    parseInt(payerSelect.value),
    status:      document.getElementById('status').value
  };
  const expId = document.getElementById('date').dataset.editId;
  if (expId) {
    await fetch(`/api/expenses_exp/${expId}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    delete document.getElementById('date').dataset.editId;
  } else {
    await fetch('/api/expenses_exp', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
  }
  expenseModal.classList.remove('active');
  await fetchExpenses();
};

// Edit / Delete buttons
tableBody.addEventListener('click', async e => {
  const tr = e.target.closest('button');
  if (!tr) return;
  const id = tr.dataset.id;
  if (tr.classList.contains('edit-btn')) {
    // load dữ liệu vào form
    const exp = expenses.find(x=>x.id==id);
    document.getElementById('date').value       = exp.date;
    document.getElementById('description').value= exp.description;
    document.getElementById('amount').value     = exp.amount;
    payerSelect.value                           = exp.payer_id;
    document.getElementById('status').value     = exp.status;
    document.getElementById('date').dataset.editId = id;
    document.querySelector('.modal-title').textContent = 'Chỉnh sửa chi phí';
    expenseModal.classList.add('active');
  }
  if (tr.classList.contains('delete-btn')) {
    if (confirm('Xóa khoản chi này?')) {
      await fetch(`/api/expenses_exp/${id}`, { method:'DELETE' });
      await fetchExpenses();
    }
  }
});

// Search / Filter / Pagination
searchInput.oninput    =
statusFilter.onchange  = () => { currentPage=1; renderExpenses(); };
prevPageBtn.onclick    = () => { currentPage--; renderExpenses(); };
nextPageBtn.onclick    = () => { currentPage++; renderExpenses(); };

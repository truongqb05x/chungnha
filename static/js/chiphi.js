            // Expenses page functionality
            const addExpenseBtn = document.getElementById('addExpenseBtn');
            const expenseModal = document.getElementById('expenseModal');
            const closeModal = document.getElementById('closeModal');
            const cancelBtn = document.getElementById('cancelBtn');
            const expenseForm = document.getElementById('expenseForm');
            const expensesTableBody = document.getElementById('expensesTableBody');
            const searchInput = document.getElementById('searchInput');
            const statusFilter = document.getElementById('statusFilter');
            const prevPage = document.getElementById('prevPage');
            const nextPage = document.getElementById('nextPage');
            const totalExpense = document.getElementById('totalExpense');
            const avgExpense = document.getElementById('avgExpense');
            const balance = document.getElementById('balance');
            const expenseChart = document.getElementById('expenseChart').getContext('2d');

            let currentPage = 1;
            const expensesPerPage = 10;
            let expenses = [
                { id: 1, date: '2025-04-15', description: 'Mua nguyên liệu chợ', amount: 500000, payer: 'Nguyễn Minh', status: 'Paid' },
                { id: 2, date: '2025-04-16', description: 'Mua gia vị', amount: 100000, payer: 'Trần Hương', status: 'Pending' },
            ];

            let chartInstance = null;

            function renderExpenses() {
                const start = (currentPage - 1) * expensesPerPage;
                const end = start + expensesPerPage;
                const filteredExpenses = filterExpenses();
                const paginatedExpenses = filteredExpenses.slice(start, end);

                expensesTableBody.innerHTML = '';
                paginatedExpenses.forEach(expense => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formatDate(expense.date)}</td>
                        <td>${expense.description}</td>
                        <td>${formatCurrency(expense.amount)}</td>
                        <td>${expense.payer}</td>
                        <td><span class="status status-${expense.status.toLowerCase()}">${expense.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></td>
                        <td>
                            <button class="action-btn edit-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                            <button class="action-btn delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    expensesTableBody.appendChild(row);
                });

                updatePagination(filteredExpenses.length);
                updateOverview();
                updateChart();
            }

            function filterExpenses() {
                const searchTerm = searchInput.value.toLowerCase();
                const selectedStatus = statusFilter.value;

                return expenses.filter(expense => 
                    expense.description.toLowerCase().includes(searchTerm) &&
                    (!selectedStatus || expense.status === selectedStatus)
                );
            }

            function updatePagination(totalExpenses) {
                const totalPages = Math.ceil(totalExpenses / expensesPerPage);
                prevPage.disabled = currentPage === 1;
                nextPage.disabled = currentPage === totalPages;

                const pagination = document.querySelector('.pagination');
                const pageButtons = pagination.querySelectorAll('.pagination-btn:not(#prevPage):not(#nextPage)');
                pageButtons.forEach(btn => btn.remove());

                for (let i = 1; i <= totalPages; i++) {
                    const btn = document.createElement('button');
                    btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
                    btn.textContent = i;
                    btn.addEventListener('click', () => {
                        currentPage = i;
                        renderExpenses();
                    });
                    nextPage.before(btn);
                }
            }

            function updateOverview() {
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const members = [...new Set(expenses.map(e => e.payer))];
                const avg = members.length ? total / members.length : 0;
                const balancePerMember = members.map(payer => {
                    const paid = expenses.filter(e => e.payer === payer).reduce((sum, e) => sum + e.amount, 0);
                    return paid - avg;
                });
                const maxBalance = Math.max(...balancePerMember.map(Math.abs));

                totalExpense.textContent = formatCurrency(total);
                avgExpense.textContent = formatCurrency(avg);
                balance.textContent = formatCurrency(maxBalance);
            }

            function updateChart() {
                const members = [...new Set(expenses.map(e => e.payer))];
                const data = members.map(payer => {
                    return expenses.filter(e => e.payer === payer).reduce((sum, e) => sum + e.amount, 0);
                });

                if (chartInstance) {
                    chartInstance.destroy();
                }

                chartInstance = new Chart(expenseChart, {
                    type: 'bar',
                    data: {
                        labels: members,
                        datasets: [{
                            label: 'Chi phí (VND)',
                            data: data,
                            backgroundColor: 'rgba(255, 109, 40, 0.6)',
                            borderColor: 'rgba(255, 109, 40, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: value => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            }

            function formatDate(dateStr) {
                const date = new Date(dateStr);
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }

            function formatCurrency(amount) {
                return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
            }

            addExpenseBtn.addEventListener('click', () => {
                expenseModal.classList.add('active');
                expenseForm.reset();
                document.querySelector('.modal-title').textContent = 'Thêm chi phí';
            });

            closeModal.addEventListener('click', () => {
                expenseModal.classList.remove('active');
            });

            cancelBtn.addEventListener('click', () => {
                expenseModal.classList.remove('active');
            });

            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const date = document.getElementById('date').value;
                const description = document.getElementById('description').value;
                const amount = parseInt(document.getElementById('amount').value);
                const payer = document.getElementById('payer').value;
                const status = document.getElementById('status').value;

                const newExpense = {
                    id: expenses.length + 1,
                    date,
                    description,
                    amount,
                    payer,
                    status
                };

                expenses.push(newExpense);
                expenseModal.classList.remove('active');
                renderExpenses();
            });

            expensesTableBody.addEventListener('click', (e) => {
                if (e.target.closest('.edit-btn')) {
                    const id = e.target.closest('.edit-btn').dataset.id;
                    const expense = expenses.find(e => e.id == id);
                    expenseModal.classList.add('active');
                    document.querySelector('.modal-title').textContent = 'Chỉnh sửa chi phí';
                    document.getElementById('date').value = expense.date;
                    document.getElementById('description').value = expense.description;
                    document.getElementById('amount').value = expense.amount;
                    document.getElementById('payer').value = expense.payer;
                    document.getElementById('status').value = expense.status;

                    expenseForm.onsubmit = (e) => {
                        e.preventDefault();
                        expense.date = document.getElementById('date').value;
                        expense.description = document.getElementById('description').value;
                        expense.amount = parseInt(document.getElementById('amount').value);
                        expense.payer = document.getElementById('payer').value;
                        expense.status = document.getElementById('status').value;
                        expenseModal.classList.remove('active');
                        renderExpenses();
                        expenseForm.onsubmit = null;
                    };
                }

                if (e.target.closest('.delete-btn')) {
                    const id = e.target.closest('.delete-btn').dataset.id;
                    if (confirm('Bạn có chắc muốn xóa chi phí này?')) {
                        expenses = expenses.filter(e => e.id != id);
                        renderExpenses();
                    }
                }
            });

            searchInput.addEventListener('input', () => {
                currentPage = 1;
                renderExpenses();
            });

            statusFilter.addEventListener('change', () => {
                currentPage = 1;
                renderExpenses();
            });

            prevPage.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderExpenses();
                }
            });

            nextPage.addEventListener('click', () => {
                const totalExpenses = filterExpenses().length;
                if (currentPage < Math.ceil(totalExpenses / expensesPerPage)) {
                    currentPage++;
                    renderExpenses();
                }
            });

            renderExpenses();
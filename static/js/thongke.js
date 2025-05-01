document.addEventListener('DOMContentLoaded', function() {

    // Statistics page functionality
    const timeRange = document.getElementById('timeRange');
    const memberFilter = document.getElementById('memberFilter');
    const expenseType = document.getElementById('expenseType');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const dateRangeGroups = document.querySelectorAll('.date-range-group');
    const refreshBtn = document.getElementById('refreshBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const exportBtn = document.getElementById('exportBtn');
    const totalExpense = document.getElementById('totalExpense');
    const totalCooking = document.getElementById('totalCooking');
    const totalDishes = document.getElementById('totalDishes');
    const totalMembers = document.getElementById('totalMembers');
    const expenseChartCtx = document.getElementById('expenseChart').getContext('2d');
    const cookingChartCtx = document.getElementById('cookingChart').getContext('2d');
    const dishesChartCtx = document.getElementById('dishesChart').getContext('2d');
    const expenseChartUpdated = document.getElementById('expenseChartUpdated');
    const cookingChartUpdated = document.getElementById('cookingChartUpdated');
    const dishesChartUpdated = document.getElementById('dishesChartUpdated');

    let expenseChartInstance = null;
    let cookingChartInstance = null;
    let dishesChartInstance = null;

    // Biến lưu trữ dữ liệu từ API
    let expenses = [];
    let schedules = [];
    let menus = [];

    // Hàm lấy dữ liệu từ API
    async function fetchData() {
        try {
            const [expensesRes, schedulesRes, menusRes] = await Promise.all([
                fetch('/api/expenses'),
                fetch('/api/schedules'),
                fetch('/api/menus')
            ]);

            if (!expensesRes.ok || !schedulesRes.ok || !menusRes.ok) {
                throw new Error('Lỗi khi tải dữ liệu');
            }

            expenses = await expensesRes.json();
            schedules = await schedulesRes.json();
            menus = await menusRes.json();

            updateStatistics();
        } catch (error) {
            showNotification('Lỗi khi tải dữ liệu: ' + error.message);
            console.error(error);
        }
    }

    // Format date to display
    function formatDate(date) {
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Format time to display
    function formatTime(date) {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get current date time for last updated
    function getCurrentDateTime() {
        const now = new Date();
        return `Cập nhật lúc ${formatTime(now)} ${formatDate(now)}`;
    }

    // Show date range inputs when custom is selected
    timeRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            dateRangeGroups.forEach(group => group.style.display = 'flex');
        } else {
            dateRangeGroups.forEach(group => group.style.display = 'none');
            startDate.value = '';
            endDate.value = '';
        }
    });

    // Get filtered data based on current filters
    function getFilteredData() {
        const selectedTimeRange = timeRange.value;
        const selectedMember = memberFilter.value;
        const selectedExpenseType = expenseType.value;
        const start = startDate.value ? new Date(startDate.value) : null;
        const end = endDate.value ? new Date(endDate.value) : null;

        let startDateFilter, endDateFilter;
        const now = new Date(); // Current date
        
        if (start && end) {
            startDateFilter = start;
            endDateFilter = end;
        } else {
            if (selectedTimeRange === 'week') {
                startDateFilter = new Date(now);
                startDateFilter.setDate(now.getDate() - 7);
                endDateFilter = now;
            } else if (selectedTimeRange === 'month') {
                startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
                endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (selectedTimeRange === 'year') {
                startDateFilter = new Date(now.getFullYear(), 0, 1);
                endDateFilter = new Date(now.getFullYear(), 11, 31);
            } else {
                // Default to month if no range selected
                startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
                endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        }

        return {
            expenses: expenses.filter(e => {
                const date = new Date(e.date);
                return (!selectedMember || e.payer === selectedMember) &&
                       (!selectedExpenseType || e.type === selectedExpenseType) &&
                       date >= startDateFilter && date <= endDateFilter;
            }),
            schedules: schedules.filter(s => {
                const date = new Date(s.date);
                return (!selectedMember || s.cook === selectedMember) &&
                       date >= startDateFilter && date <= endDateFilter;
            }),
            menus: menus.filter(m => {
                const date = new Date(m.date);
                return date >= startDateFilter && date <= endDateFilter;
            })
        };
    }

    // Update overview cards
    function updateOverview() {
        const { expenses, schedules, menus } = getFilteredData();
        
        const totalExpenseValue = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalCookingValue = schedules.length;
        const totalDishesValue = menus.reduce((sum, m) => sum + m.dishes.split(',').length, 0);
        
        // Get unique members who cooked
        const cookingMembers = [...new Set(schedules.map(s => s.cook))];
        const totalMembersValue = cookingMembers.length;

        totalExpense.textContent = formatCurrency(totalExpenseValue);
        totalCooking.textContent = totalCookingValue;
        totalDishes.textContent = totalDishesValue;
        totalMembers.textContent = totalMembersValue;
    }

    // Update charts with filtered data
    function updateCharts() {
        const { expenses, schedules, menus } = getFilteredData();
        const currentDateTime = getCurrentDateTime();

        // Expense Chart (Bar)
        const expenseData = {};
        expenses.forEach(e => {
            const date = new Date(e.date);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const key = `${day}/${month}/${year}`;
            
            expenseData[key] = (expenseData[key] || 0) + e.amount;
        });

        const expenseLabels = Object.keys(expenseData).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/').map(Number);
            const [dayB, monthB, yearB] = b.split('/').map(Number);
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });
        
        const expenseValues = expenseLabels.map(label => expenseData[label]);

        // Check if there's data for expense chart
        if (expenseLabels.length === 0) {
            expenseChartCtx.canvas.style.display = 'none';
            let message = expenseChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (!message) {
                message = document.createElement('div');
                message.className = 'no-data-message';
                message.textContent = 'Không có dữ liệu chi phí để hiển thị.';
                expenseChartCtx.canvas.parentNode.insertBefore(message, expenseChartCtx.canvas.nextSibling);
            }
            expenseChartUpdated.textContent = currentDateTime;
        } else {
            expenseChartCtx.canvas.style.display = 'block';
            const message = expenseChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (message) message.remove();

            if (expenseChartInstance) expenseChartInstance.destroy();
            expenseChartInstance = new Chart(expenseChartCtx, {
                type: 'bar',
                data: {
                    labels: expenseLabels,
                    datasets: [{
                        label: 'Chi phí (VND)',
                        data: expenseValues,
                        backgroundColor: 'rgba(255, 109, 40, 0.6)',
                        borderColor: 'rgba(255, 109, 40, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        hoverBackgroundColor: 'rgba(255, 109, 40, 0.8)',
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
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
            expenseChartUpdated.textContent = currentDateTime;
        }

        // Cooking Chart (Pie)
        const cookingData = {};
        schedules.forEach(s => {
            cookingData[s.cook] = (cookingData[s.cook] || 0) + 1;
        });

        const cookingLabels = Object.keys(cookingData);
        const cookingValues = Object.values(cookingData);

        // Check if there's data for cooking chart
        if (cookingLabels.length === 0) {
            cookingChartCtx.canvas.style.display = 'none';
            let message = cookingChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (!message) {
                message = document.createElement('div');
                message.className = 'no-data-message';
                message.textContent = 'Không có dữ liệu ca nấu để hiển thị.';
                cookingChartCtx.canvas.parentNode.insertBefore(message, cookingChartCtx.canvas.nextSibling);
            }
            cookingChartUpdated.textContent = currentDateTime;
        } else {
            cookingChartCtx.canvas.style.display = 'block';
            const message = cookingChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (message) message.remove();

            if (cookingChartInstance) cookingChartInstance.destroy();
            cookingChartInstance = new Chart(cookingChartCtx, {
                type: 'pie',
                data: {
                    labels: cookingLabels,
                    datasets: [{
                        label: 'Số ca nấu',
                        data: cookingValues,
                        backgroundColor: [
                            'rgba(255, 109, 40, 0.6)',
                            'rgba(58, 152, 185, 0.6)',
                            'rgba(255, 184, 48, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                        ],
                        borderColor: [
                            'rgba(255, 109, 40, 1)',
                            'rgba(58, 152, 185, 1)',
                            'rgba(255, 184, 48, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                        ],
                        borderWidth: 1,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const value = context.raw;
                                    const percentage = Math.round((value / total) * 100);
                                    return ` ${value} ca (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            cookingChartUpdated.textContent = currentDateTime;
        }

        // Dishes Chart (Line)
        const dishesData = {};
        menus.forEach(m => {
            const date = new Date(m.date);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const key = `${day}/${month}/${year}`;
            dishesData[key] = (dishesData[key] || 0) + m.dishes.split(',').length;
        });

        const dishesLabels = Object.keys(dishesData).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/').map(Number);
            const [dayB, monthB, yearB] = b.split('/').map(Number);
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });
        const dishesValues = dishesLabels.map(label => dishesData[label]);

        // Check if there's data for dishes chart
        if (dishesLabels.length === 0) {
            dishesChartCtx.canvas.style.display = 'none';
            let message = dishesChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (!message) {
                message = document.createElement('div');
                message.className = 'no-data-message';
                message.textContent = 'Không có dữ liệu món ăn để hiển thị.';
                dishesChartCtx.canvas.parentNode.insertBefore(message, dishesChartCtx.canvas.nextSibling);
            }
            dishesChartUpdated.textContent = currentDateTime;
        } else {
            dishesChartCtx.canvas.style.display = 'block';
            const message = dishesChartCtx.canvas.parentNode.querySelector('.no-data-message');
            if (message) message.remove();

            if (dishesChartInstance) dishesChartInstance.destroy();
            dishesChartInstance = new Chart(dishesChartCtx, {
                type: 'line',
                data: {
                    labels: dishesLabels,
                    datasets: [{
                        label: 'Số món ăn',
                        data: dishesValues,
                        fill: false,
                        borderColor: 'rgba(255, 109, 40, 1)',
                        backgroundColor: 'rgba(255, 109, 40, 0.1)',
                        tension: 0.3,
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(255, 109, 40, 1)',
                        pointRadius: dishesLabels.length === 1 ? 6 : 4,
                        pointHoverRadius: dishesLabels.length === 1 ? 8 : 6,
                        showLine: dishesLabels.length > 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.raw} món`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
            dishesChartUpdated.textContent = currentDateTime;
        }
    }

    // Format currency
    function formatCurrency(amount) {
        return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }

    // Export report to CSV
    function exportCSV() {
        const { expenses, schedules, menus } = getFilteredData();
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Loại,Dữ liệu\n";
        csvContent += `Tổng chi phí,${expenses.reduce((sum, e) => sum + e.amount, 0)}\n`;
        csvContent += `Số ca nấu,${schedules.length}\n`;
        csvContent += `Số món ăn,${menus.reduce((sum, m) => sum + m.dishes.split(',').length, 0)}\n\n`;
        
        csvContent += "Chi phí\nNgày,Mô tả,Số tiền,Người chi,Loại\n";
        expenses.forEach(e => {
            csvContent += `${e.date},"${e.description}",${e.amount},${e.payer},${e.type}\n`;
        });

        csvContent += "\nLịch nấu\nNgày,Bữa ăn,Người nấu,Số món\n";
        schedules.forEach(s => {
            csvContent += `${s.date},${s.meal},${s.cook},${s.dishes}\n`;
        });

        csvContent += "\nThực đơn\nNgày,Món ăn\n";
        menus.forEach(m => {
            csvContent += `${m.date},"${m.dishes}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'bao_cao_thong_ke.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Xuất file CSV thành công!');
    }

    // Export chart to PNG
    function exportChartPNG(chartId) {
        const canvas = document.getElementById(chartId);
        const link = document.createElement('a');
        link.download = `bieu_do_${chartId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showNotification(`Xuất biểu đồ ${chartId} thành ảnh PNG thành công!`);
    }

    // Export full report to PDF
    function exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('BÁO CÁO THỐNG KÊ BẾP CHUNG', 105, 15, { align: 'center' });
        
        // Add date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 105, 22, { align: 'center' });
        
        // Add overview
        doc.setFontSize(12);
        doc.text('TỔNG QUAN', 14, 30);
        
        doc.setFontSize(10);
        doc.text(`Tổng chi phí: ${totalExpense.textContent}`, 14, 37);
        doc.text(`Số ca nấu: ${totalCooking.textContent}`, 60, 37);
        doc.text(`Số món ăn: ${totalDishes.textContent}`, 105, 37);
        doc.text(`Thành viên tham gia: ${totalMembers.textContent}`, 150, 37);
        
        // Add charts
        const charts = ['expenseChart', 'cookingChart', 'dishesChart'];
        let yPosition = 50;
        
        // Function to add chart to PDF
        const addChartToPDF = (chartId, title, y) => {
            return new Promise(resolve => {
                const canvas = document.getElementById(chartId);
                const canvasImage = canvas.toDataURL('image/jpeg', 1.0);
                
                doc.setFontSize(12);
                doc.text(title.toUpperCase(), 14, y);
                
                doc.addImage(canvasImage, 'JPEG', 14, y + 5, 180, 80);
                resolve(y + 90);
            });
        };
        
        // Add all charts sequentially
        addChartToPDF('expenseChart', 'Chi phí theo thời gian', yPosition)
            .then(newY => addChartToPDF('cookingChart', 'Ca nấu theo thành viên', newY))
            .then(newY => addChartToPDF('dishesChart', 'Món ăn theo ngày', newY))
            .then(() => {
                // Save the PDF
                doc.save('bao_cao_thong_ke.pdf');
                showNotification('Xuất báo cáo PDF thành công!');
            });
    }

    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 24px';
        notification.style.backgroundColor = 'var(--primary)';
        notification.style.color = 'white';
        notification.style.borderRadius = 'var(--radius-md)';
        notification.style.boxShadow = 'var(--shadow-md)';
        notification.style.zIndex = '1000';
        notification.style.animation = 'fadeIn 0.3s ease-out';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Reset all filters
    function resetFilters() {
        timeRange.value = 'month';
        memberFilter.value = '';
        expenseType.value = '';
        startDate.value = '';
        endDate.value = '';
        dateRangeGroups.forEach(group => group.style.display = 'none');
        updateStatistics();
    }

    // Update all statistics
    function updateStatistics() {
        updateOverview();
        updateCharts();
    }

    // Event listeners
    timeRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            dateRangeGroups.forEach(group => group.style.display = 'flex');
        } else {
            dateRangeGroups.forEach(group => group.style.display = 'none');
            startDate.value = '';
            endDate.value = '';
        }
        updateStatistics();
    });

    memberFilter.addEventListener('change', updateStatistics);
    expenseType.addEventListener('change', updateStatistics);
    startDate.addEventListener('change', updateStatistics);
    endDate.addEventListener('change', updateStatistics);
    refreshBtn.addEventListener('click', fetchData);
    resetFilterBtn.addEventListener('click', resetFilters);

    // Export button with dropdown options
    exportBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'export-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.backgroundColor = 'var(--card-bg)';
        dropdown.style.borderRadius = 'var(--radius-md)';
        dropdown.style.boxShadow = 'var(--shadow-md)';
        dropdown.style.padding = '0.5rem 0';
        dropdown.style.zIndex = '100';
        dropdown.style.minWidth = '200px';
        
        // Add options
        const options = [
            { icon: 'file-csv', text: 'Xuất CSV', action: exportCSV },
            { icon: 'file-pdf', text: 'Xuất PDF', action: exportPDF }
        ];
        
        options.forEach(opt => {
            const option = document.createElement('div');
            option.className = 'export-option';
            option.style.padding = '0.5rem 1rem';
            option.style.display = 'flex';
            option.style.alignItems = 'center';
            option.style.gap = '0.75rem';
            option.style.cursor = 'pointer';
            option.style.transition = 'var(--transition)';
            
            option.innerHTML = `
                <i class="fas fa-${opt.icon}"></i>
                <span>${opt.text}</span>
            `;
            
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                opt.action();
                dropdown.remove();
            });
            
            option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--border)';
            });
            
            option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            dropdown.appendChild(option);
        });
        
        // Position dropdown
        const rect = this.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
        
        // Add to DOM
        document.body.appendChild(dropdown);
        
        // Close dropdown when clicking outside
        const closeDropdown = function(e) {
            if (!dropdown.contains(e.target) && e.target !== exportBtn) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        document.addEventListener('click', closeDropdown);
    });

    // Chart actions
    document.querySelectorAll('.chart-actions').forEach(actions => {
        actions.addEventListener('click', function(e) {
            const action = e.target.closest('[data-action]');
            if (!action) return;
            
            const chartId = this.closest('.chart-container').querySelector('canvas').id;
            
            switch (action.dataset.action) {
                case 'export-png':
                    exportChartPNG(chartId);
                    break;
                case 'toggle-data':
                    // Toggle chart data visibility
                    break;
            }
        });
    });

    // Initialize
    fetchData();
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(10px); }
        }
        .notification {
            animation: fadeIn 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
});
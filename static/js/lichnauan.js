document.addEventListener('DOMContentLoaded', async function() {
    const addBtn     = document.getElementById('addScheduleBtn');
    const modal      = document.getElementById('scheduleModal');
    const closeBtn   = document.getElementById('closeModal');
    const cancelBtn  = document.getElementById('cancelBtn');
    const form       = document.getElementById('scheduleForm');
    const tbody      = document.getElementById('scheduleTableBody');
    const searchIn   = document.getElementById('searchInput');
    const mealF      = document.getElementById('mealFilter');
    const statusF    = document.getElementById('statusFilter');
    const prevPage   = document.getElementById('prevPage');
    const nextPage   = document.getElementById('nextPage');
    const calGrid    = document.getElementById('calendarGrid');
    const calTitle   = document.getElementById('calendarTitle');
    const prevMon    = document.getElementById('prevMonth');
    const nextMon    = document.getElementById('nextMonth');
    const cookSel    = document.getElementById('cook');
  
    let schedules   = [];
    let members     = [];
    let currentPage = 1;
    const perPage   = 10;
    let currentMonth = new Date();
  
    // 1) Load members
    async function fetchMembers() {
      const res = await fetch('/api/members_sched');
      members = await res.json();
      cookSel.innerHTML = members
        .map(m => `<option value="${m.id}">${m.full_name}</option>`)
        .join('');
    }
  
    // 2) Load schedules và chuẩn hoá ngày
    async function fetchSchedules() {
      const res = await fetch('/api/schedules_sched');
      let data = await res.json();
      schedules = data.map(s => ({
        ...s,
        date: new Date(s.date).toISOString().split('T')[0]
      }));
      console.log('Normalized schedules:', schedules);
      currentPage = 1;
      renderAll();
    }
  
    // 3) Lọc
    function filterList() {
      const term = searchIn.value.toLowerCase();
      const mF   = mealF.value;
      const sF   = statusF.value;
      return schedules.filter(s =>
        s.cook_name.toLowerCase().includes(term) &&
        (!mF  || s.meal   === mF) &&
        (!sF  || s.status === sF)
      );
    }
  
    // 4) Render Table
    function renderTable(list) {
      tbody.innerHTML = '';
      const start = (currentPage-1)*perPage;
      const pageItems = list.slice(start, start+perPage);
      if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1rem">Không có ca</td></tr>`;
      } else {
        for (let s of pageItems) {
          tbody.insertAdjacentHTML('beforeend', `
            <tr>
              <td>${formatDate(s.date)}</td>
              <td>${translateMeal(s.meal)}</td>
              <td>${s.cook_name}</td>
              <td><span class="status status-${s.status.toLowerCase()}">
                    ${s.status==='Completed'?'Hoàn thành':'Chưa hoàn thành'}
                  </span></td>
              <td>
                <button class="action-btn edit-btn" data-id="${s.id}">
                  <i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${s.id}">
                  <i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `);
        }
      }
      const totalPages = Math.ceil(list.length / perPage);
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages || totalPages===0;
    }
  
    // 5) Render Calendar
    function renderCalendar() {
      calGrid.innerHTML = '';
      ['T2','T3','T4','T5','T6','T7','CN']
        .forEach(d => calGrid.insertAdjacentHTML('beforeend',
          `<div class="calendar-day calendar-day-header">${d}</div>`));
  
      const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const offset = firstDay === 0 ? 6 : firstDay - 1;
  
      for (let i = 0; i < offset; i++)
        calGrid.insertAdjacentHTML('beforeend','<div class="calendar-day"></div>');
  
      const dim = new Date(year, month+1, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        const dateStr = new Date(year, month, d).toISOString().split('T')[0];
        const daySch = schedules.filter(s => s.date === dateStr);
        const cls = daySch.length ? 'calendar-day has-schedule' : 'calendar-day';
  
        let cell = `
          <div class="${cls}" data-date="${dateStr}">
            <div class="calendar-cell">
              <div class="date-number">${d}</div>
              ${daySch.map(s => 
                `<div class="calendar-event">${translateMeal(s.meal)}: ${s.cook_name}</div>`
              ).join('')}
            </div>
          </div>`;
        calGrid.insertAdjacentHTML('beforeend', cell);
      }
  
      calTitle.textContent =
        `${currentMonth.toLocaleString('vi',{month:'long'})}, ${year}`;
    }
  
    // 6) Render All
    function renderAll() {
      const filtered = filterList();
      renderTable(filtered);
      renderCalendar();
    }
  
    // 7) Helpers
    function formatDate(ds) {
      return new Date(ds).toLocaleDateString('vi-VN',
        { day:'2-digit', month:'2-digit', year:'numeric' });
    }
    function translateMeal(m) {
      return { Breakfast:'Bữa sáng', Lunch:'Bữa trưa', Dinner:'Bữa tối' }[m];
    }
  
    // 8) CRUD API
    async function createSchedule(d) {
      await fetch('/api/schedules_sched', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(d)
      });
      await fetchSchedules();
    }
    async function updateSchedule(id,d) {
      await fetch(`/api/schedules_sched/${id}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(d)
      });
      await fetchSchedules();
    }
    async function deleteSchedule(id) {
      await fetch(`/api/schedules_sched/${id}`, { method:'DELETE' });
      await fetchSchedules();
    }
  
    // 9) UI Events
    addBtn.onclick = () => {
      form.reset();
      document.querySelector('.modal-title').textContent = 'Thêm ca nấu';
      delete form.dataset.editId;
      modal.classList.add('active');
    };
    closeBtn.onclick = cancelBtn.onclick = () => modal.classList.remove('active');
  
    form.onsubmit = async e => {
      e.preventDefault();
      const payload = {
        date: document.getElementById('date').value,
        meal: document.getElementById('meal').value,
        cook_id: parseInt(cookSel.value),
        status: document.getElementById('status').value
      };
      if (form.dataset.editId) {
        await updateSchedule(form.dataset.editId, payload);
        delete form.dataset.editId;
      } else {
        await createSchedule(payload);
      }
      modal.classList.remove('active');
    };
  
    tbody.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains('edit-btn')) {
        const s = schedules.find(x => x.id == id);
        document.getElementById('date').value   = s.date;
        document.getElementById('meal').value   = s.meal;
        cookSel.value                           = s.cook_id;
        document.getElementById('status').value = s.status;
        form.dataset.editId = id;
        document.querySelector('.modal-title').textContent = 'Chỉnh sửa ca nấu';
        modal.classList.add('active');
      }
      if (btn.classList.contains('delete-btn') && confirm('Xóa ca này?')) {
        await deleteSchedule(id);
      }
    });
  
    searchIn.oninput = mealF.onchange = statusF.onchange = () => { currentPage = 1; renderAll(); };
    prevPage.onclick  = () => { if (currentPage>1) { currentPage--; renderTable(filterList()); } };
    nextPage.onclick  = () => {
      const tp = Math.ceil(filterList().length / perPage);
      if (currentPage < tp) { currentPage++; renderTable(filterList()); }
    };
    prevMon.onclick   = () => { currentMonth.setMonth(currentMonth.getMonth()-1); renderCalendar(); };
    nextMon.onclick   = () => { currentMonth.setMonth(currentMonth.getMonth()+1); renderCalendar(); };
  
    // Initialize
    await fetchMembers();
    await fetchSchedules();
  });
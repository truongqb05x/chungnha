/**
 * Menu Management Application
 * Handles calendar, table, and card views for menu planning
 * with search, filter, pagination, and sorting capabilities
 */

/**
 * Configuration constants
 */
const CONFIG = {
  menusPerPage: 5,
  defaultView: 'calendar',
  defaultStatus: 'Preparing',
  apiEndpoints: {
    menus: '/menus_api',
    menu: '/menu_api',
    userGroups: '/user_groups_api'
  }
};

/**
* Application state
*/
const state = {
  currentMonth: new Date(),
  currentPage: 1,
  sort: { column: 'menu_date', direction: 'asc' },
  confirm: { action: null, params: null },
  groupId: null
};

/**
* Initialize application when DOM is loaded
*/
document.addEventListener('DOMContentLoaded', initializeApp);

/**
* Sets up the application
*/
async function initializeApp() {
  state.groupId = await getDefaultGroupId();
  if (!state.groupId) {
      showToast('Bạn chưa tham gia nhóm nào. Vui lòng tham gia một nhóm.');
      return;
  }
  setupEventListeners();
  setDefaultDate();
  loadPreferredView();
}

/**
* Sets today's date in the date picker
*/
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
}

/**
* Loads and sets up the user's preferred view
*/
function loadPreferredView() {
  const viewButtons = document.querySelectorAll('.view-btn');
  const viewSections = document.querySelectorAll('.view-section');
  const preferredView = localStorage.getItem('preferredView') || CONFIG.defaultView;
  const defaultViewButton = document.querySelector(`.view-btn[data-view="${preferredView}"]`) ||
    document.querySelector(`.view-btn[data-view="${CONFIG.defaultView}"]`);

  viewButtons.forEach(button => {
      button.addEventListener('click', function() {
          const view = this.dataset.view;

          // Update active button state
          viewButtons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');

          // Show selected view
          viewSections.forEach(section => section.style.display = 'none');
          document.getElementById(`${view}View`).style.display = 'block';

          // Save preference
          localStorage.setItem('preferredView', view);

          // Reset currentMonth to current month for calendar view
          if (view === 'calendar') {
              state.currentMonth = new Date();
          }

          // Render appropriate view
          const renderFunctions = {
              calendar: renderCalendar,
              table: renderTableView,
              cards: renderCardsView
          };
          renderFunctions[view]?.();
      });
  });

  // Trigger the default view
  defaultViewButton.click();
}

/**
* Gets the default group ID for the user
* @returns {Promise<number|null>} The group ID or null if no groups
*/
async function getDefaultGroupId() {
  try {
      const response = await fetch(CONFIG.apiEndpoints.userGroups, { credentials: 'include' });
      if (!response.ok) {
          if (response.status === 401) {
              window.location.href = '/login';
              return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const groups = await response.json();
      return groups.length > 0 ? groups[0].group_id : null;
  } catch (error) {
      console.error('Error fetching user groups:', error);
      showToast('Lỗi khi lấy danh sách nhóm');
      return null;
  }
}

/**
* Sets up all event listeners
*/
function setupEventListeners() {
  setupModalListeners();
  setupCalendarListeners();
  setupSearchAndFilterListeners();
  setupPaginationListeners();
  setupSortingListeners();
}

/**
* Sets up modal-related event listeners
*/
function setupModalListeners() {
  const elements = {
      addMenuBtn: document.getElementById('addMenuBtn'),
      menuModal: document.getElementById('menuModal'),
      closeModal: document.getElementById('closeModal'),
      cancelBtn: document.getElementById('cancelBtn'),
      menuForm: document.getElementById('menuForm'),
      confirmModal: document.getElementById('confirmModal'),
      closeConfirmModal: document.getElementById('closeConfirmModal'),
      cancelConfirmBtn: document.getElementById('cancelConfirmBtn'),
      confirmBtn: document.getElementById('confirmBtn')
  };

  // Add menu buttons
  [elements.addMenuBtn, ...document.querySelectorAll('[id*="addMenuEmptyBtn"]')]
      .filter(Boolean)
      .forEach(btn => btn.addEventListener('click', () => openMenuModal('add')));

  // Modal close buttons
  [elements.closeModal, elements.cancelBtn].forEach(btn =>
      btn.addEventListener('click', () => elements.menuModal.classList.remove('active'))
  );

  [elements.closeConfirmModal, elements.cancelConfirmBtn].forEach(btn =>
      btn.addEventListener('click', () => elements.confirmModal.classList.remove('active'))
  );

  // Confirm action
  elements.confirmBtn.addEventListener('click', () => {
      if (state.confirm.action) {
          state.confirm.action(...state.confirm.params);
          elements.confirmModal.classList.remove('active');
      }
  });

  // Form submission
  elements.menuForm.addEventListener('submit', async e => {
      e.preventDefault();
      
      if (!state.groupId) {
          showToast('Vui lòng chọn một nhóm trước khi thêm/cập nhật thực đơn');
          return;
      }

      const formData = {
          group_id: state.groupId,
          menu_date: document.getElementById('date').value,
          dishes: document.getElementById('dishes').value,
          cooks: document.getElementById('cooks').value,
          status: document.getElementById('status').value,
          notes: document.getElementById('notes').value
      };

      try {
          const isEditMode = elements.menuForm.dataset.mode === 'edit';
          const url = isEditMode 
              ? `${CONFIG.apiEndpoints.menu}/${elements.menuForm.dataset.id}`
              : CONFIG.apiEndpoints.menu;
          const method = isEditMode ? 'PUT' : 'POST';

          const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
              credentials: 'include'
          });
          
          const result = await response.json();
          if (result.error) throw new Error(result.error);

          showToast(isEditMode ? 'Cập nhật thực đơn thành công' : 'Thêm thực đơn thành công');
          elements.menuModal.classList.remove('active');
          
          // Refresh all views
          Promise.all([
              renderCalendar(),
              renderTableView(),
              renderCardsView()
          ]);
      } catch (error) {
          if (error.message.includes('chưa đăng nhập')) {
              showToast('Vui lòng đăng nhập để tiếp tục');
              window.location.href = '/login';
          } else if (error.message.includes('thành viên hoạt động')) {
              showToast('Bạn không có quyền truy cập nhóm này. Vui lòng kiểm tra tư cách thành viên.');
          } else {
              showToast(`Lỗi: ${error.message}`);
          }
      }
  });
}

/**
* Opens the menu modal in specified mode
* @param {string} mode - 'add' or 'edit'
*/
function openMenuModal(mode) {
  const modal = document.getElementById('menuModal');
  const form = document.getElementById('menuForm');
  const modalTitle = document.querySelector('.modal-title');

  modal.classList.add('active');
  form.reset();
  setDefaultDate();

  if (mode === 'add') {
      modalTitle.textContent = 'Thêm thực đơn';
      document.getElementById('status').value = CONFIG.defaultStatus;
      form.dataset.mode = 'add';
      delete form.dataset.id;
  }
}

/**
* Sets up calendar navigation listeners
*/
function setupCalendarListeners() {
  const actions = {
      prevMonth: () => {
          state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
          renderCalendar();
      },
      nextMonth: () => {
          state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
          renderCalendar();
      },
      today: () => {
          state.currentMonth = new Date();
          renderCalendar();
      }
  };

  ['prevMonth', 'nextMonth', 'todayBtn'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', actions[id])
  );
}

/**
* Sets up search and filter listeners for all views
*/
function setupSearchAndFilterListeners() {
  const views = ['', 'Table', 'Cards'];
  
  views.forEach(view => {
      ['searchInput', 'statusFilter', 'dateFilter'].forEach(type => {
          const element = document.getElementById(`${type}${view}`);
          if (element) {
              element.addEventListener('input', () => {
                  state.currentPage = 1;
                  Promise.all([
                      view === '' ? updateCalendarHighlights() : null,
                      view === '' || view === 'Table' ? renderTableView() : null,
                      view === '' || view === 'Cards' ? renderCardsView() : null
                  ].filter(Boolean));
              });
          }
      });
  });
}

/**
* Sets up pagination listeners for all views
*/
function setupPaginationListeners() {
  const views = ['', 'Table', 'Cards'];
  
  views.forEach(view => {
      const prev = document.getElementById(`prevPage${view}`);
      const next = document.getElementById(`nextPage${view}`);

      prev?.addEventListener('click', () => {
          if (state.currentPage > 1) {
              state.currentPage--;
              renderViews(view);
          }
      });

      next?.addEventListener('click', async () => {
          const { total } = await fetchMenus(view.toLowerCase() || 'all');
          if (state.currentPage < Math.ceil(total / CONFIG.menusPerPage)) {
              state.currentPage++;
              renderViews(view);
          }
      });
  });

  function renderViews(view) {
      const renders = {
          '': () => Promise.all([renderTableView(), renderCardsView()]),
          Table: renderTableView,
          Cards: renderCardsView
      };
      renders[view]?.();
  }
}

/**
* Sets up table sorting listeners
*/
function setupSortingListeners() {
  const columnMap = {
      'Ngày': 'menu_date',
      'Món ăn': 'dishes',
      'Người nấu': 'cooks',
      'Trạng thái': 'status'
  };

  document.querySelectorAll('.menu-table th i.fa-sort').forEach(icon => {
      icon.addEventListener('click', () => {
          const column = icon.parentElement.textContent.trim();
          const mappedColumn = columnMap[column];

          if (state.sort.column === mappedColumn) {
              state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
          } else {
              state.sort.column = mappedColumn;
              state.sort.direction = 'asc';
          }
          
          renderTableView();
      });
  });
}

/**
* Fetches menus from API with filters
* @param {string} view - View type ('all', 'table', 'cards', 'calendar')
* @returns {Promise<Object>} Menus and total count
*/
async function fetchMenus(view = 'all') {
  if (!state.groupId) {
      showToast('Vui lòng chọn một nhóm trước khi tải thực đơn');
      return { menus: [], total: 0 };
  }

  const inputs = {
      all: ['searchInput', 'statusFilter', 'dateFilter'],
      calendar: ['searchInput', 'statusFilter', 'dateFilter'],
      table: ['searchInputTable', 'statusFilterTable', 'dateFilterTable'],
      cards: ['searchInputCards', 'statusFilterCards', 'dateFilterCards']
  };

  const [search, status, date] = inputs[view].map(id => 
      document.getElementById(id)?.value?.toLowerCase() || ''
  );

  const params = new URLSearchParams({
      group_id: state.groupId,
      search,
      status,
      date,
      page: state.currentPage,
      per_page: CONFIG.menusPerPage,
      sort_column: state.sort.column,
      sort_direction: state.sort.direction
  });

  try {
      const response = await fetch(`${CONFIG.apiEndpoints.menus}?${params}`, { credentials: 'include' });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
  } catch (error) {
      console.error('Error fetching menus:', error);
      if (error.message.includes('chưa đăng nhập')) {
          showToast('Vui lòng đăng nhập để tiếp tục');
          window.location.href = '/login';
      } else if (error.message.includes('thành viên hoạt động')) {
          showToast('Bạn không có quyền truy cập nhóm này. Vui lòng kiểm tra tư cách thành viên.');
      } else if (error.message.includes('group_id')) {
          showToast('Vui lòng chọn một nhóm hợp lệ');
      } else {
          showToast('Lỗi khi tải dữ liệu thực đơn');
      }
      return { menus: [], total: 0 };
  }
}

/**
* Renders the calendar view
*/
async function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  calendarGrid.innerHTML = '';

  // Render day headers
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  days.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day calendar-day-header';
      header.textContent = day;
      calendarGrid.appendChild(header);
  });

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  // Add empty cells
  for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty-day';
      calendarGrid.appendChild(empty);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const params = new URLSearchParams({
          group_id: state.groupId,
          start_date: startDate,
          end_date: endDate,
          view: 'calendar'
      });
      const response = await fetch(`${CONFIG.apiEndpoints.menus}?${params}`, { credentials: 'include' });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      const menuMap = data.menus.reduce((map, menu) => {
          const date = new Date(menu.menu_date).toISOString().split('T')[0];
          map[date] = map[date] || [];
          map[date].push(menu);
          return map;
      }, {});

      for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          const dayMenus = menuMap[dateStr] || [];
          const isToday = date.toDateString() === today.toDateString();
          const hasMenu = dayMenus.length > 0;

          const dayElement = document.createElement('div');
          dayElement.className = `calendar-day ${hasMenu ? 'has-menu' : ''} ${isToday ? 'today' : ''}`;
          dayElement.dataset.date = dateStr;

          const dayNumber = document.createElement('div');
          dayNumber.className = 'calendar-day-number';
          dayNumber.textContent = day;
          dayElement.appendChild(dayNumber);

          if (hasMenu) {
              const firstDish = dayMenus[0].dishes.split('\n')[0];
              const preview = document.createElement('div');
              preview.className = 'calendar-day-menu';
              preview.textContent = firstDish;
              dayElement.appendChild(preview);
          }

          if (hasMenu) {
              dayElement.addEventListener('click', () => {
                  document.getElementById('dateFilter').value = dateStr;
                  state.currentPage = 1;
                  Promise.all([renderTableView(), renderCardsView()]);
              });
          }

          calendarGrid.appendChild(dayElement);
      }

      document.getElementById('calendarTitle').textContent = 
          `${state.currentMonth.toLocaleString('vi', { month: 'long' })} ${year}`;
  } catch (error) {
      console.error('Error rendering calendar:', error);
      if (error.message.includes('chưa đăng nhập')) {
          showToast('Vui lòng đăng nhập để xem lịch');
          window.location.href = '/login';
      } else if (error.message.includes('thành viên hoạt động')) {
          showToast('Bạn không có quyền truy cập nhóm này. Vui lòng kiểm tra tư cách thành viên.');
      } else if (error.message.includes('group_id')) {
          showToast('Vui lòng chọn một nhóm hợp lệ');
      } else {
          showToast(`Lỗi khi tải lịch: ${error.message}`);
      }
  }
}

/**
* Updates calendar highlights based on filters
*/
async function updateCalendarHighlights() {
  try {
      const { menus } = await fetchMenus('calendar');
      const menuDates = new Set(menus.map(menu => menu.menu_date));

      document.querySelectorAll('.calendar-day').forEach(day => {
          if (day.dataset.date) {
              day.classList.toggle('has-menu', menuDates.has(day.dataset.date));
          }
      });
  } catch (error) {
      showToast(`Lỗi cập nhật lịch: ${error.message}`);
  }
}

/**
* Renders the table view
*/
async function renderTableView() {
  const tableBody = document.getElementById('menuTableBodyTable');
  const emptyState = document.getElementById('emptyStateTable');

  try {
      const { menus, total } = await fetchMenus('table');
      tableBody.innerHTML = '';

      emptyState.style.display = menus.length === 0 ? 'block' : 'none';

      menus.forEach(menu => {
          const row = document.createElement('tr');
          row.innerHTML = `
              <td>${formatDate(menu.menu_date)}</td>
              <td>${menu.dishes.replace(/\n/g, '<br>')}</td>
              <td>${menu.cooks}</td>
              <td><span class="status status-${menu.status.toLowerCase()}">
                  <i class="fas fa-${menu.status === 'Preparing' ? 'clock' : 'check'}"></i>
                  ${menu.status === 'Preparing' ? 'Đang chuẩn bị' : 'Hoàn thành'}
              </span></td>
              <td>
                  <div class="action-btns">
                      <button class="action-btn edit-btn" data-id="${menu.id}" title="Chỉnh sửa">
                          <i class="fas fa-edit"></i>
                      </button>
                      <button class="action-btn delete-btn" data-id="${menu.id}" title="Xóa">
                          <i class="fas fa-trash"></i>
                      </button>
                  </div>
              </td>
          `;
          tableBody.appendChild(row);
      });

      updatePagination(total, 'table');
      setupTableActionListeners();
  } catch (error) {
      showToast(`Lỗi: ${error.message}`);
  }
}

/**
* Renders the cards view
*/
async function renderCardsView() {
  const container = document.getElementById('cardsContainer');
  const emptyState = document.getElementById('emptyStateCards');

  try {
      const { menus, total } = await fetchMenus('cards');
      container.innerHTML = '';

      emptyState.style.display = menus.length === 0 ? 'block' : 'none';

      menus.forEach(menu => {
          const card = document.createElement('div');
          card.className = 'menu-card';
          card.innerHTML = `
              <div class="menu-card-header">
                  <div class="menu-card-date">${formatDate(menu.menu_date)}</div>
                  <div class="menu-card-status status status-${menu.status.toLowerCase()}">
                      <i class="fas fa-${menu.status === 'Preparing' ? 'clock' : 'check'}"></i>
                      ${menu.status === 'Preparing' ? 'Đang chuẩn bị' : 'Hoàn thành'}
                  </div>
              </div>
              <div class="menu-card-dishes">${menu.dishes.replace(/\n/g, '<br>')}</div>
              <div class="menu-card-cooks">
                  <i class="fas fa-user"></i> ${menu.cooks}
              </div>
              ${menu.notes ? `<div class="menu-card-notes">${menu.notes}</div>` : ''}
              <div class="menu-card-actions">
                  <button class="action-btn edit-btn" data-id="${menu.id}" title="Chỉnh sửa">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="action-btn delete-btn" data-id="${menu.id}" title="Xóa">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          `;
          container.appendChild(card);
      });

      updatePagination(total, 'cards');
      setupCardsActionListeners();
  } catch (error) {
      showToast(`Lỗi: ${error.message}`);
  }
}

/**
* Sets up action listeners for table view
*/
function setupTableActionListeners() {
  setupActionListeners('.edit-btn', handleEdit);
  setupActionListeners('.delete-btn', handleDelete);
}

/**
* Sets up action listeners for cards view
*/
function setupCardsActionListeners() {
  setupActionListeners('.menu-card .edit-btn', handleEdit);
  setupActionListeners('.menu-card .delete-btn', handleDelete);
}

/**
* Sets up action listeners for given selector
* @param {string} selector - CSS selector for buttons
* @param {Function} handler - Event handler function
*/
function setupActionListeners(selector, handler) {
  document.querySelectorAll(selector).forEach(btn =>
      btn.addEventListener('click', () => handler(parseInt(btn.dataset.id)))
  );
}

/**
* Handles edit action
* @param {number} id - Menu ID
*/
async function handleEdit(id) {
  try {
      const params = new URLSearchParams({ group_id: state.groupId });
      const response = await fetch(`${CONFIG.apiEndpoints.menu}/${id}?${params}`, { credentials: 'include' });
      const menu = await response.json();
      if (menu.error) throw new Error(menu.error);

      const modal = document.getElementById('menuModal');
      const form = document.getElementById('menuForm');

      modal.classList.add('active');
      document.querySelector('.modal-title').textContent = 'Chỉnh sửa thực đơn';
      
      document.getElementById('date').value = menu.menu_date;
      document.getElementById('dishes').value = menu.dishes;
      document.getElementById('cooks').value = menu.cooks;
      document.getElementById('status').value = menu.status;
      document.getElementById('notes').value = menu.notes || '';
      
      form.dataset.mode = 'edit';
      form.dataset.id = id;
  } catch (error) {
      if (error.message.includes('chưa đăng nhập')) {
          showToast('Vui lòng đăng nhập để tiếp tục');
          window.location.href = '/login';
      } else if (error.message.includes('thành viên hoạt động')) {
          showToast('Bạn không có quyền truy cập nhóm này. Vui lòng kiểm tra tư cách thành viên.');
      } else if (error.message.includes('group_id')) {
          showToast('Vui lòng chọn một nhóm hợp lệ');
      } else {
          showToast(`Lỗi: ${error.message}`);
      }
  }
}

/**
* Handles delete action
* @param {number} id - Menu ID
*/
function handleDelete(id) {
  showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa thực đơn này?',
      async () => {
          try {
              const params = new URLSearchParams({ group_id: state.groupId });
              const response = await fetch(`${CONFIG.apiEndpoints.menu}/${id}?${params}`, {
                  method: 'DELETE',
                  credentials: 'include'
              });
              const result = await response.json();
              if (result.error) throw new Error(result.error);

              showToast('Đã xóa thực đơn');
              Promise.all([
                  renderCalendar(),
                  renderTableView(),
                  renderCardsView()
              ]);
          } catch (error) {
              if (error.message.includes('chưa đăng nhập')) {
                  showToast('Vui lòng đăng nhập để tiếp tục');
                  window.location.href = '/login';
              } else if (error.message.includes('thành viên hoạt động')) {
                  showToast('Bạn không có quyền truy cập nhóm này. Vui lòng kiểm tra tư cách thành viên.');
              } else if (error.message.includes('group_id')) {
                  showToast('Vui lòng chọn một nhóm hợp lệ');
              } else {
                  showToast(`Lỗi: ${error.message}`);
              }
          }
      }
  );
}

/**
* Updates pagination controls
* @param {number} total - Total number of menus
* @param {string} view - View type
*/
function updatePagination(total, view = 'all') {
  const totalPages = Math.ceil(total / CONFIG.menusPerPage);
  const prefix = view === 'all' ? '' : view;
  const prev = document.getElementById(`prevPage${prefix}`);
  const next = document.getElementById(`nextPage${prefix}`);
  const pageNumbers = document.getElementById(`pageNumbers${prefix}`);

  if (!pageNumbers) return;

  prev.disabled = state.currentPage === 1;
  next.disabled = state.currentPage === totalPages || totalPages === 0;
  pageNumbers.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `btn ${i === state.currentPage ? 'btn-primary' : 'btn-outline'}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
          state.currentPage = i;
          const renders = {
              'all': () => Promise.all([renderTableView(), renderCardsView()]),
              table: renderTableView,
              cards: renderCardsView
          };
          renders[view.toLowerCase()]?.();
      });
      pageNumbers.appendChild(btn);
  }
}

/**
* Formats date for display
* @param {string} dateStr - Date string
* @returns {string} Formatted date
*/
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
  });
}

/**
* Shows confirmation dialog
* @param {string} title - Dialog title
* @param {string} message - Dialog message
* @param {Function} action - Action to perform
* @param {...any} params - Action parameters
*/
function showConfirm(title, message, action, ...params) {
  document.getElementById('confirmMessage').textContent = message;
  document.querySelector('#confirmModal .modal-title').textContent = title;
  state.confirm.action = action;
  state.confirm.params = params;
  document.getElementById('confirmModal').classList.add('active');
}

/**
* Shows toast notification
* @param {string} message - Message to display
*/
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

/**
* Resets all filters
*/
function resetFilters() {
  ['searchInput', 'searchInputTable', 'searchInputCards',
   'statusFilter', 'statusFilterTable', 'statusFilterCards',
   'dateFilter', 'dateFilterTable', 'dateFilterCards']
      .forEach(id => {
          const element = document.getElementById(id);
          if (element) element.value = '';
      });
}
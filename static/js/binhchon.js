const GROUP_ID = document.body.dataset.groupId;
const MEMBER_ID = document.body.dataset.memberId;

const voteNameInput = document.getElementById('vote-name');
const voteTypeSelect = document.getElementById('vote-type');
const voteDateInput = document.getElementById('vote-date');
const voteList = document.getElementById('vote-list');
const resultsList = document.getElementById('results-list');
const addVoteBtn = document.getElementById('add-vote-btn');
const totalMembersEl = document.getElementById('total-members');

// Validate initial data
if (!GROUP_ID || !MEMBER_ID) {
  console.error('Missing GROUP_ID or MEMBER_ID');
  alert('Error: Unable to load group or member data.');
}

// Initialize app
window.addEventListener('DOMContentLoaded', async () => {
  voteDateInput.valueAsDate = new Date();
  addVoteBtn.addEventListener('click', addVoteItem);
  voteDateInput.addEventListener('change', renderAll);
  await renderMemberCount();
  await renderAll();
});

// Fetch total members
async function renderMemberCount() {
  try {
    const res = await fetch(`/api/group/${GROUP_ID}/members/count`);
    if (!res.ok) throw new Error('Failed to fetch member count');
    const { total_members } = await res.json();
    totalMembersEl.textContent = total_members || 0;
  } catch (error) {
    console.error(error);
    totalMembersEl.textContent = 'Error';
  }
}

// Fetch vote items
async function fetchVoteItems(date) {
  try {
    const res = await fetch(`/api/group/${GROUP_ID}/vote_items?date=${date}`);
    if (!res.ok) throw new Error('Failed to fetch vote items');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Render vote list
function renderVoteList(items) {
  voteList.innerHTML = '';
  const total = parseInt(totalMembersEl.textContent, 10) || 1;

  items.forEach(item => {
    const percent = Math.round((item.votes * 100) / total);
    const hasVoted = item.voters.includes(parseInt(MEMBER_ID, 10));

    const div = document.createElement('div');
    div.className = 'vote-item';
    div.innerHTML = `
      <div class="vote-info">
        <h3>${item.name}</h3>
        <p>${item.type === 'food' ? '🍲 Món ăn' : '🎉 Hoạt động'} • ${new Date(item.vote_date).toLocaleDateString('vi-VN')}</p>
        <div class="vote-progress"><div class="vote-progress-bar" style="width:${percent}%"></div></div>
      </div>
      <div class="vote-count">${item.votes}/${total} phiếu (${percent}%)</div>
      <button class="vote-btn" data-id="${item.id}" ${hasVoted ? 'disabled' : ''}>
        ${hasVoted ? '<i class="fas fa-check-circle"></i> Đã bình chọn' : '<i class="fas fa-vote-yea"></i> Bình chọn'}
      </button>
    `;
    voteList.appendChild(div);
  });

  // Attach event listeners to vote buttons
  voteList.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => castVote(btn.dataset.id));
  });
}

// Render results
function renderResults(items) {
  resultsList.innerHTML = '';
  const total = parseInt(totalMembersEl.textContent, 10) || 1;

  const grouped = items.reduce((acc, v) => {
    const key = `${v.type}-${v.vote_date}`;
    (acc[key] = acc[key] || []).push(v);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([key, arr]) => {
    const [type, date] = key.split('-');
    arr.sort((a, b) => b.votes - a.votes);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'result-group';
    const sumVotes = arr.reduce((s, i) => s + i.votes, 0); // Fixed typo: removed 'viscous'
    groupDiv.innerHTML = `
      <h3>${type === 'food' ? '🍲 Món ăn' : '🎉 Hoạt động'} • ${new Date(date).toLocaleDateString('vi-VN')}
        <span class="total-votes">${sumVotes}/${total} phiếu</span>
      </h3>
    `;

    arr.forEach(item => {
      const pct = Math.round((item.votes * 100) / total);
      const voters = item.voters.map(id => (id == MEMBER_ID ? `<strong>${id}</strong>` : id)).join(', ') || 'Chưa có ai bình chọn';

      const itemDiv = document.createElement('div');
      itemDiv.className = 'result-item';
      itemDiv.innerHTML = `
        <div class="result-header"><span>${item.name}</span><span class="result-percentage">${pct}%</span></div>
        <div class="vote-progress"><div class="vote-progress-bar" style="width:${pct}%"></div></div>
        <div class="result-voters"><i class="fas fa-user-check"></i> ${voters}</div>
      `;
      groupDiv.appendChild(itemDiv);
    });

    resultsList.appendChild(groupDiv);
  });
}
// Render all
async function renderAll() {
  const date = voteDateInput.value || new Date().toISOString().slice(0, 10);
  const items = await fetchVoteItems(date);
  renderVoteList(items);
  renderResults(items);
}

// Add vote item
async function addVoteItem() {
  const name = voteNameInput.value.trim();
  const type = voteTypeSelect.value;
  const date = voteDateInput.value;
  const memberId = parseInt(MEMBER_ID, 10);

  // Xác thực dữ liệu
  if (!name) return alert('Vui lòng nhập tên mục bình chọn!');
  if (!date) return alert('Vui lòng chọn ngày!');
  if (!type) return alert('Vui lòng chọn loại bình chọn!');
  if (!['food', 'activity'].includes(type)) return alert('Lỗi: Loại bình chọn không hợp lệ.');
  if (!GROUP_ID) return alert('Lỗi: GROUP_ID không hợp lệ.');
  if (isNaN(memberId)) {
    console.error('Invalid MEMBER_ID:', MEMBER_ID);
    return alert('Lỗi: MEMBER_ID không hợp lệ.');
  }

  console.log('GROUP_ID:', GROUP_ID, 'MEMBER_ID:', memberId);
  const payload = { name, type, vote_date: date, member_id: memberId };
  console.log('Sending request:', payload);

  try {
    const res = await fetch(`/api/group/${GROUP_ID}/vote_items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Server error:', res.status, errorData);
      throw new Error(errorData.error || `Không thể thêm mục bình chọn (Mã lỗi: ${res.status})`);
    }
    voteNameInput.value = '';
    await renderAll();
  } catch (error) {
    console.error('addVoteItem error:', error);
    alert(`Lỗi khi thêm mục bình chọn: ${error.message}`);
  }
}

// Cast vote
async function castVote(id) {
  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_item_id: id, member_id: MEMBER_ID }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Failed to cast vote');
    }
    await renderAll();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
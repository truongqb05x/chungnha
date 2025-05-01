const GROUP_ID  = document.body.dataset.groupId;
const MEMBER_ID = document.body.dataset.memberId;

const voteNameInput  = document.getElementById('vote-name');
const voteTypeSelect = document.getElementById('vote-type');
const voteDateInput  = document.getElementById('vote-date');
const voteList       = document.getElementById('vote-list');
const resultsList    = document.getElementById('results-list');
const addVoteBtn     = document.getElementById('add-vote-btn');
const totalMembersEl = document.getElementById('total-members');

// Khởi tạo app
window.addEventListener('DOMContentLoaded', async () => {
  voteDateInput.valueAsDate = new Date();
  addVoteBtn.addEventListener('click', addVoteItem);
  voteDateInput.addEventListener('change', renderAll);
  await renderMemberCount();
  await renderAll();
});

// Lấy tổng thành viên
async function renderMemberCount() {
  const res = await fetch(`/api/group/${GROUP_ID}/members/count`);
  const { total_members } = await res.json();
  totalMembersEl.textContent = total_members;
}

// Hiển thị vote list và results
async function renderAll() {
  const items = await fetchVoteItems(voteDateInput.value);
  renderVoteList(items);
  renderResults(items);
}

// Fetch vote items từ API
async function fetchVoteItems(date) {
  const res = await fetch(`/api/group/${GROUP_ID}/vote_items?date=${date}`);
  return res.ok ? await res.json() : [];
}

// Render danh sách vote
function renderVoteList(items) {
    voteList.innerHTML = '';
    const total = parseInt(totalMembersEl.textContent, 10) || 1;
  
    items.forEach(item => {
      const percent = Math.round(item.votes * 100 / total);
      const hasVoted = item.voters.includes(parseInt(MEMBER_ID, 10)); // Kiểm tra xem người dùng đã bình chọn chưa
  
      const div = document.createElement('div');
      div.className = 'vote-item';
      div.innerHTML = `
        <div class="vote-info">
          <h3>${item.name}</h3>
          <p>${item.type === 'food' ? '🍲 Món ăn' : '🎉 Hoạt động'} • ${new Date(item.vote_date).toLocaleDateString('vi-VN')}</p>
          <div class="vote-progress"><div class="vote-progress-bar" style="width:${percent}%"></div></div>
        </div>
        <div class="vote-count">${item.votes}/${total} phiếu (${percent}%)</div>
        <button class="vote-btn" onclick="castVote(${item.id})" ${hasVoted ? 'disabled' : ''}>
          ${hasVoted ? '<i class="fas fa-check-circle"></i> Đã bình chọn' : '<i class="fas fa-vote-yea"></i> Bình chọn'}
        </button>
      `;
      voteList.appendChild(div);
    });
  }

// Render kết quả
function renderResults(items) {
  resultsList.innerHTML = '';
  const total = parseInt(totalMembersEl.textContent, 10) || 1;

  const grouped = items.reduce((acc, v) => {
    const key = `${v.type}-${v.vote_date}`;
    (acc[key] = acc[key]||[]).push(v);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([key, arr]) => {
    const [type, date] = key.split('-');
    arr.sort((a,b)=>b.votes-a.votes);

    const groupDiv = document.createElement('div');
    groupDiv.className = 'result-group';
    const sumVotes = arr.reduce((s,i)=>s+i.votes,0);
    groupDiv.innerHTML = `
      <h3>${type==='food'?'🍲 Món ăn':'🎉 Hoạt động'} • ${new Date(date).toLocaleDateString('vi-VN')}
        <span class="total-votes">${sumVotes}/${total} phiếu</span>
      </h3>
    `;

    arr.forEach(item => {
      const pct = Math.round(item.votes*100/total);
      const voters = item.voters.map(id=> id==MEMBER_ID? `<strong>${id}</strong>`:id).join(', ') || 'Chưa có ai bình chọn';

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

// Thêm mục vote
async function addVoteItem() {
  const name = voteNameInput.value.trim();
  const type = voteTypeSelect.value;
  const date = voteDateInput.value;
  if (!name || !date) return alert('Nhập đủ tên và ngày!');

  await fetch(`/api/group/${GROUP_ID}/vote_items`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name, type, vote_date: date, member_id: MEMBER_ID })
  });
  voteNameInput.value = '';
  await renderAll();
}

// Cast vote
async function castVote(id) {
    const res = await fetch('/api/vote', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ vote_item_id: id, member_id: MEMBER_ID })
    });
    if (!res.ok) {
      const e = await res.json(); 
      return alert(e.error);
    }
    await renderAll(); // Hiển thị lại danh sách vote và kết quả mới
  }
  
async function loadVoteItems() {
    const voteDate = voteDateInput.value || new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/group/${GROUP_ID}/vote_items?date=${voteDate}`);
    const data = await res.json();

    voteList.innerHTML = '';
    resultsList.innerHTML = '';

    let maxVotes = 0;
    data.forEach(item => {
        maxVotes = Math.max(maxVotes, item.votes);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'vote-item';
        itemDiv.innerHTML = ` 
            <span>${item.name} (${item.type === 'food' ? 'Món ăn' : 'Hoạt động'})</span>
            <button data-id="${item.id}">Bình chọn</button>
            <div class="voters">${item.voters.join(', ')}</div>
        `;
        voteList.appendChild(itemDiv);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `
            <span>${item.name}</span>
            <div class="bar-container">
                <div class="bar" style="width: ${(item.votes / maxVotes) * 100 || 0}%;"></div>
                <span class="vote-count">${item.votes} phiếu</span>
            </div>
        `;
        resultsList.appendChild(resultDiv);
    });

    document.querySelectorAll('.vote-item button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const voteItemId = btn.dataset.id;
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote_item_id: voteItemId, member_id: MEMBER_ID })
            });

            const result = await res.json();
            if (res.status === 201) {
                alert('Bình chọn thành công!');
                loadVoteItems();
            } else {
                alert(result.error || 'Lỗi khi bỏ phiếu.');
            }
        });
    });
}

addVoteBtn.addEventListener('click', async () => {
    const name = voteNameInput.value;
    const type = voteTypeSelect.value;
    const voteDate = voteDateInput.value || new Date().toISOString().slice(0, 10);

    if (!name) return alert('Vui lòng nhập tên mục.');

    const res = await fetch(`/api/group/${GROUP_ID}/vote_items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, vote_date: voteDate, member_id: MEMBER_ID })
    });

    if (res.status === 201) {
        voteNameInput.value = '';
        loadVoteItems();
    } else {
        alert('Lỗi khi thêm mục bình chọn.');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    voteDateInput.addEventListener('change', loadVoteItems);
    loadVoteItems(); // Load initial data
});

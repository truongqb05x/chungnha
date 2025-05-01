// Voting management system with percentage display
let votes = JSON.parse(localStorage.getItem('votes')) || [
    { id: 1, name: 'Phở bò', type: 'food', date: '2025-05-04', votes: 3, voters: ['NM', 'TV', 'HT'] },
    { id: 2, name: 'Đi chợ cuối tuần', type: 'activity', date: '2025-05-04', votes: 2, voters: ['NM', 'TV'] },
    { id: 3, name: 'Cơm rang', type: 'food', date: '2025-05-04', votes: 1, voters: ['HT'] }
];

// Group members data
const groupMembers = ['NM', 'TV', 'HT', 'LD', 'PQ'];
let currentUser = 'NM'; // Simulated current user

// DOM elements
const voteNameInput = document.getElementById('vote-name');
const voteTypeSelect = document.getElementById('vote-type');
const voteDateInput = document.getElementById('vote-date');

// Save votes to localStorage
function saveVotes() {
    localStorage.setItem('votes', JSON.stringify(votes));
}

// Format date to display
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
}

// Render voting list
function renderVotes() {
    const voteList = document.getElementById('vote-list');
    voteList.innerHTML = '';
    
    // Update member count display
    document.getElementById('total-members').textContent = groupMembers.length;

    votes.forEach(vote => {
        const hasVoted = vote.voters.includes(currentUser);
        const votePercentage = Math.round((vote.votes / groupMembers.length) * 100);
        
        const voteItem = document.createElement('div');
        voteItem.className = 'vote-item';
        voteItem.innerHTML = `
            <div class="vote-info">
                <h3>${vote.name}</h3>
                <p>${vote.type === 'food' ? '🍲 Món ăn' : '🎉 Hoạt động'} • ${formatDate(vote.date)}</p>
                <div class="vote-progress">
                    <div class="vote-progress-bar" style="width: ${votePercentage}%"></div>
                </div>
            </div>
            <div class="vote-count">
                ${vote.votes}/${groupMembers.length} phiếu (${votePercentage}%)
            </div>
            <button class="vote-btn" onclick="castVote(${vote.id})" ${hasVoted ? 'disabled' : ''}>
                ${hasVoted ? '<i class="fas fa-check-circle"></i> Đã bình chọn' : '<i class="fas fa-vote-yea"></i> Bình chọn'}
            </button>
        `;
        voteList.appendChild(voteItem);
    });

    renderResults();
}

// Render results with percentage
function renderResults() {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    // Group votes by type and date
    const groupedVotes = votes.reduce((acc, vote) => {
        const key = `${vote.type}-${vote.date}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(vote);
        return acc;
    }, {});

    // Sort and display results
    Object.entries(groupedVotes).forEach(([key, items]) => {
        const [type, date] = key.split('-');
        items.sort((a, b) => b.votes - a.votes);

        const resultGroup = document.createElement('div');
        resultGroup.className = 'result-group';
        resultGroup.innerHTML = `
            <h3>
                ${type === 'food' ? '🍲 Món ăn' : '🎉 Hoạt động'} • ${formatDate(date)}
                <span class="total-votes">${items.reduce((sum, item) => sum + item.votes, 0)}/${groupMembers.length} phiếu</span>
            </h3>
        `;
        
        items.forEach(item => {
            const percentage = Math.round((item.votes / groupMembers.length) * 100);
            const votersList = item.voters.map(voter => {
                // Highlight current user in voters list
                return voter === currentUser ? `<strong>${voter}</strong>` : voter;
            }).join(', ');

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-header">
                    <span>${item.name}</span>
                    <span class="result-percentage">${percentage}%</span>
                </div>
                <div class="vote-progress">
                    <div class="vote-progress-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="result-voters">
                    <i class="fas fa-user-check"></i> ${votersList || 'Chưa có ai bình chọn'}
                </div>
            `;
            resultGroup.appendChild(resultItem);
        });
        resultsList.appendChild(resultGroup);
    });
}

// Add new vote item
window.addVoteItem = function() {
    const voteName = voteNameInput.value.trim();
    const voteType = voteTypeSelect.value;
    const voteDate = voteDateInput.value;

    if (!voteName) {
        alert('Vui lòng nhập tên món ăn/hoạt động!');
        return;
    }

    if (!voteDate) {
        alert('Vui lòng chọn ngày bình chọn!');
        return;
    }

    const newId = votes.length > 0 ? Math.max(...votes.map(v => v.id)) + 1 : 1;
    votes.push({
        id: newId,
        name: voteName,
        type: voteType,
        date: voteDate,
        votes: 0,
        voters: []
    });

    // Reset form
    voteNameInput.value = '';
    voteDateInput.value = '';
    voteNameInput.focus();

    saveVotes();
    renderVotes();
};

// Cast a vote
window.castVote = function(voteId) {
    const vote = votes.find(v => v.id === voteId);
    
    if (!vote) return;
    
    if (vote.voters.includes(currentUser)) {
        alert('Bạn đã bình chọn cho mục này rồi!');
        return;
    }

    vote.votes++;
    vote.voters.push(currentUser);
    saveVotes();
    renderVotes();
};

// Reset votes weekly
function resetWeeklyVotes() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    votes = votes.filter(vote => {
        const voteDate = new Date(vote.date);
        return voteDate >= weekStart;
    });

    votes.forEach(vote => {
        vote.votes = 0;
        vote.voters = [];
    });

    saveVotes();
    renderVotes();
    alert('Đã reset bình chọn tuần mới!');
}

// Initialize the app
function initApp() {
    // Set default date to today
    voteDateInput.valueAsDate = new Date();
    
    // Add event listeners
    voteNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addVoteItem();
    });
    
    renderVotes();
    
    // Schedule weekly reset
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);
    const timeToNextSunday = nextSunday - now;

    setTimeout(() => {
        resetWeeklyVotes();
        setInterval(resetWeeklyVotes, 7 * 24 * 60 * 60 * 1000);
    }, timeToNextSunday);
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
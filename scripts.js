let leaderboardData = [];
let sortConfig = { column: 'rank', direction: 'asc' };
const userModal = new bootstrap.Modal(document.getElementById('userModal'));

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchLeaderboard();
    setInterval(fetchLeaderboard, 30000);
    setupEventListeners();
});

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    if (!isDarkMode) {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later,aturi

function setupEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('refresh-btn').addEventListener('click', fetchLeaderboard);
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
    document.getElementById('search-input').addEventListener('input', debounce(filterTable, 300));

    document.querySelectorAll('thead th[data-sort]').forEach(header => {
        header.addEventListener('click', () => sortTable(header.getAttribute('data-sort')));
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortTable(header.getAttribute('data-sort'));
            }
        });
    });

    document.getElementById('leaderboard-body').addEventListener('click', (e) => {
        if (e.target.classList.contains('name')) showUserModal(e.target.textContent);
    });
}

function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    document.body.classList.toggle('light-mode');
    themeToggle.innerHTML = document.body.classList.contains('light-mode') 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
    localStorage.setItem('darkMode', !document.body.classList.contains('light-mode'));
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

async function fetchLeaderboard() {
    try {
        document.getElementById('leaderboard-body').innerHTML = `
            <tr><td colspan="4" class="text-center">
                <div class="spinner-border text-orange" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td></tr>`;
        
        const url = "https://script.google.com/macros/s/AKfycbzM_37pu2Cuk1Hpwo9pkASRNzwZDqK2F8_oQufLFGSAcH0DjKtJs_qQRPULfxkcm3MPjg/exec";
        const rawData = await fetchWithRetry(url);
        leaderboardData = sanitizeData(rawData);
        localStorage.setItem('leaderboardData', JSON.stringify({ data: leaderboardData, timestamp: Date.now() }));
        renderTable(leaderboardData);
    } catch (error) {
        const cached = localStorage.getItem('leaderboardData');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                leaderboardData = data;
                renderTable(leaderboardData);
                return;
            }
        }
        document.getElementById('leaderboard-body').innerHTML = `
            <tr><td colspan="4" class="text-center text-danger">
                Failed to load data after 3 attempts. Please try again later.
                <button class="btn btn-sm btn-orange mt-2" onclick="fetchLeaderboard()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </td></tr>`;
        console.error('Error fetching leaderboard:', error);
    }
}

function sanitizeData(data) {
    return data.map(player => ({
        rank: player.rank,
        name: DOMPurify.sanitize(player.name),
        points: player.points,
        achievements: DOMPurify.sanitize(player.achievements || '')
    }));
}

function renderTable(data) {
    let html = "";
    data.forEach((player, index) => {
        const achievements = formatAchievements(player.achievements);
        const maxPoints = Math.max(...data.map(p => parseInt(p.points))) || 100;
        const pointsPercentage = (parseInt(player.points) / maxPoints) * 100;

        html += `
            <tr class="delay-${index % 10}" data-index="${index}">
                <td><span class="rank-badge">${player.rank}</span></td>
                <td><span class="name">${player.name}</span></td>
                <td>
                    <div class="d-flex align-items-center justify-content-center">
                        <span class="points me-2">${player.points}</span>
                        <div class="progress" role="progressbar" aria-valuenow="${player.points}" aria-valuemin="0" aria-valuemax="${maxPoints}">
                            <div class="progress-bar" style="width: ${pointsPercentage}%">${player.points}</div>
                        </div>
                    </div>
                </td>
                <td><span class="achievements">${achievements}</span></td>
            </tr>`;
    });

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = html;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    tbody.querySelectorAll('tr').forEach(row => observer.observe(row));
}

function formatAchievements(achievements) {
    if (!achievements) return 'None';
    return achievements.split(',').map(ach => {
        ach = ach.trim();
        let badgeClass = 'badge-blue';
        if (ach.includes('Gold')) badgeClass = 'badge-gold';
        else if (ach.includes('Silver')) badgeClass = 'badge-silver';
        else if (ach.includes('Bronze')) badgeClass = 'badge-bronze';
        return `<span class="badge ${badgeClass}">${ach}</span>`;
    }).join(' ');
}

function sortTable(column) {
    if (sortConfig.column === column) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.column = column;
        sortConfig.direction = 'asc';
    }

    document.querySelectorAll('thead th i').forEach(icon => icon.className = 'fas fa-sort');
    const currentHeader = document.querySelector(`th[data-sort="${column}"]`);
    const sortIcon = currentHeader.querySelector('i');
    sortIcon.className = sortConfig.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    currentHeader.setAttribute('aria-sort', sortConfig.direction);

    const sortedData = [...leaderboardData].sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];
        if (column === 'rank' || column === 'points') {
            valueA = parseInt(valueA);
            valueB = parseInt(valueB);
        }
        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();
        return sortConfig.direction === 'asc' ? (valueA < valueB ? -1 : 1) : (valueA > valueB ? -1 : 1);
    });

    renderTable(sortedData);
}

function filterTable() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#leaderboard-body tr');
    rows.forEach(row => {
        const name = row.querySelector('.name')?.textContent.toLowerCase() || '';
        row.style.display = name.includes(searchTerm) ? '' : 'none';
    });
}

function showUserModal(userName) {
    const user = leaderboardData.find(u => u.name === userName);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = `${userName}'s Profile`;
    const userDetails = `
        <div class="mb-3">
            <div class="rank-badge rank-badge-large mx-auto mb-2">${user.rank}</div>
            <h4 class="text-orange">${userName}</h4>
        </div>
        <div class="row text-start">
            <div class="col-md-6 mb-2">
                <strong><i class="fas fa-star me-2"></i>Points:</strong> 
                <span class="points">${user.points}</span>
            </div>
            <div class="col-md-6 mb-2">
                <strong><i class="fas fa-trophy me-2"></i>Achievements:</strong>
                <div class="mt-1">${formatAchievements(user.achievements)}</div>
            </div>
        </div>
        <div class="mt-3">
            <h5 class="text-orange">Progress</h5>
            <div class="progress progress-large" role="progressbar" aria-valuenow="${user.points}" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" style="width: ${(parseInt(user.points) / 100) * 100}%">${user.points} Points</div>
            </div>
        </div>
    `;
    document.getElementById('user-details').innerHTML = userDetails;
    userModal.show();
}

function exportToCSV() {
    if (!leaderboardData.length) return;
    const headers = ['Rank', 'Name', 'Points', 'Achievements'];
    const csvRows = [headers.join(',')];
    leaderboardData.forEach(user => {
        const row = [user.rank, `"${user.name}"`, user.points, `"${user.achievements || ''}"`];
        csvRows.push(row.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'yha_coder_leaderboard.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
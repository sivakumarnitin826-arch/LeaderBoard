/**
 * THE HOGWARTS HOUSE CUP - THE GREAT HALL REAL-TIME LEADERBOARD
 * 31-Team Real-Time Scoring Engine with Zero Lag & Persistent Storage
 */

(() => {
  'use strict';

  // --- CONFIGURATION & 31 TEAMS ---
  const STORAGE_KEY = 'hogwarts_leaderboard_31_teams_v1';
  const TOTAL_TEAMS = 31;
  const ALLOWED_DELTAS = [10, 8, 6, 4, -5];

  // Exact 31 teams requested by the user, numbered 1 through 31
  const DEFAULT_TEAMS_LIST = [
    { num: 1, name: "1. 404: Brain.exe Not Responding", avatar: "🧠" },
    { num: 2, name: "2. Chaos club", avatar: "🌪️" },
    { num: 3, name: "3. Auro duo", avatar: "✨" },
    { num: 4, name: "4. New innovators", avatar: "💡" },
    { num: 5, name: "5. Team wolf", avatar: "🐺" },
    { num: 6, name: "6. INFINITY IQ", avatar: "♾️" },
    { num: 7, name: "7. INFINITY TITANS", avatar: "⚡" },
    { num: 8, name: "8. Team Slytherin", avatar: "🐍" },
    { num: 9, name: "9. Team Spartans", avatar: "🛡️" },
    { num: 10, name: "10. Team Tri-Wizard Trio", avatar: "🏆" },
    { num: 11, name: "11. Team Unizone", avatar: "🌐" },
    { num: 12, name: "12. Trinity spark", avatar: "🔥" },
    { num: 13, name: "13. Unizone", avatar: "🔮" },
    { num: 14, name: "14. Astra", avatar: "⭐" },
    { num: 15, name: "15. Nexus", avatar: "🌌" },
    { num: 16, name: "16. Team legends", avatar: "👑" },
    { num: 17, name: "17. Team SERAPHINA MYSTARA", avatar: "🪽" },
    { num: 18, name: "18. Avengers squad", avatar: "🦸" },
    { num: 19, name: "19. Code Dragons", avatar: "🐉" },
    { num: 20, name: "20. NOVA", avatar: "🌟" },
    { num: 21, name: "21. Peaky Blinders", avatar: "🎩" },
    { num: 22, name: "22. QUEEN BEES", avatar: "🐝" },
    { num: 23, name: "23. TEAM SPARTANS", avatar: "⚔️" },
    { num: 24, name: "24. TEAM SSV GIRLS", avatar: "🌸" },
    { num: 25, name: "25. Team titans", avatar: "🏛️" },
    { num: 26, name: "26. Tech Mafia", avatar: "🕶️" },
    { num: 27, name: "27. Tech trio", avatar: "💻" },
    { num: 28, name: "28. The Concurrers", avatar: "🎯" },
    { num: 29, name: "29. Three petals", avatar: "🌺" },
    { num: 30, name: "30. Classy boys", avatar: "⚜️" },
    { num: 31, name: "31. Team 31", avatar: "🪄" }
  ];

  // --- ZERO-LATENCY WEB AUDIO SYNTHESIZER ---
  class WandSoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playScoreChime(delta) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      if (delta > 0) {
        // High-performance ascending harmonic chime
        const notes = delta === 10 
          ? [523.25, 659.25, 783.99, 1046.50]
          : delta === 8 
          ? [440.00, 554.37, 659.25, 880.00]
          : delta === 6
          ? [392.00, 493.88, 587.33, 783.99]
          : [349.23, 440.00, 523.25, 698.46];

        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.3);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.3);
        });
      } else {
        // Deep dungeon detention sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    }

    playClick() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  const sfx = new WandSoundFX();

  // --- STATE MANAGEMENT & PERSISTENCE ---
  let state = {
    teams: [],
    selectedTeamId: 1,
    history: [],
    activeFilter: 'all',
    searchQuery: '',
    soundEnabled: true
  };

  /**
   * Initializes the 31 teams with names and numbers
   */
  function createDefaultTeams() {
    return DEFAULT_TEAMS_LIST.map((item, index) => ({
      id: item.num,
      num: item.num,
      name: item.name,
      avatar: item.avatar,
      score: 0,
      previousRank: index + 1,
      rank: index + 1
    }));
  }

  /**
   * Load state from localStorage with fail-safe persistence
   */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.teams) && parsed.teams.length === TOTAL_TEAMS) {
          state.teams = parsed.teams;
          state.history = Array.isArray(parsed.history) ? parsed.history : [];
          state.selectedTeamId = parsed.selectedTeamId || 1;
          sortAndRankTeams(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Initializing fresh 31 teams state.', e);
    }

    // Default initialization of all 31 teams
    state.teams = createDefaultTeams();
    state.selectedTeamId = 1;
    state.history = [];
    sortAndRankTeams(false);
    saveState();
  }

  /**
   * Persistent save to localStorage
   */
  function saveState() {
    try {
      const payload = JSON.stringify({
        teams: state.teams,
        history: state.history,
        selectedTeamId: state.selectedTeamId,
        timestamp: Date.now()
      });
      localStorage.setItem(STORAGE_KEY, payload);

      // Flash auto-saved status indicator briefly
      if (DOM.storageStatusTag) {
        DOM.storageStatusTag.textContent = '● Saved';
        DOM.storageStatusTag.style.borderColor = 'rgba(52, 211, 153, 0.7)';
        setTimeout(() => {
          if (DOM.storageStatusTag) {
            DOM.storageStatusTag.textContent = '● Auto-Saved';
            DOM.storageStatusTag.style.borderColor = 'rgba(52, 211, 153, 0.35)';
          }
        }, 1200);
      }
    } catch (e) {
      console.error('Failed to persist state to storage:', e);
    }
  }

  /**
   * High performance sorting & rank assignment
   */
  function sortAndRankTeams(trackMovement = true) {
    if (trackMovement) {
      for (let i = 0; i < state.teams.length; i++) {
        state.teams[i].previousRank = state.teams[i].rank;
      }
    }

    state.teams.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.previousRank !== b.previousRank) return a.previousRank - b.previousRank;
      return a.id - b.id;
    });

    for (let i = 0; i < state.teams.length; i++) {
      state.teams[i].rank = i + 1;
    }
  }

  // --- DOM CACHE ---
  const DOM = {
    totalTeams: document.getElementById('metric-total-teams'),
    totalPoints: document.getElementById('metric-total-points'),
    leaderName: document.getElementById('metric-leader-name'),
    storageStatusTag: document.getElementById('storage-status-tag'),

    teamSelectInput: document.getElementById('team-select-input'),
    selectedTeamBadge: document.getElementById('selected-team-badge'),
    selectedTeamRank: document.getElementById('selected-team-rank'),
    selectedTeamName: document.getElementById('selected-team-name'),
    selectedTeamScore: document.getElementById('selected-team-score'),
    quickUndoBtn: document.getElementById('btn-quick-undo'),

    scoreButtons: document.querySelectorAll('.btn-point'),

    podiumSection: document.getElementById('podium-section'),
    podiumCards: {
      1: document.getElementById('podium-rank-1'),
      2: document.getElementById('podium-rank-2'),
      3: document.getElementById('podium-rank-3')
    },
    podiumNames: {
      1: document.getElementById('podium-name-1'),
      2: document.getElementById('podium-name-2'),
      3: document.getElementById('podium-name-3')
    },
    podiumScores: {
      1: document.getElementById('podium-score-1'),
      2: document.getElementById('podium-score-2'),
      3: document.getElementById('podium-score-3')
    },

    teamsContainer: document.getElementById('teams-container'),

    searchInput: document.getElementById('team-search-input'),
    clearSearchBtn: document.getElementById('btn-clear-search'),
    filterBtns: document.querySelectorAll('.filter-btn'),

    btnOpenInitial: document.getElementById('btn-open-initial-scores'),
    modalInitial: document.getElementById('modal-initial-scores'),
    btnCloseInitial: document.getElementById('btn-close-initial-modal'),
    btnCancelInitial: document.getElementById('btn-cancel-initial'),
    btnSaveInitial: document.getElementById('btn-save-initial'),
    batchScoreInput: document.getElementById('batch-score-input'),
    btnApplyBatch: document.getElementById('btn-apply-batch'),
    initialTeamsGrid: document.getElementById('initial-teams-grid'),

    btnToggleSound: document.getElementById('btn-toggle-sound'),
    soundIconOn: document.getElementById('sound-icon-on'),
    soundIconOff: document.getElementById('sound-icon-off'),

    btnOpenHistory: document.getElementById('btn-open-history'),
    drawerHistory: document.getElementById('drawer-history'),
    btnCloseHistory: document.getElementById('btn-close-history'),
    historyList: document.getElementById('history-list'),
    historyEntryCount: document.getElementById('history-entry-count'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    btnBackupExport: document.getElementById('btn-backup-export'),
    backupFileInput: document.getElementById('backup-file-input'),

    btnResetBoard: document.getElementById('btn-reset-board'),
    modalConfirm: document.getElementById('modal-confirm'),
    btnCancelConfirm: document.getElementById('btn-cancel-confirm'),
    btnExecuteConfirm: document.getElementById('btn-execute-confirm'),

    toastContainer: document.getElementById('toast-container'),
    deltaContainer: document.getElementById('delta-floating-container')
  };

  // --- CORE SCORING & LOGIC ---

  function applyPoints(delta) {
    if (!ALLOWED_DELTAS.includes(delta)) {
      showToast(`Invalid point change (${delta}).`, 'warning');
      return;
    }

    const team = state.teams.find(t => t.id === state.selectedTeamId);
    if (!team) {
      showToast('Select a team first.', 'warning');
      return;
    }

    const previousScore = team.score;
    const newScore = previousScore + delta;

    const historyItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      teamId: team.id,
      teamName: team.name,
      delta: delta,
      previousScore: previousScore,
      newScore: newScore,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    state.history.unshift(historyItem);
    if (state.history.length > 100) state.history.pop();

    team.score = newScore;

    // Fast SFX & Animation
    sfx.playScoreChime(delta);
    spawnFloatingDelta(delta);

    sortAndRankTeams(true);
    saveState();

    renderAll();
    triggerScorePulse(team.id, delta > 0);

    showToast(`${team.name}: ${delta > 0 ? '+' + delta : delta} gems (${newScore} total)`);
  }

  function undoLastAction() {
    if (state.history.length === 0) return;

    const lastAction = state.history.shift();
    const team = state.teams.find(t => t.id === lastAction.teamId);

    if (team) {
      team.score = lastAction.previousScore;
      sortAndRankTeams(true);
      saveState();
      renderAll();
      sfx.playClick();
      showToast(`⏳ Time-Turner: ${team.name} restored to ${team.score} gems.`);
    }
  }

  function selectTeam(teamId) {
    const id = parseInt(teamId, 10);
    const team = state.teams.find(t => t.id === id);
    if (!team) return;

    state.selectedTeamId = id;
    sfx.playClick();
    updateStationSelection();
    highlightSelectedCards();
  }

  function spawnFloatingDelta(delta) {
    const badge = document.createElement('div');
    badge.className = `floating-delta ${delta > 0 ? 'pos' : 'neg'}`;
    badge.textContent = delta > 0 ? `+${delta} ✨` : `${delta} ⚡`;

    const stationRect = DOM.selectedTeamBadge.getBoundingClientRect();
    badge.style.left = `${stationRect.left + stationRect.width / 2}px`;
    badge.style.top = `${stationRect.top + window.scrollY}px`;

    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 1200);
  }

  function triggerScorePulse(teamId, isPositive) {
    const card = document.querySelector(`.team-row-card[data-team-id="${teamId}"]`);
    if (card) {
      const scoreEl = card.querySelector('.team-score-num');
      if (scoreEl) {
        scoreEl.classList.remove('pulse-up', 'pulse-down');
        void scoreEl.offsetWidth;
        scoreEl.classList.add(isPositive ? 'pulse-up' : 'pulse-down');
      }
    }
  }

  // --- LAG-FREE RENDERING ENGINE ---

  function renderMetrics() {
    DOM.totalTeams.textContent = state.teams.length;
    let sum = 0;
    for (let i = 0; i < state.teams.length; i++) {
      sum += state.teams[i].score;
    }
    DOM.totalPoints.textContent = sum.toLocaleString() + ' 💎';

    if (state.teams.length > 0) {
      const leader = state.teams[0];
      DOM.leaderName.textContent = `${leader.name} (${leader.score} gems)`;
    } else {
      DOM.leaderName.textContent = '---';
    }
  }

  function renderTeamDropdown() {
    const currentVal = state.selectedTeamId;
    DOM.teamSelectInput.innerHTML = '';

    // Fast sort by ID 1..31 for clean selector list
    const sortedById = [...state.teams].sort((a, b) => a.id - b.id);

    const frag = document.createDocumentFragment();
    sortedById.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      const avatar = team.avatar || '🪄';
      option.textContent = `${avatar} ${team.name} (Rank #${team.rank} • ${team.score} gems)`;
      if (team.id === currentVal) option.selected = true;
      frag.appendChild(option);
    });
    DOM.teamSelectInput.appendChild(frag);

    updateStationSelection();
  }

  function updateStationSelection() {
    const team = state.teams.find(t => t.id === state.selectedTeamId);
    if (!team) return;

    DOM.teamSelectInput.value = team.id;
    DOM.selectedTeamRank.textContent = `Rank #${team.rank}`;
    DOM.selectedTeamName.textContent = `${team.avatar || '🪄'} ${team.name}`;
    DOM.selectedTeamScore.textContent = `${team.score} gems`;

    DOM.quickUndoBtn.disabled = state.history.length === 0;
  }

  function highlightSelectedCards() {
    const cards = document.querySelectorAll('.team-row-card');
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardId = parseInt(card.getAttribute('data-team-id'), 10);
      if (cardId === state.selectedTeamId) {
        card.classList.add('active-selected');
      } else {
        card.classList.remove('active-selected');
      }
    }

    [1, 2, 3].forEach(rank => {
      const pCard = DOM.podiumCards[rank];
      if (pCard) {
        const pId = parseInt(pCard.getAttribute('data-team-id'), 10);
        if (pId === state.selectedTeamId) {
          pCard.classList.add('selected');
        } else {
          pCard.classList.remove('selected');
        }
      }
    });
  }

  function renderPodium() {
    const top3 = state.teams.slice(0, 3);

    top3.forEach((team, index) => {
      const rank = index + 1;
      const card = DOM.podiumCards[rank];
      const nameEl = DOM.podiumNames[rank];
      const scoreEl = DOM.podiumScores[rank];

      if (card && nameEl && scoreEl) {
        card.setAttribute('data-team-id', team.id);
        nameEl.textContent = `${team.avatar || ''} ${team.name}`.trim();
        nameEl.title = team.name;
        scoreEl.innerHTML = `${team.score} <span class="pts-unit">GEMS</span>`;
      }
    });
  }

  function renderStandings() {
    DOM.teamsContainer.innerHTML = '';
    const query = state.searchQuery.trim().toLowerCase();

    const filteredTeams = state.teams.filter(team => {
      if (state.activeFilter === 'top10' && team.rank > 10) return false;
      if (state.activeFilter === 'podium' && team.rank > 3) return false;

      if (query) {
        const matchName = team.name.toLowerCase().includes(query);
        const matchRank = `#${team.rank}` === query || `${team.rank}` === query;
        const matchNum = `${team.id}` === query;
        return matchName || matchRank || matchNum;
      }
      return true;
    });

    if (filteredTeams.length === 0) {
      DOM.teamsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--gold-primary);">
          <p style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700;">No teams match "${escapeHTML(query)}"</p>
          <button id="btn-reset-filter" class="btn btn-secondary" style="margin-top: 1rem;">Show All 31 Teams</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-reset-filter');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.searchQuery = '';
          DOM.searchInput.value = '';
          DOM.clearSearchBtn.classList.add('hidden');
          renderStandings();
        });
      }
      return;
    }

    const frag = document.createDocumentFragment();
    filteredTeams.forEach(team => {
      const card = createTeamCardElement(team);
      frag.appendChild(card);
    });
    DOM.teamsContainer.appendChild(frag);

    highlightSelectedCards();
  }

  function createTeamCardElement(team) {
    const card = document.createElement('div');
    card.className = `team-row-card ${team.id === state.selectedTeamId ? 'active-selected' : ''}`;
    card.setAttribute('data-team-id', team.id);
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');

    let movementHTML = '';
    if (team.previousRank > team.rank) {
      const diff = team.previousRank - team.rank;
      movementHTML = `<span class="team-movement-tag movement-up">▲ +${diff}</span>`;
    } else if (team.previousRank < team.rank) {
      const diff = team.rank - team.previousRank;
      movementHTML = `<span class="team-movement-tag movement-down">▼ -${diff}</span>`;
    } else {
      movementHTML = `<span class="team-movement-tag movement-same">—</span>`;
    }

    let rankBadgeClass = 'team-rank-badge';
    if (team.rank === 1) rankBadgeClass += ' rank-badge-1';
    else if (team.rank === 2) rankBadgeClass += ' rank-badge-2';
    else if (team.rank === 3) rankBadgeClass += ' rank-badge-3';

    const avatar = team.avatar || '🪄';

    card.innerHTML = `
      <div class="team-left-info">
        <div class="${rankBadgeClass}">#${team.rank}</div>
        <div class="team-name-group">
          <span class="team-name-display" title="${escapeHTML(team.name)}">
            <span style="margin-right: 0.35rem;">${avatar}</span>${escapeHTML(team.name)}
          </span>
          ${movementHTML}
        </div>
      </div>

      <div class="team-right-stats">
        <div class="quick-card-actions">
          <button type="button" class="btn-card-micro btn-p10" data-card-points="10" title="Quick +10">+10</button>
          <button type="button" class="btn-card-micro btn-p4" data-card-points="4" title="Quick +4">+4</button>
          <button type="button" class="btn-card-micro btn-m5" data-card-points="-5" title="Quick -5">-5</button>
        </div>
        <div class="team-score-num">${team.score}</div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const quickBtn = e.target.closest('[data-card-points]');
      if (quickBtn) {
        e.stopPropagation();
        selectTeam(team.id);
        const pts = parseInt(quickBtn.getAttribute('data-card-points'), 10);
        applyPoints(pts);
        return;
      }
      selectTeam(team.id);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTeam(team.id);
      }
    });

    return card;
  }

  function renderHistoryDrawer() {
    DOM.historyEntryCount.textContent = `${state.history.length} spell${state.history.length === 1 ? '' : 's'} recorded`;
    DOM.btnClearHistory.disabled = state.history.length === 0;

    if (state.history.length === 0) {
      DOM.historyList.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-family: var(--font-serif); font-size: 0.9rem;">
          The Great Hall Ledger is currently empty.
        </div>
      `;
      return;
    }

    DOM.historyList.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const isPos = item.delta > 0;

      row.innerHTML = `
        <div class="history-info">
          <span class="history-team">${escapeHTML(item.teamName)}</span>
          <span class="history-time">${item.timestamp} • Score: ${item.previousScore} → ${item.newScore} gems</span>
        </div>
        <div class="history-delta-badge ${isPos ? 'delta-pos' : 'delta-neg'}">
          ${isPos ? '+' + item.delta : item.delta}
        </div>
      `;
      frag.appendChild(row);
    });
    DOM.historyList.appendChild(frag);
  }

  function renderAll() {
    renderMetrics();
    renderTeamDropdown();
    renderPodium();
    renderStandings();
    renderHistoryDrawer();
  }

  // --- INITIAL VALUES & PARCHMENT SETUP ---

  function openInitialScoresModal() {
    DOM.initialTeamsGrid.innerHTML = '';
    const sorted = [...state.teams].sort((a, b) => a.id - b.id);

    const frag = document.createDocumentFragment();
    sorted.forEach(team => {
      const row = document.createElement('div');
      row.className = 'initial-team-row';
      row.innerHTML = `
        <input type="text" class="initial-team-name-input" data-id="${team.id}" value="${escapeHTML(team.name)}" maxlength="45">
        <input type="number" class="initial-team-score-input" data-id="${team.id}" value="${team.score}" step="1">
      `;
      frag.appendChild(row);
    });
    DOM.initialTeamsGrid.appendChild(frag);

    DOM.modalInitial.classList.remove('hidden');
  }

  function closeInitialScoresModal() {
    DOM.modalInitial.classList.add('hidden');
  }

  function applyBatchScore() {
    const val = parseInt(DOM.batchScoreInput.value, 10);
    if (isNaN(val)) {
      showToast('Enter a valid numerical gem count.', 'warning');
      return;
    }

    const scoreInputs = DOM.initialTeamsGrid.querySelectorAll('.initial-team-score-input');
    scoreInputs.forEach(input => {
      input.value = val;
    });

    sfx.playClick();
    showToast(`Set ${val} baseline gems for all 31 teams in modal.`);
  }

  function saveInitialScores() {
    const nameInputs = DOM.initialTeamsGrid.querySelectorAll('.initial-team-name-input');
    const scoreInputs = DOM.initialTeamsGrid.querySelectorAll('.initial-team-score-input');

    nameInputs.forEach((input, index) => {
      const id = parseInt(input.getAttribute('data-id'), 10);
      const name = input.value.trim() || `${id}. Team ${id}`;
      const score = parseInt(scoreInputs[index].value, 10) || 0;

      const team = state.teams.find(t => t.id === id);
      if (team) {
        team.name = name;
        team.score = score;
        team.previousRank = team.rank;
      }
    });

    sortAndRankTeams(false);
    saveState();
    closeInitialScoresModal();
    renderAll();
    sfx.playScoreChime(10);
    showToast('All 31 team scores and names saved to permanent storage!');
  }

  // --- BACKUP EXPORT & RECOVERY ---

  function exportBackup() {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        teams: state.teams,
        history: state.history,
        selectedTeamId: state.selectedTeamId,
        exportedAt: new Date().toISOString()
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `hogwarts_leaderboard_31teams_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Leaderboard backup downloaded successfully!');
    } catch (e) {
      showToast('Failed to export backup.', 'warning');
    }
  }

  // --- TOAST NOTIFICATIONS ---

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    if (type === 'warning') {
      toast.style.borderColor = 'rgba(239, 68, 68, 0.6)';
      toast.style.background = '#2a0a0f';
      toast.style.color = '#fca5a5';
    }

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // --- EVENT LISTENERS & LIFECYCLE PERSISTENCE ---

  function setupEventListeners() {
    DOM.teamSelectInput.addEventListener('change', (e) => {
      selectTeam(e.target.value);
    });

    DOM.scoreButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.getAttribute('data-points'), 10);
        applyPoints(delta);
      });
    });

    DOM.quickUndoBtn.addEventListener('click', undoLastAction);

    [1, 2, 3].forEach(rank => {
      const card = DOM.podiumCards[rank];
      if (card) {
        card.addEventListener('click', () => {
          const teamId = card.getAttribute('data-team-id');
          if (teamId) selectTeam(teamId);
        });
      }
    });

    // Fast search without debounce lag
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery) {
        DOM.clearSearchBtn.classList.remove('hidden');
      } else {
        DOM.clearSearchBtn.classList.add('hidden');
      }
      renderStandings();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      DOM.searchInput.value = '';
      DOM.clearSearchBtn.classList.add('hidden');
      renderStandings();
      DOM.searchInput.focus();
    });

    DOM.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFilter = btn.getAttribute('data-filter');
        sfx.playClick();
        renderStandings();
      });
    });

    DOM.btnToggleSound.addEventListener('click', () => {
      const isEnabled = sfx.toggle();
      state.soundEnabled = isEnabled;
      if (isEnabled) {
        DOM.soundIconOn.classList.remove('hidden');
        DOM.soundIconOff.classList.add('hidden');
        sfx.playClick();
        showToast('Wand sound effects enabled 🪄');
      } else {
        DOM.soundIconOn.classList.add('hidden');
        DOM.soundIconOff.classList.remove('hidden');
        showToast('Wand sound effects silenced');
      }
    });

    DOM.btnOpenInitial.addEventListener('click', openInitialScoresModal);
    DOM.btnCloseInitial.addEventListener('click', closeInitialScoresModal);
    DOM.btnCancelInitial.addEventListener('click', closeInitialScoresModal);
    DOM.btnApplyBatch.addEventListener('click', applyBatchScore);
    DOM.btnSaveInitial.addEventListener('click', saveInitialScores);

    DOM.btnOpenHistory.addEventListener('click', () => {
      sfx.playClick();
      renderHistoryDrawer();
      DOM.drawerHistory.classList.remove('hidden');
    });
    DOM.btnCloseHistory.addEventListener('click', () => {
      DOM.drawerHistory.classList.add('hidden');
    });
    DOM.btnClearHistory.addEventListener('click', () => {
      state.history = [];
      saveState();
      renderHistoryDrawer();
      DOM.quickUndoBtn.disabled = true;
      showToast('Scourgified the point ledger.');
    });

    // Backup export
    if (DOM.btnBackupExport) {
      DOM.btnBackupExport.addEventListener('click', exportBackup);
    }

    DOM.btnResetBoard.addEventListener('click', () => {
      DOM.modalConfirm.classList.remove('hidden');
    });
    DOM.btnCancelConfirm.addEventListener('click', () => {
      DOM.modalConfirm.classList.add('hidden');
    });
    DOM.btnExecuteConfirm.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      state.teams = createDefaultTeams();
      state.history = [];
      state.selectedTeamId = 1;
      sortAndRankTeams(false);
      saveState();
      DOM.modalConfirm.classList.add('hidden');
      renderAll();
      sfx.playClick();
      showToast('Evanesco! All 31 teams reset to 0 gems.');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        DOM.modalInitial.classList.add('hidden');
        DOM.drawerHistory.classList.add('hidden');
        DOM.modalConfirm.classList.add('hidden');
      }
    });

    [DOM.modalInitial, DOM.drawerHistory, DOM.modalConfirm].forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });

    // --- FAIL-SAFE PERSISTENCE (Browser Close / Tab Switch / Sleep) ---
    window.addEventListener('beforeunload', () => {
      saveState();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      }
    });
  }

  // --- INITIALIZATION ---
  function init() {
    loadState();
    setupEventListeners();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

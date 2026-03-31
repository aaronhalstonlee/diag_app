const diagData = {
    "gm-strategy": [
        { id: 'gm_1', task: 'Verify Customer Concern', type: 'root' },
        { id: 'gm_2', task: 'Preliminary Inspection (Fuses/Aftermarket)', type: 'root' },
        { id: 'gm_3', task: 'Check for Global DTCs', type: 'root' },
        { id: 'gm_3_dtc', task: 'Follow DTC Priority List', dependsOn: 'gm_3', condition: 'fail' },
        { id: 'gm_4', task: 'Component/Circuit Testing', type: 'root' },
        { id: 'gm_5', task: 'Repair & Post-Repair Verification', type: 'root' }
    ],
    "electrical": [
        { id: 'el_1', task: 'Battery SOC & Load Test', type: 'root' },
        { id: 'el_1_f', task: 'Service Battery / Clean Terminals', dependsOn: 'el_1', condition: 'fail' },
        { id: 'el_2', task: 'Alternator Charging Voltage', dependsOn: 'el_1', condition: 'pass' }
    ]
};

let activeTimerId = null;
let timerInterval = null;

function showBranch(key) {
    document.getElementById('system-selector').classList.add('hidden');
    document.getElementById('active-branch').classList.remove('hidden');
    document.getElementById('branch-title').innerText = key.toUpperCase().replace('-', ' ');
    renderBranch(key);
}

function showMenu() {
    stopGlobalTimer();
    document.getElementById('system-selector').classList.remove('hidden');
    document.getElementById('active-branch').classList.add('hidden');
    renderSummary();
}

function renderBranch(key) {
    const container = document.getElementById('checklist-container');
    container.innerHTML = '';
    const progress = JSON.parse(localStorage.getItem('diagProgress')) || {};

    diagData[key].forEach(step => {
        const state = progress[step.id] || { status: 'pending', note: '', totalTime: 0 };
        
        // Dependency Check
        if (step.dependsOn && (!progress[step.dependsOn] || progress[step.dependsOn].status !== step.condition)) return;

        const isRunning = activeTimerId === step.id;
        const card = document.createElement('div');
        card.className = `step-card ${state.status}`;
        card.innerHTML = `
            <div class="step-info">
                <p class="step-task">${step.task}</p>
                <div class="timer-row">
                    <button class="timer-btn ${isRunning ? 'running' : ''}" onclick="toggleTimer('${step.id}', '${key}')">
                        ${isRunning ? '⏱ Stop' : '▶ Start'}
                    </button>
                    <span class="time-readout">${formatTime(state.totalTime)}</span>
                </div>
                <textarea class="step-note" onchange="saveNote('${step.id}', this.value)" placeholder="Add note...">${state.note}</textarea>
            </div>
            <div class="btn-group">
                <button class="pass-btn" onclick="updateStatus('${step.id}', 'pass', '${key}')">PASS</button>
                <button class="fail-btn" onclick="updateStatus('${step.id}', 'fail', '${key}')">FAIL</button>
            </div>
        `;
        container.appendChild(card);
    });
    renderSummary();
}

function updateStatus(id, status, key) {
    let progress = JSON.parse(localStorage.getItem('diagProgress')) || {};
    if (!progress[id]) progress[id] = { status: 'pending', note: '', totalTime: 0 };
    progress[id].status = status;
    localStorage.setItem('diagProgress', JSON.stringify(progress));
    renderBranch(key);
}

function saveNote(id, text) {
    let progress = JSON.parse(localStorage.getItem('diagProgress')) || {};
    if (!progress[id]) progress[id] = { status: 'pending', note: '', totalTime: 0 };
    progress[id].note = text;
    localStorage.setItem('diagProgress', JSON.stringify(progress));
}

function toggleTimer(id, key) {
    if (activeTimerId === id) {
        stopGlobalTimer();
    } else {
        stopGlobalTimer();
        activeTimerId = id;
        let progress = JSON.parse(localStorage.getItem('diagProgress')) || {};
        if (!progress[id]) progress[id] = { status: 'pending', note: '', totalTime: 0 };
        progress[id].lastStarted = Date.now();
        localStorage.setItem('diagProgress', JSON.stringify(progress));
        timerInterval = setInterval(() => renderBranch(key), 1000);
    }
    renderBranch(key);
}

function stopGlobalTimer() {
    if (!activeTimerId) return;
    let progress = JSON.parse(localStorage.getItem('diagProgress')) || {};
    const elapsed = Date.now() - progress[activeTimerId].lastStarted;
    progress[activeTimerId].totalTime += elapsed;
    delete progress[activeTimerId].lastStarted;
    localStorage.setItem('diagProgress', JSON.stringify(progress));
    clearInterval(timerInterval);
    activeTimerId = null;
}

function formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
}

function renderSummary() {
    const view = document.getElementById('summary-view');
    const progress = JSON.parse(localStorage.getItem('diagProgress')) || {};
    view.innerHTML = '<h3>Daily Summary</h3>';
    for (const id in progress) {
        if (progress[id].status === 'fail' || progress[id].note) {
            view.innerHTML += `<div class="summary-card"><strong>${id}:</strong> ${progress[id].status.toUpperCase()} - ${progress[id].note} (${formatTime(progress[id].totalTime)})</div>`;
        }
    }
}

function confirmReset() {
    if (confirm("Clear current job? This cannot be undone.")) {
        localStorage.clear();
        location.reload();
    }
}

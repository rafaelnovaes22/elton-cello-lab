import {
  buildSession,
  completeMission,
  completeSession,
  createInitialState,
  currentStreak,
  getRank,
  getRankProgress,
  getVisibleMissions,
  mentorReply,
  recordDifficulty,
  sanitizeState,
} from './learning-engine.js';

const STORAGE_KEY = 'elton-cello-lab:progress:v2';
const STRING_FREQUENCIES = { C2: 65.41, G2: 98, D3: 146.83, A3: 220 };
const select = (query, root = document) => root.querySelector(query);
const selectAll = (query, root = document) => [...root.querySelectorAll(query)];
let state = loadState();
let timerId = null;
let remainingSeconds = 0;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return sanitizeState(JSON.parse(saved));
    const legacy = sanitizeState(JSON.parse(localStorage.getItem('elton-cello-lab:progress:v1')));
    // O primeiro protótipo somava 340 XP e contadores fictícios ao progresso real.
    return { ...legacy, xp: Math.max(0, legacy.xp - 340), sessions: 0, streak: 0 };
  } catch {
    return createInitialState();
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    select('[data-storage-status]').textContent = 'Armazenamento indisponível. O progresso desta sessão será perdido ao fechar a página.';
  }
}

function renderStats() {
  const rank = getRank(state.xp);
  const progress = getRankProgress(state.xp);
  select('[data-stat="xp"]').textContent = state.xp.toLocaleString('pt-BR');
  select('[data-stat="streak"]').textContent = `${currentStreak(state)} dias`;
  select('[data-stat="sessions"]').textContent = state.sessions;
  select('[data-stat="rank"]').textContent = rank.name;
  select('[data-rank-progress]').style.width = `${progress.percent}%`;
  select('[data-next-rank]').textContent = progress.remaining ? `${progress.remaining} XP para ${progress.next}` : progress.next;
}

function renderSession() {
  const session = buildSession(state);
  select('[data-session-total]').textContent = `${state.profile.minutes} min`;
  select('[data-session-list]').innerHTML = session.map((step, index) => `
    <li>
      <span class="step-index">0${index + 1}</span>
      <span><strong>${step.label}</strong><small>${step.detail}</small></span>
      <b>${step.minutes}'</b>
    </li>`).join('');
  if (!timerId) resetTimer();
}

function renderMissions() {
  const missions = getVisibleMissions(state);
  const container = select('[data-missions]');
  if (!missions.length) return renderAllComplete(container);
  container.innerHTML = missions.map((mission) => `
    <article class="mission-card">
      <div class="mission-top"><span>${mission.area}</span><b>+${mission.xp} XP</b></div>
      <h3>${mission.title}</h3>
      <p>${mission.detail}</p>
      <div class="mission-footer"><small>${mission.minutes} min</small><button data-complete="${mission.id}">Concluir missão</button></div>
    </article>`).join('');
}

function renderAllComplete(container) {
  container.innerHTML = `<article class="all-complete"><span>BRAVO</span><h3>Ciclo concluído.</h3><p>Você finalizou as seis missões deste protótipo. Continue praticando com o plano e leve suas gravações ao professor.</p></article>`;
}

function renderProfile() {
  const labels = { iniciante: 'Fundamentos', intermediario: 'Desenvolvimento', avancado: 'Performance' };
  select('[data-profile-level]').textContent = labels[state.profile.level] || 'Desenvolvimento';
  select('[data-focus-name]').textContent = state.profile.blocker;
  selectAll('[data-mood]').forEach((button) => button.classList.toggle('active', button.dataset.mood === state.mood));
}

function render() {
  renderStats();
  renderSession();
  renderMissions();
  renderProfile();
}

function finishMission(missionId, button) {
  const previousXp = state.xp;
  state = completeMission(state, missionId);
  if (state.xp === previousXp) return;
  persistState();
  button.closest('.mission-card').classList.add('mission-done');
  showToast(`Missão concluída, +${state.xp - previousXp} XP`);
  celebrate(button);
  setTimeout(render, 420);
}

function chooseMood(mood) {
  state = { ...state, mood };
  persistState();
  renderProfile();
  pauseAndResetTimer();
  renderSession();
  showToast('Sessão recalibrada para o seu momento.');
}

function applyDiagnostic(form) {
  const values = Object.fromEntries(new FormData(form));
  state = {
    ...state,
    profile: { level: values.level, goal: values.goal, minutes: Number(values.minutes), blocker: values.blocker },
  };
  persistState();
  pauseAndResetTimer();
  render();
  select('#diagnosticDialog').close();
  showToast('Novo plano criado para você.');
  select('#plano').scrollIntoView({ behavior: 'smooth' });
}

function resetTimer() {
  remainingSeconds = Number(state.profile.minutes) * 60;
  updateTimerText();
}

function updateTimerText() {
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  select('[data-timer]').textContent = `${minutes}:${seconds}`;
}

function toggleTimer(button) {
  if (timerId) return stopTimer(button);
  if (remainingSeconds <= 0) resetTimer();
  button.textContent = 'Pausar sessão';
  timerId = setInterval(() => tickTimer(button), 1000);
}

function stopTimer(button) {
  clearInterval(timerId);
  timerId = null;
  button.textContent = 'Continuar sessão';
}

function tickTimer(button) {
  remainingSeconds -= 1;
  updateTimerText();
  if (remainingSeconds > 0) return;
  stopTimer(button);
  button.textContent = 'Sessão concluída';
  state = completeSession(state);
  persistState();
  renderStats();
  showToast('Sessão concluída. Registre como ela foi.');
}

function registerDifficulty(difficulty) {
  state = recordDifficulty(state, difficulty);
  persistState();
  pauseAndResetTimer();
  renderSession();
  showToast('Sinal registrado. Seu plano foi ajustado.');
}

function pauseAndResetTimer() {
  stopTimer(select('[data-start-timer]'));
  select('[data-start-timer]').textContent = 'Iniciar sessão';
  resetTimer();
}

function playString(note, button) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return showToast('Áudio não disponível neste navegador.');
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = STRING_FREQUENCIES[note];
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.5);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 1.55);
  oscillator.onended = () => { void context.close(); };
  button.classList.add('sounding');
  setTimeout(() => button.classList.remove('sounding'), 400);
}

function addMessage(role, text) {
  const message = document.createElement('div');
  message.className = `chat-message ${role}`;
  message.textContent = text;
  select('[data-chat]').append(message);
  message.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function submitChat(form) {
  const input = select('input', form);
  const message = input.value.trim();
  if (!message) return;
  addMessage('student', message);
  input.value = '';
  setTimeout(() => addMessage('mentor', mentorReply(message, state)), 350);
}

function showToast(message) {
  const toast = select('[data-toast]');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

function celebrate(origin) {
  const rect = origin.getBoundingClientRect();
  for (let index = 0; index < 12; index += 1) {
    const spark = document.createElement('i');
    spark.className = 'spark';
    spark.style.left = `${rect.left + rect.width / 2}px`;
    spark.style.top = `${rect.top}px`;
    spark.style.setProperty('--x', `${(Math.random() - 0.5) * 150}px`);
    document.body.append(spark);
    setTimeout(() => spark.remove(), 800);
  }
}

function bindEvents() {
  selectAll('[data-open-diagnostic]').forEach((button) => button.addEventListener('click', openDiagnostic));
  select('[data-close-dialog]').addEventListener('click', () => select('#diagnosticDialog').close());
  select('#diagnosticForm').addEventListener('submit', (event) => { event.preventDefault(); applyDiagnostic(event.currentTarget); });
  select('[data-missions]').addEventListener('click', (event) => { const button = event.target.closest('[data-complete]'); if (button) finishMission(button.dataset.complete, button); });
  selectAll('[data-mood]').forEach((button) => button.addEventListener('click', () => chooseMood(button.dataset.mood)));
  select('[data-start-timer]').addEventListener('click', (event) => toggleTimer(event.currentTarget));
  selectAll('[data-difficulty]').forEach((button) => button.addEventListener('click', () => registerDifficulty(button.dataset.difficulty)));
  selectAll('[data-string]').forEach((button) => button.addEventListener('click', () => playString(button.dataset.string, button)));
  select('#chatForm').addEventListener('submit', (event) => { event.preventDefault(); submitChat(event.currentTarget); });
  selectAll('[data-chat-prompt]').forEach((button) => button.addEventListener('click', () => { select('#chatInput').value = button.textContent; select('#chatInput').focus(); }));
  select('[data-menu]').addEventListener('click', () => select('[data-nav]').classList.toggle('open'));
}

function openDiagnostic() {
  const form = select('#diagnosticForm');
  Object.entries(state.profile).forEach(([key, value]) => { form.elements.namedItem(key).value = value; });
  select('#diagnosticDialog').showModal();
}

document.documentElement.classList.add('js');
select('[data-year]').textContent = new Date().getFullYear();
bindEvents();
render();

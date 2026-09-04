const RANKS = [
  { name: 'Primeiro arco', minimum: 0 },
  { name: 'Som consciente', minimum: 450 },
  { name: 'Intérprete em formação', minimum: 900 },
  { name: 'Cellista de palco', minimum: 1_600 },
  { name: 'Artista completo', minimum: 2_500 },
];

const MISSIONS = [
  { id: 'open-strings', title: 'Quatro cordas, um som', detail: 'Estabilize Dó, Sol, Ré e Lá com arco inteiro.', area: 'Produção sonora', minutes: 8, xp: 80 },
  { id: 'bow-lane', title: 'Trilho do arco', detail: 'Mantenha ponto de contato e velocidade constantes.', area: 'Técnica de arco', minutes: 7, xp: 70 },
  { id: 'pitch-map', title: 'Mapa da afinação', detail: 'Antecipe, toque e confira cinco notas-alvo.', area: 'Percepção', minutes: 6, xp: 60 },
  { id: 'position-shift', title: 'Mudança sem ruído', detail: 'Conecte primeira e quarta posição sem tensão.', area: 'Mão esquerda', minutes: 9, xp: 90 },
  { id: 'phrase-story', title: 'Uma frase, uma intenção', detail: 'Grave duas versões com direções musicais diferentes.', area: 'Interpretação', minutes: 10, xp: 100 },
  { id: 'slow-proof', title: 'Prova do andamento lento', detail: 'Toque seu trecho a 60% sem interromper o pulso.', area: 'Repertório', minutes: 12, xp: 120 },
];

export function createInitialState() {
  return {
    xp: 340,
    streak: 4,
    sessions: 3,
    completed: [],
    mood: 'focado',
    profile: { level: 'intermediario', goal: 'som', minutes: 25, blocker: 'afinação' },
    signals: { easy: 0, balanced: 0, hard: 0 },
  };
}

export function sanitizeState(candidate) {
  const initial = createInitialState();
  if (!candidate || typeof candidate !== 'object') return initial;
  return {
    ...initial,
    ...candidate,
    completed: Array.isArray(candidate.completed) ? candidate.completed : [],
    profile: { ...initial.profile, ...(candidate.profile || {}) },
    signals: { ...initial.signals, ...(candidate.signals || {}) },
  };
}

export function getRank(xp) {
  return [...RANKS].reverse().find((rank) => xp >= rank.minimum) || RANKS[0];
}

export function getRankProgress(xp) {
  const index = RANKS.findIndex((rank) => rank.name === getRank(xp).name);
  const current = RANKS[index];
  const next = RANKS[index + 1];
  if (!next) return { percent: 100, remaining: 0, next: 'Nível máximo' };
  const percent = ((xp - current.minimum) / (next.minimum - current.minimum)) * 100;
  return { percent: Math.max(0, Math.min(100, percent)), remaining: next.minimum - xp, next: next.name };
}

function missionPriority(mission, blocker) {
  const labels = `${mission.area} ${mission.detail}`.toLowerCase();
  return labels.includes(blocker.toLowerCase()) ? 0 : 1;
}

export function getVisibleMissions(state) {
  const available = MISSIONS.filter((mission) => !state.completed.includes(mission.id));
  return available.sort((a, b) => missionPriority(a, state.profile.blocker) - missionPriority(b, state.profile.blocker)).slice(0, 3);
}

export function completeMission(state, missionId) {
  if (state.completed.includes(missionId)) return state;
  const mission = MISSIONS.find((item) => item.id === missionId);
  if (!mission) return state;
  return { ...state, xp: state.xp + mission.xp, sessions: state.sessions + 1, completed: [...state.completed, missionId] };
}

export function buildSession(state) {
  const total = Number(state.profile.minutes) || 25;
  const recovery = state.mood === 'tenso' ? 0.3 : 0.18;
  const technique = state.profile.goal === 'tecnica' ? 0.38 : 0.3;
  const warmup = Math.max(3, Math.round(total * recovery));
  const core = Math.max(5, Math.round(total * technique));
  const ear = Math.max(4, Math.round(total * 0.2));
  const repertoire = Math.max(4, total - warmup - core - ear);
  return [
    { label: 'Preparar o corpo', detail: 'Respiração, apoios e arco sem pressão', minutes: warmup },
    { label: 'Núcleo técnico', detail: focusDetail(state.profile.blocker), minutes: core },
    { label: 'Ouvir antes de tocar', detail: 'Nota-alvo, antecipação e ajuste fino', minutes: ear },
    { label: 'Levar à música', detail: 'Trecho de repertório com uma intenção', minutes: repertoire },
  ];
}

function focusDetail(blocker) {
  const focuses = {
    afinação: 'Mapa da mão, referência auditiva e chegada limpa',
    arco: 'Ponto de contato, peso e velocidade do arco',
    tensão: 'Economia de movimento e pausas conscientes',
    constância: 'Uma meta pequena, clara e finalizável',
  };
  return focuses[blocker] || 'Coordenação entre arco, mão e ouvido';
}

export function recordDifficulty(state, difficulty) {
  if (!(difficulty in state.signals)) return state;
  return { ...state, signals: { ...state.signals, [difficulty]: state.signals[difficulty] + 1 } };
}

export function mentorReply(message, state) {
  const text = message.toLowerCase();
  const minutes = state.profile.minutes;
  if (/dor|punho|costas|ombro|tensão/.test(text)) return 'Pare antes da dor. Faça 3 minutos sem instrumento para soltar ombros e mãos. Retome apenas com conforto e leve esse sinal ao seu professor.';
  if (/afina|nota|ouvido/.test(text)) return `Hoje, use ${Math.max(5, Math.round(minutes * 0.25))} minutos em ciclos: imagine a nota, cante, toque e confira. A correção vem depois da escuta, não durante o susto.`;
  if (/arco|som|ruído|chiado/.test(text)) return 'Isole uma corda. Faça quatro arcos lentos observando três variáveis: ponto de contato, velocidade e peso. Mude apenas uma variável por tentativa.';
  if (/const|tempo|rotina|desanim/.test(text)) return 'Reduza a meta até ela caber no pior dia. Hoje, complete só o aquecimento e uma missão. Consistência nasce de sessões que terminam bem.';
  if (/vibrato|posição|mudança/.test(text)) return 'Separe o gesto da música: pratique o movimento em silêncio, depois com uma nota longa e só então dentro da frase. Grave a terceira tentativa.';
  return `Seu foco atual é ${state.profile.blocker}. Comece devagar, escolha um critério de sucesso e registre uma tentativa. O plano de ${minutes} minutos já foi recalibrado para isso.`;
}

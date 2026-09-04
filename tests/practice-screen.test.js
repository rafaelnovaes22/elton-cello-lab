import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { completeSession, createInitialState } from '../public/learning-engine.js';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  const next = source.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0, `Função ausente: ${name}`);
  return source.slice(start, next < 0 ? undefined : next);
}

test('timer completion persists once and a new start cannot count below zero', () => {
  const button = { textContent: '' };
  let writes = 0;
  const context = {
    state: createInitialState(), remainingSeconds: 1, timerId: 1,
    completeSession, clearInterval() {}, updateTimerText() {}, renderStats() {}, showToast() {},
    persistState() { writes += 1; },
    setInterval() { return 2; },
    resetTimer() { context.remainingSeconds = context.state.profile.minutes * 60; },
  };
  runInNewContext(['stopTimer', 'tickTimer', 'toggleTimer'].map(functionSource).join('\n'), context);
  context.tickTimer(button);
  assert.equal(context.remainingSeconds, 0);
  assert.equal(context.state.sessions, 1);
  assert.equal(context.timerId, null);
  assert.equal(writes, 1);
  context.toggleTimer(button);
  assert.equal(context.remainingSeconds, 1500);
  assert.equal(button.textContent, 'Pausar sessão');
});

test('unavailable browser storage shows a persistence limitation', () => {
  const notice = { textContent: '' };
  const context = {
    state: createInitialState(), STORAGE_KEY: 'test',
    localStorage: { setItem() { throw new Error('Quota exceeded'); } },
    select: () => notice,
  };
  runInNewContext(`${functionSource('persistState')}\npersistState();`, context);
  assert.match(notice.textContent, /será perdido/);
});

test('previous real mission progress survives removal of synthetic starting counters', () => {
  const legacy = { ...createInitialState(), xp: 420, sessions: 4, streak: 4, completed: ['open-strings'] };
  const context = {
    STORAGE_KEY: 'v2', createInitialState,
    sanitizeState: (value) => value,
    localStorage: { getItem: (key) => key === 'v2' ? null : JSON.stringify(legacy) },
  };
  const restored = runInNewContext(`${functionSource('loadState')}\nloadState();`, context);
  assert.equal(restored.xp, 80);
  assert.equal(restored.sessions, 0);
  assert.deepEqual(Array.from(restored.completed), legacy.completed);
});

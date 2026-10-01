import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSession,
  completeMission,
  completeSession,
  createInitialState,
  currentStreak,
  getRank,
  getVisibleMissions,
  mentorReply,
  recordDifficulty,
  sanitizeState,
} from '../public/learning-engine.js';

test('mission awards XP only once', () => {
  const initial = createInitialState();
  const mission = getVisibleMissions(initial)[0];
  const completed = completeMission(initial, mission.id);
  const repeated = completeMission(completed, mission.id);
  assert.equal(completed.xp, initial.xp + mission.xp);
  assert.equal(repeated.xp, completed.xp);
});

test('adaptive session respects selected duration', () => {
  for (const minutes of [15, 25, 40, 60]) {
    for (const mood of ['focado', 'tenso', 'energico']) {
      const state = createInitialState();
      state.profile.minutes = minutes;
      state.mood = mood;
      const session = buildSession(state);
      assert.equal(session.reduce((total, step) => total + step.minutes, 0), minutes);
      assert.ok(session.every((step) => step.minutes > 0));
    }
  }
});

test('fresh progress has no invented practice', () => {
  const state = createInitialState();
  assert.deepEqual([state.xp, state.sessions, state.streak], [0, 0, 0]);
});

test('practice streak counts days and expires after a missed day', () => {
  const first = completeSession(createInitialState(), new Date(2026, 8, 4, 9));
  const sameDay = completeSession(first, new Date(2026, 8, 4, 19));
  const nextDay = completeSession(sameDay, new Date(2026, 8, 5, 9));
  assert.equal(sameDay.streak, 1);
  assert.equal(nextDay.streak, 2);
  assert.equal(currentStreak(nextDay, new Date(2026, 8, 7)), 0);
  assert.equal(completeSession(nextDay, new Date(2026, 8, 7)).streak, 1);
  assert.equal(sameDay.sessions, 2);
});

test('hard difficulty actually recalibrates the next session', () => {
  const state = createInitialState();
  const adjusted = recordDifficulty(state, 'hard');
  assert.notDeepEqual(buildSession(adjusted), buildSession(state));
  assert.equal(adjusted.signals.hard, 1);
  assert.equal(recordDifficulty(state, '__proto__'), state);
});

test('malformed stored profile cannot break the training screen', () => {
  const state = sanitizeState({ xp: 'not a number', profile: { blocker: 4, minutes: -1 }, completed: ['unknown', 'pitch-map', 'pitch-map'] });
  assert.equal(state.xp, 0);
  assert.equal(state.profile.minutes, 25);
  assert.deepEqual(state.completed, ['pitch-map']);
  assert.ok(getVisibleMissions(state).length);
  assert.equal(buildSession(state).reduce((total, step) => total + step.minutes, 0), 25);
});

test('rank advances at configured threshold', () => {
  assert.equal(getRank(449).name, 'Primeiro arco');
  assert.equal(getRank(450).name, 'Som consciente');
});

test('mentor prioritizes physical safety', () => {
  const answer = mentorReply('Estou com dor no punho', createInitialState());
  assert.match(answer, /Pare antes da dor/);
});

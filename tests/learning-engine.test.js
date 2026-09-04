import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSession,
  completeMission,
  createInitialState,
  getRank,
  getVisibleMissions,
  mentorReply,
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
  const state = createInitialState();
  state.profile.minutes = 40;
  const session = buildSession(state);
  assert.equal(session.reduce((total, step) => total + step.minutes, 0), 40);
});

test('rank advances at configured threshold', () => {
  assert.equal(getRank(449).name, 'Primeiro arco');
  assert.equal(getRank(450).name, 'Som consciente');
});

test('mentor prioritizes physical safety', () => {
  const answer = mentorReply('Estou com dor no punho', createInitialState());
  assert.match(answer, /Pare antes da dor/);
});

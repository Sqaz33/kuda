import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptsRoom,
  canExtend,
  canVote,
  currentCandidates,
  previewAccess,
  resultExplanation,
  roomScreen,
  roundProgress,
} from '../src/room-state.js';

test('second round ignores old skipped cards and old votes', () => {
  const candidates = Array.from({ length: 22 }, (_, index) => ({ id: `v${index + 1}` }));
  const ownVotes = Object.fromEntries(candidates.slice(0, 10).map(({ id }) => [id, 'like']));
  const room = {
    status: 'swiping',
    candidates,
    ownVotes,
    round: 2,
    roundCandidateIds: candidates.slice(12).map(({ id }) => id),
    deadlineAt: new Date(Date.now() + 60000).toISOString(),
  };
  const progress = roundProgress(room);
  assert.equal(progress.current.id, 'v13');
  assert.equal(progress.done, 0);
  assert.equal(progress.likes, 0);
  assert.equal(progress.total, 10);
  assert.equal(progress.canFinish, false);
  assert.equal(canVote(room, 'v11'), false);
  assert.equal(canVote(room, 'v13'), true);
  assert.equal(roomScreen(room), 'deck');
});

test('withdrawn cards do not require votes or inflate finish threshold', () => {
  const room = {
    status: 'swiping',
    candidates: [{ id: 'old' }, { id: 'new' }, { id: 'closed', availability: 'withdrawn' }],
    roundCandidateIds: ['new', 'closed'],
    ownVotes: { new: 'dislike' },
  };
  assert.deepEqual(
    currentCandidates(room).map(({ id }) => id),
    ['new'],
  );
  assert.equal(roundProgress(room).canFinish, true);
  assert.equal(roomScreen(room), 'waiting');
  assert.equal(canVote(room, 'closed'), false);
});

test('room responses cannot roll back a newer revision', () => {
  assert.equal(acceptsRoom({ id: 'a', revision: 9 }, { id: 'a', revision: 8 }), false);
  assert.equal(acceptsRoom({ id: 'a', revision: 9 }, { id: 'a', revision: 9 }), true);
  assert.equal(acceptsRoom({ id: 'a', revision: 9 }, { id: 'b', revision: 1 }), true);
  assert.equal(acceptsRoom({ id: 'a' }, { id: 'a' }), true);
});

test('only one additional round is available, only for an empty result', () => {
  assert.equal(canExtend({ status: 'deciding', matches: [], extensionCount: 0 }), true);
  assert.equal(canExtend({ status: 'deciding', matches: [], extensionCount: 1 }), false);
  assert.equal(canExtend({ status: 'deciding', matches: [{}] }), false);
});

test('closed previews block new members but let existing members return', () => {
  const preview = { access: 'closed', room: { members: [{ id: 'member' }] } };
  assert.equal(previewAccess(preview, null).blocked, true);
  assert.equal(previewAccess(preview, { id: 'other' }).blocked, true);
  assert.equal(previewAccess(preview, { id: 'member' }).blocked, false);
  assert.equal(previewAccess({ ...preview, access: 'removed' }, { id: 'member' }).blocked, true);
});

test('result explains the denominator and insufficient quorum', () => {
  const explanation = resultExplanation({
    matchMode: 'host_choice',
    incomplete: true,
    resultStats: { joined: 4, finished: 2, eligible: 2, quorum: 3 },
  });
  assert.match(explanation, /Организатор/);
  assert.match(explanation, /2 из 4/);
  assert.match(explanation, /кворума нужно 3/);
});

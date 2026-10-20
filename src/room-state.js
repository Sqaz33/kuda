// Shared contract rules for the room list, voting screen and details screen.
export function currentCandidates(room) {
  const candidates = room?.candidates || [];
  const ids = room?.roundCandidateIds;
  const byId = new Map(candidates.map((venue) => [venue.id, venue]));
  const current = Array.isArray(ids) ? ids.map((id) => byId.get(id)).filter(Boolean) : candidates;
  return current.filter((venue) => venue.availability !== 'withdrawn');
}

export function roundProgress(room) {
  const candidates = currentCandidates(room);
  const votes = room?.ownVotes || {};
  const done = candidates.filter((venue) => votes[venue.id]).length;
  return {
    candidates,
    current: candidates.find((venue) => !votes[venue.id]),
    done,
    total: candidates.length,
    likes: candidates.filter((venue) => votes[venue.id] === 'like').length,
    canFinish:
      room?.status === 'swiping' && !room.selfFinished && done >= Math.min(10, candidates.length),
  };
}

export function roomScreen(room) {
  if (room.status === 'waiting') return 'lobby';
  if (room.status === 'swiping')
    return room.selfFinished || !roundProgress(room).current ? 'waiting' : 'deck';
  if (room.status === 'deciding') return 'matches';
  if (room.status === 'selected' || room.status === 'completed') return 'result';
  return 'unavailable';
}

export function acceptsRoom(previous, next) {
  if (!previous || previous.id !== next.id) return true;
  return !(
    Number.isFinite(previous.revision) &&
    Number.isFinite(next.revision) &&
    next.revision < previous.revision
  );
}

export function canExtend(room) {
  return room?.status === 'deciding' && !room.matches?.length && (room.extensionCount || 0) < 1;
}

export function canVote(room, venueId) {
  return (
    room?.status === 'swiping' &&
    !room.selfFinished &&
    Date.parse(room.deadlineAt) > Date.now() &&
    !room.ownVotes?.[venueId] &&
    currentCandidates(room).some((venue) => venue.id === venueId)
  );
}

export function previewAccess(preview, user) {
  const member = Boolean(user && preview.room.members.some((item) => item.id === user.id));
  return {
    member,
    blocked:
      ['cancelled', 'expired', 'invalid', 'removed'].includes(preview.access) ||
      (!member && ['full', 'closed'].includes(preview.access)),
    selected: !member && preview.access === 'selected',
  };
}

export function resultExplanation(room) {
  const stats = room.resultStats;
  const participation = stats
    ? `Закончили ${stats.finished} из ${stats.joined}. Учтены ответы ${stats.eligible}; для кворума нужно ${stats.quorum}.`
    : room.incomplete
      ? 'Не все участники завершили выбор.'
      : '';
  const mode =
    room.matchMode === 'unanimous'
      ? 'Совпадения среди завершивших голосование.'
      : room.matchMode === 'majority'
        ? 'Варианты с поддержкой большинства завершивших.'
        : 'Единого решения нет. Организатор выбирает из предложенных вариантов.';
  return `${mode} ${participation}`.trim();
}

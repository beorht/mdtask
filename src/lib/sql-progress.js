// Sequential unlock rule for the SQL trainer, shared by the trainer routes and the student
// home page: exercise N opens only once exercise N-1 is solved (global order_index chain).
// `openAll` (test accounts) skips the chain and unlocks everything.
function withProgress(exercises, solvedIds, openAll = false) {
  return exercises.map((ex, i) => {
    const prev = exercises[i - 1];
    const unlocked = openAll || i === 0 || solvedIds.has(prev.id);
    return { ...ex, solved: solvedIds.has(ex.id), unlocked };
  });
}

// Per-topic summary (solved / total / unlocked) for topics that have exercises.
function topicProgress(topics, exercisesWithProgress) {
  return topics
    .map((topic) => {
      const list = exercisesWithProgress.filter((e) => e.topic === topic.key);
      return {
        ...topic,
        total: list.length,
        solvedCount: list.filter((e) => e.solved).length,
        unlocked: list.some((e) => e.unlocked),
      };
    });
}

module.exports = { withProgress, topicProgress };

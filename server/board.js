// Board size scales with lineup size (3x3 for small lineups up to 5x5 for
// big ones) — same "one line = one prize" shape as PropQuix Solo's board,
// but single-stage: any completed row/column/diagonal wins the ticket.

function gridSizeForArtistCount(count) {
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  return 5;
}

function buildLines(gridSize) {
  const lines = [];
  for (let r = 0; r < gridSize; r++) {
    lines.push(Array.from({ length: gridSize }, (_, c) => r * gridSize + c));
  }
  for (let c = 0; c < gridSize; c++) {
    lines.push(Array.from({ length: gridSize }, (_, r) => r * gridSize + c));
  }
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + i));
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + (gridSize - 1 - i)));
  return lines;
}

// Two-tier prize model, same shape as PropQuix Solo: clear any 1 line for
// the first ticket, then keep going for a shot at a 2nd ticket if a
// (different) line is still reachable. A board tops out at 2 tickets no
// matter how many lines it could theoretically complete.
const MAX_TIERS = 2;

// cellsByPosition: array indexed by board position (0..gridSize^2-1) of
// { status: 'available'|'cleared'|'dead' }. Returns how many lines are
// fully cleared (capped at MAX_TIERS), whether a next line is still
// reachable, and whether the board is fully dead.
function evaluateBoard(cellsByPosition, gridSize) {
  const lines = buildLines(gridSize);
  let completedLines = 0;
  let reachableIncompleteLines = 0;
  for (const line of lines) {
    const statuses = line.map((pos) => cellsByPosition[pos]?.status || "available");
    if (statuses.every((s) => s === "cleared")) {
      completedLines++;
    } else if (!statuses.includes("dead")) {
      reachableIncompleteLines++;
    }
  }
  const completedLinesCapped = Math.min(completedLines, MAX_TIERS);
  const nextLineReachable = completedLinesCapped < MAX_TIERS && reachableIncompleteLines > 0;
  const busted = completedLinesCapped === 0 && reachableIncompleteLines === 0;
  return {
    // back-compat for any caller still checking a single boolean
    hasCompletedLine: completedLinesCapped >= 1,
    completedLines: completedLinesCapped,
    nextLineReachable,
    busted,
  };
}

module.exports = { gridSizeForArtistCount, buildLines, evaluateBoard, MAX_TIERS };

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

// cellsByPosition: array indexed by board position (0..gridSize^2-1) of
// { status: 'available'|'cleared'|'dead' }. Returns whether any line is
// fully cleared, and whether the board is fully dead (no line still
// possible — every line has at least one dead square).
function evaluateBoard(cellsByPosition, gridSize) {
  const lines = buildLines(gridSize);
  let hasCompletedLine = false;
  let anyLineStillPossible = false;
  for (const line of lines) {
    const statuses = line.map((pos) => cellsByPosition[pos]?.status || "available");
    if (statuses.every((s) => s === "cleared")) hasCompletedLine = true;
    if (!statuses.includes("dead")) anyLineStillPossible = true;
  }
  return {
    hasCompletedLine,
    busted: !hasCompletedLine && !anyLineStillPossible,
  };
}

module.exports = { gridSizeForArtistCount, buildLines, evaluateBoard };

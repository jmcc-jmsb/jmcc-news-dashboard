// ABOUTME: Keeps the selected pill visible in a pill row that swipes sideways on phones.
// ABOUTME: Shared by CompetitionBar and DisciplineBar; a no-op wherever the row fits on screen.

/**
 * Centres the row's active pill by scrolling the row itself. Not
 * element.scrollIntoView(): that also scrolls the page to bring the bar into
 * view, which yanks a reader back to the top when the bar is not sticky.
 */
function centreActivePill(row: HTMLElement | null) {
  const pill = row?.querySelector<HTMLElement>('.pill.active');
  if (!row || !pill) return;
  const rowBox = row.getBoundingClientRect();
  const pillBox = pill.getBoundingClientRect();
  row.scrollLeft += pillBox.left - rowBox.left - (rowBox.width - pillBox.width) / 2;
}

export function revealActivePill(row: HTMLElement | null) {
  centreActivePill(row);
  // Again once the webfonts land: Montserrat swaps in after first paint and
  // widens every pill, which pushes a centred pill back off the edge.
  document.fonts.ready.then(() => centreActivePill(row));
}

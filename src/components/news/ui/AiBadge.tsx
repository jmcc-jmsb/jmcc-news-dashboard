// ABOUTME: Marks an article as having an AI angle — same visual treatment as the discipline tag.
// ABOUTME: Purely presentational; the aiRelevant boolean is set at ingest, never computed here.

export function AiBadge() {
  return (
    <span className="ai-badge" title="This article has an AI angle">
      AI
      <span className="sr-only"> angle</span>
    </span>
  );
}

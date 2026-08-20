// ABOUTME: Says plainly, on screen, when the feed is sample data rather than real news.
// ABOUTME: Rendered whenever an API response reports origin 'sample'.

/**
 * The fixtures are invented headlines attributed to real publishers — Reuters,
 * Bloomberg, WSJ. Showing them unlabelled would be presenting fabricated news
 * as real, so sample mode is never silent.
 */
export function SampleDataBanner() {
  return (
    <div className="sample-banner" role="status">
      <strong>Sample data.</strong> These are placeholder headlines for layout and
      testing — not real news. The live feed appears once the news database is connected.
    </div>
  );
}

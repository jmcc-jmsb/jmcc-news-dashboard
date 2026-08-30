// ABOUTME: Says plainly, on screen, when the feed is sample data rather than real news.
// ABOUTME: Rendered whenever an API response reports origin 'sample'.

/**
 * The fixtures are invented headlines attributed to real publishers — Reuters,
 * Bloomberg, WSJ. Showing them unlabelled would be presenting fabricated news
 * as real, so sample mode is never silent.
 *
 * The sponsor variant matters more, not less: invented revenue figures under a
 * company name are a claim about a real business, and every sample source URL
 * points at example.com precisely so the fabrication is self-evident.
 */
export function SampleDataBanner({ kind = 'news' }: { kind?: 'news' | 'sponsors' | 'specs' }) {
  return (
    <div className="sample-banner" role="status">
      {kind === 'news' && (
        <>
          <strong>Sample data.</strong> These are placeholder headlines for layout and
          testing — not real news. The live feed appears once the news database is connected.
        </>
      )}
      {kind === 'sponsors' && (
        <>
          <strong>Sample data.</strong> These are invented companies with invented
          figures, for layout and testing only. No real sponsor is described here.
        </>
      )}
      {kind === 'specs' && (
        <>
          <strong>Sample content.</strong> Generic textbook frameworks, shown for
          layout and testing. The discipline coaches&apos; own material replaces this.
        </>
      )}
    </div>
  );
}

// ABOUTME: Loading placeholder matching an article card's shape.
// ABOUTME: aria-hidden — the live region in NewsView announces loading state instead.

export function Skeleton() {
  return (
    <div className="card article-card skel" aria-hidden="true">
      <div className="sk sk-meta"></div>
      <div className="sk sk-title"></div>
      <div className="sk sk-title short"></div>
      <div className="sk sk-desc"></div>
      <div className="sk sk-desc"></div>
    </div>
  );
}

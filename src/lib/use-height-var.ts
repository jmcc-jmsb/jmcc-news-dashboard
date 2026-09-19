// ABOUTME: Publishes an element's live border-box height as a CSS custom property on <html>.
// ABOUTME: Lets stacked sticky bars offset each other without hardcoding a height that varies.
import { useEffect, useRef } from 'react';

/**
 * The dash bar is 57px with a mouse and 65px on a touch screen (44px targets),
 * and the discipline bar wraps to a different height per competition and
 * width. A fixed `top:` is right for one of those and wrong for the rest, so
 * the sticky offsets in dashboard.css read these measured values instead.
 */
export function useHeightVar<T extends HTMLElement>(name: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const style = document.documentElement.style;
    const observer = new ResizeObserver(() => style.setProperty(name, `${el.offsetHeight}px`));
    // border-box: a media query that changes only padding or border must count.
    observer.observe(el, { box: 'border-box' });
    return () => {
      observer.disconnect();
      style.removeProperty(name);
    };
  }, [name]);

  return ref;
}

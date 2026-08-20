// ABOUTME: Bookmark toggle button — aria-pressed, with the item title in its label.
// ABOUTME: Stops propagation so tapping it inside a card never follows the card's link.

import { Icon } from './Icon';

interface Props {
  saved: boolean;
  onClick: () => void;
  label: string;
}

export function BookmarkBtn({ saved, onClick, label }: Props) {
  return (
    <button
      className={'bm ' + (saved ? 'is-saved' : '')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={saved ? `Remove from saved — ${label}` : `Save — ${label}`}
      aria-pressed={saved}
    >
      {Icon.bookmark(saved)}
    </button>
  );
}

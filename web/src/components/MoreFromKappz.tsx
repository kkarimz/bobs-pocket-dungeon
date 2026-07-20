const D20_URL = "https://apps.apple.com/us/app/d20-roller/id6780279236";
const CROWN_URL = "https://apps.apple.com/us/app/crown-counter/id6781309809";
const KAPPZ_URL = "https://kappz.net/";

interface Props {
  /** Compact footer style vs title-screen block */
  compact?: boolean;
}

/** Soft plug for other Kappz tabletop apps. */
export function MoreFromKappz({ compact = false }: Props) {
  return (
    <aside className={`more-kappz ${compact ? "is-compact" : ""}`}>
      {!compact && <p className="more-kappz-eyebrow">More from Kappz</p>}
      <p className="more-kappz-line">
        <a href={D20_URL} target="_blank" rel="noopener noreferrer">
          D20 Roller
        </a>
        <span aria-hidden> · </span>
        <a href={CROWN_URL} target="_blank" rel="noopener noreferrer">
          Crown Counter
        </a>
        {!compact && (
          <>
            <span aria-hidden> · </span>
            <a href={KAPPZ_URL} target="_blank" rel="noopener noreferrer">
              kappz.net
            </a>
          </>
        )}
      </p>
      {!compact && (
        <p className="more-kappz-blurb">
          Dice rolls and board-game scoring — free on the App Store.
        </p>
      )}
    </aside>
  );
}

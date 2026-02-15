function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);

  const nums = (() => {
    if (totalPages <= 6) return range(1, totalPages);
    if (page <= 3) return [1, 2, 3, -1, totalPages];
    if (page >= totalPages - 2) return [1, -1, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  })();

  return (
    <div className="pagerWrap" aria-label="Pagination">
      <div className="pager">
        <button className="pBtn" onClick={() => onChange(Math.max(1, page - 1))} aria-label="Previous page">
          &lt;
        </button>
        {nums.map((n, idx) =>
          n === -1 ? (
            <span key={`dots_${idx}`} className="pDots">
              …
            </span>
          ) : (
            <button
              key={n}
              className={"pNum " + (n === page ? "active" : "")}
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </button>
          )
        )}
        <button className="pBtn" onClick={() => onChange(Math.min(totalPages, page + 1))} aria-label="Next page">
          &gt;
        </button>
      </div>
      <div className="muted small">
        You’re viewing {startItem}–{endItem} of {totalItems} products
      </div>
    </div>
  );
}
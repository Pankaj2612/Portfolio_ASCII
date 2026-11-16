/* Text-mode window title bar:  [■] ═══ title ═══ meta */
export default function WindowBar({ title, titleId, right }) {
  return (
    <div className="window-bar">
      <span className="wb-btn wb-chip text-secondary" aria-hidden="true">[■]</span>
      <span className="window-title" id={titleId}><span>{title}</span></span>
      {right}
    </div>
  );
}

/** right-hand metadata chip for a window bar */
export function Meta({ children, className = 'text-fg-2' }) {
  return <span className={`wb-meta wb-chip ${className}`}>{children}</span>;
}



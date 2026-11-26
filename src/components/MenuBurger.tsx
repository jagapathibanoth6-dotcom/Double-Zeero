export function MenuBurger({
  open,
  onClick,
  className = "",
  label = "Open menu",
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`nav-burger ${className}`.trim()}
      aria-expanded={open}
      aria-label={open ? "Close menu" : label}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {open ? (
          <>
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </>
        ) : (
          <>
            <path d="M5 7h14" />
            <path d="M5 12h14" />
            <path d="M5 17h14" />
          </>
        )}
      </svg>
    </button>
  );
}

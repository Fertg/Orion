export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Orion">
      <circle cx="8" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="6" r="2.2" fill="var(--accent)" />
      <circle cx="24" cy="10" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="18" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="20" cy="22" r="2" fill="currentColor" opacity="0.9" />
      <circle cx="26" cy="26" r="1" fill="currentColor" opacity="0.5" />
      <line x1="8" y1="9" x2="16" y2="6" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="16" y1="6" x2="24" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="16" y1="6" x2="11" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="11" y1="18" x2="20" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="20" y1="22" x2="26" y2="26" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    </svg>
  );
}

export function WordMark() {
  return (
    <span style={{
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: '20px',
      letterSpacing: '-0.02em',
    }}>
      Orion
    </span>
  );
}

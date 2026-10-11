type LogoProps = { size: number };

const SEAM = 'C12 24.5 20 20.5 16 16C12 11.5 20 7.5 16 3Z';

export const Logo = ({ size }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <path d={`M16 3A13 13 0 0 0 16 29${SEAM}`} fill="var(--neg)" />
    <path d={`M16 3A13 13 0 0 1 16 29${SEAM}`} fill="var(--pos)" />
    <g fill="none" stroke="var(--paper)" strokeWidth="1" opacity=".5">
      <path d="M4.47 10h23.06M3 16h26M4.47 22h23.06" />
      <ellipse cx="16" cy="16" rx="7" ry="13" />
    </g>
  </svg>
);

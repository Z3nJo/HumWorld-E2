type LogoProps = { size: number };

export const Logo = ({ size }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
    <path d="M13 1a12 12 0 0 0 0 24z" fill="#d86a3c" />
    <path d="M13 1a12 12 0 0 1 0 24z" fill="#5d8fd0" />
  </svg>
);

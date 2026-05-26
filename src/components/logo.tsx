type Props = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function NestLogo({ size = 32, className, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 19c2.2 5.6 8 8.5 12 8.5S22 24.6 28 19"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M6 21c3 2.4 7 3.4 10 3.4S22 23.4 26 21"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M3.5 18c1-2 3-3.2 4.6-3.2"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M28.5 18c-1-2-3-3.2-4.6-3.2"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.7}
        strokeLinecap="round"
        opacity="0.4"
      />
      <ellipse cx="13" cy="14.5" rx="3" ry="3.6" fill="currentColor" />
      <ellipse cx="19.2" cy="13.6" rx="2.7" ry="3.3" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

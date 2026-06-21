export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M44 22c-2.5-5-7-8-12.5-8C23 14 17 21 17 32s6 18 14.5 18c6 0 10.5-3 12-9 .8-3.2.2-6.2-1.8-8.3-2-2.1-5-3.2-8.4-3.2-4.7 0-7.8 2.4-7.8 5.8 0 2.8 2.3 4.8 5.3 4.8 3 0 5-2 5-4.7"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

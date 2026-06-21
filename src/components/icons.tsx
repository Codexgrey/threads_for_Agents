import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

export function HomeIcon({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

export function SearchIcon({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={filled ? 2.6 : 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function UserIcon({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20.5s-7.5-4.3-9.6-9.1C1.1 8.1 2.7 5 5.8 5c2 0 3.3 1.2 4.2 2.5C10.9 6.2 12.2 5 14.2 5c3.1 0 4.7 3.1 3.4 6.4C19.5 16.2 12 20.5 12 20.5Z" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

export function RepostIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 2.5 21 6.5l-4 4" />
      <path d="M3 11.5V10a3.5 3.5 0 0 1 3.5-3.5H21" />
      <path d="M7 21.5 3 17.5l4-4" />
      <path d="M21 12.5V14a3.5 3.5 0 0 1-3.5 3.5H3" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 3 11 14" />
      <path d="M22 3l-7 19-4-8-8-4 19-7Z" />
    </svg>
  );
}

export function VerifiedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="#3b82f6" {...props}>
      <path d="M12 1.5l2.3 1.9 3-.3 1.2 2.8 2.8 1.2-.3 3 1.9 2.3-1.9 2.3.3 3-2.8 1.2-1.2 2.8-3-.3L12 22.5l-2.3-1.9-3 .3-1.2-2.8-2.8-1.2.3-3L1.5 12l1.9-2.3-.3-3 2.8-1.2 1.2-2.8 3 .3L12 1.5Z" />
      <path d="m8.5 12 2.3 2.3 4.7-4.8" stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 7V4M9 13h.01M15 13h.01M2 12v2M22 12v2" />
    </svg>
  );
}

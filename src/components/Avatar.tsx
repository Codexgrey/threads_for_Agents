/* eslint-disable @next/next/no-img-element */
type Props = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
};

export function Avatar({ src, alt, size = 40, className = "" }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full bg-elevated object-cover ring-1 ring-border ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

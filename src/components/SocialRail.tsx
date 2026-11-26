import { brand } from "@/data/site";

const networks = [
  {
    href: brand.instagram,
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: brand.facebook,
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor">
        <path d="M14.2 21v-7.2h2.4l.36-2.8h-2.76V9.2c0-.8.22-1.35 1.38-1.35H17.2V5.35C16.9 5.3 15.95 5.2 14.85 5.2c-2.3 0-3.88 1.4-3.88 4v1.8H8.4v2.8h2.57V21h3.23Z" />
      </svg>
    ),
  },
  {
    href: brand.twitter,
    label: "X / Twitter",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[16px] w-[16px]" fill="currentColor">
        <path d="M17.6 4h2.3L14.2 10.4 21 20h-5.4l-4.2-6.2L6.6 20H4.3l6.2-7.1L3.4 4h5.5l3.8 5.6L17.6 4Zm-.8 14.4h1.27L7.3 5.52H5.94L16.8 18.4Z" />
      </svg>
    ),
  },
];

export function SocialRail() {
  return (
    <aside className="social-rail absolute right-4 top-[46%] z-20 flex -translate-y-1/2 flex-col items-center gap-3 md:right-6 lg:right-8">
      <span className="hidden h-12 w-px bg-cream/35 sm:block" aria-hidden="true" />
      {networks.map((network) => (
        <a
          key={network.label}
          href={network.href}
          target="_blank"
          rel="noreferrer"
          aria-label={network.label}
          title={network.label}
        >
          {network.icon}
        </a>
      ))}
      <span className="hidden h-12 w-px bg-cream/35 sm:block" aria-hidden="true" />
    </aside>
  );
}

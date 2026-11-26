type Variant = "ember" | "ghost" | "light" | "ghost-light";

export function Button({
  href,
  children,
  variant = "ember",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const styles = {
    ember: "btn btn-ember",
    ghost: "btn btn-ghost",
    light: "btn btn-light",
    "ghost-light": "btn btn-ghost-light",
  }[variant];

  const classNames = `${styles} ${className}`;
  const isHttp = href.startsWith("http");

  return (
    <a
      href={href}
      className={classNames}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`display text-[0.72rem] tracking-[0.32em] text-mute ${className}`}>
      {children}
    </p>
  );
}

export function SitePage({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="site-page">
      <div className={`site-page-inner ${wide ? "is-wide" : ""}`}>{children}</div>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  light?: boolean;
}) {
  return (
    <div className="section-title max-w-2xl">
      {eyebrow ? <Eyebrow className={light ? "text-gold" : ""}>{eyebrow}</Eyebrow> : null}
      <h2 className={`section-heading serif mt-3 text-4xl leading-[1.1] md:text-5xl ${light ? "text-cream" : "text-ink"}`}>
        {title}
      </h2>
      {copy ? <p className={`mt-5 text-base leading-relaxed md:text-lg ${light ? "text-cream/80" : "text-mute"}`}>{copy}</p> : null}
    </div>
  );
}

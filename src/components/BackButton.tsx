"use client";

import { usePathname, useRouter } from "next/navigation";

function fallbackFor(pathname: string) {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/" || clean === "/admin" || clean === "/admin/login") return "/";
  const parts = clean.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

export function BackButton({
  hideOn = ["/"],
  className = "",
}: {
  hideOn?: string[];
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  if (hideOn.includes(pathname)) return null;

  function go() {
    const fallback = fallbackFor(pathname);
    if (typeof document !== "undefined") {
      try {
        const from = document.referrer ? new URL(document.referrer) : null;
        if (from && from.origin === window.location.origin && from.pathname !== pathname) {
          router.back();
          return;
        }
      } catch {
        /* use fallback */
      }
    }
    router.push(fallback);
  }

  return (
    <button type="button" className={`back-btn ${className}`.trim()} onClick={go}>
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}

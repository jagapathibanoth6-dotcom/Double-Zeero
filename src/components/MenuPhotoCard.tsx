"use client";

import { useEffect, useState } from "react";
import type { MenuItem } from "@/data/menus";

export function MenuPhotoCard({
  item,
  children,
}: {
  item: Pick<MenuItem, "name" | "description" | "photo" | "photoAlt">;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!item.photo) return <>{children}</>;

  return (
    <>
      <button type="button" className="menu-shot" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <div className="menu-lightbox" role="dialog" aria-modal="true" aria-label={item.name} onClick={() => setOpen(false)}>
          <figure className="menu-lightbox-card" onClick={(event) => event.stopPropagation()}>
            <img src={item.photo} alt={item.photoAlt || item.name} />
            <figcaption>
              <p className="serif text-2xl">{item.name}</p>
              {item.description ? <p className="mt-2 text-sm text-mute">{item.description}</p> : null}
              <button type="button" className="menu-lightbox-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

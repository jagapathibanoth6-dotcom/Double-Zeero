"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KitchenRefresh({ every = 4000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      router.refresh();
    }
    refresh();
    const id = window.setInterval(refresh, every);
    window.addEventListener("dz-admin-refresh", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("dz-admin-refresh", refresh);
    };
  }, [router, every]);

  return null;
}

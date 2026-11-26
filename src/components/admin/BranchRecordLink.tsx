"use client";

import { useRouter } from "next/navigation";
import type { LocationId } from "@/data/site";

export function BranchRecordLink({
  href,
  locationId,
  currentBranch,
  className,
  children,
}: {
  href: string;
  locationId: string;
  currentBranch: LocationId;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function open() {
    if (locationId !== currentBranch && (locationId === "manchester" || locationId === "chorlton")) {
      await fetch("/api/admin/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
    }
    router.push(href);
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

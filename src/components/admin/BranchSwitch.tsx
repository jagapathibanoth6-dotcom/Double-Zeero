"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locations, type LocationId } from "@/data/site";

const branches = Object.keys(locations) as LocationId[];

export function BranchSwitch({ branch }: { branch: LocationId }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function select(next: LocationId) {
    if (next === branch || pending) return;
    setPending(true);
    await fetch("/api/admin/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: next }),
    });
    const url = new URL(window.location.href);
    if (url.searchParams.has("location")) url.searchParams.delete("location");
    router.replace(url.pathname + url.search);
    router.refresh();
    setPending(false);
  }

  return (
    <label className="admin-branch">
      <span>Branch</span>
      <select
        value={branch}
        disabled={pending}
        onChange={(e) => select(e.target.value as LocationId)}
      >
        {branches.map((id) => (
          <option key={id} value={id}>
            {locations[id].shortName}
          </option>
        ))}
      </select>
    </label>
  );
}

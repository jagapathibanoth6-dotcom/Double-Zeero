"use client";

import { ActionButton } from "@/components/admin/ActionButton";
import { useState } from "react";

export function ConvertEnquiry({ id, time }: { id: string; time: string }) {
  const [slot, setSlot] = useState(time || "19:30");
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label>Confirm time</label>
        <input value={slot} onChange={(e) => setSlot(e.target.value)} />
      </div>
      <ActionButton action="convert_enquiry" body={{ enquiryId: id, time: slot }} label="Convert to booking" />
      <ActionButton action="decline_enquiry" body={{ enquiryId: id }} label="Decline" />
    </div>
  );
}

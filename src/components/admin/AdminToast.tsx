"use client";

import { useEffect, useState } from "react";

export function AdminToast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      setMessage(detail || "Updated.");
    }
    window.addEventListener("dz-admin-toast", onToast);
    return () => window.removeEventListener("dz-admin-toast", onToast);
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(id);
  }, [message]);

  if (!message) return null;
  return (
    <div className="admin-toast" role="status">
      {message}
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";

export function EnquiryForm({
  to,
  subjectPrefix,
  fields,
}: {
  to: string;
  subjectPrefix: string;
  fields: { name: string; label: string; type?: string; required?: boolean; options?: string[] }[];
}) {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const lines = fields
      .map((field) => `${field.label}: ${String(data.get(field.name) || "").trim()}`)
      .filter((line) => !line.endsWith(": "));
    const body = encodeURIComponent(lines.join("\n"));
    const name = String(data.get("name") || "website");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(`${subjectPrefix} — ${name}`)}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return (
      <p className="site-card p-6 text-sm leading-relaxed">
        Your email app should open with the message ready to send. If it does not, write to{" "}
        <a className="ember-link text-ink" href={`mailto:${to}`}>
          {to}
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.options ? (
            <select id={field.name} name={field.name} required={field.required} defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea id={field.name} name={field.name} required={field.required} />
          ) : (
            <input id={field.name} name={field.name} type={field.type || "text"} required={field.required} />
          )}
        </div>
      ))}
      <button type="submit" className="btn btn-ember">
        Send enquiry
      </button>
    </form>
  );
}

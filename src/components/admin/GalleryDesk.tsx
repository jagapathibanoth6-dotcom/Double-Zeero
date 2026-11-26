"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Shot = { id: string; src: string; alt: string };

export function GalleryDesk({ photos }: { photos: Shot[] }) {
  const router = useRouter();
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("action", "add");
    data.set("alt", alt);
    setBusy(true);
    const res = await fetch("/api/admin/gallery", { method: "POST", body: data });
    const json = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Photo added to the gallery." : json.error || "Could not add photo.");
    if (res.ok) {
      setAlt("");
      form.reset();
      router.refresh();
    }
  }

  async function remove(photo: Shot) {
    if (!confirm("Remove this photo from the gallery?")) return;
    setBusy(true);
    const res = await fetch("/api/admin/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, src: photo.src }),
    });
    setBusy(false);
    setMessage(res.ok ? "Photo removed." : "Could not delete photo.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="gallery-desk">
      <section className="admin-panel">
        <div className="today-panel-head">
          <div>
            <h2>Add a photo</h2>
            <p>This photo goes on the website gallery, homepage and restaurant pages.</p>
          </div>
        </div>
        <form className="gallery-add" onSubmit={add}>
          <label>
            Photo
            <input type="file" name="file" accept="image/*" required />
          </label>
          <label>
            Caption
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Margherita from the wood oven" />
          </label>
          <button className="btn btn-ember" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add photo"}
          </button>
        </form>
        {message ? <p className="record-note">{message}</p> : null}
      </section>

      <section className="admin-panel">
        <div className="today-panel-head">
          <div>
            <h2>Gallery photos</h2>
            <p>{photos.length} photos. Delete only removes it from the site gallery.</p>
          </div>
        </div>
        {photos.length ? (
          <ul className="gallery-admin-list">
            {photos.map((photo) => (
              <li key={photo.id} className="gallery-admin-card">
                <img src={photo.src} alt={photo.alt} />
                <div>
                  <p>{photo.alt || "Double Zero"}</p>
                  <button type="button" disabled={busy} onClick={() => remove(photo)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="today-empty">No photos yet. Add one above.</p>
        )}
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MENU_CATEGORIES } from "@/lib/platform/menu";

type PriceRow = { label: string; price: string };

export function MenuEditor({
  locationId,
  product,
}: {
  locationId: string;
  product?: {
    id: string;
    name: string;
    description: string;
    category: string;
    photo: string;
    dietary: string;
    note: string;
    prices: { label: string; pricePence: number; available: boolean }[];
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState(product?.photo || "");
  const [prices, setPrices] = useState<PriceRow[]>(
    product?.prices.length
      ? product.prices.map((p) => ({ label: p.label, price: (p.pricePence / 100).toFixed(2) }))
      : [{ label: "", price: "" }],
  );

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/admin/menu/photo", { method: "POST", body });
    const data = await res.json();
    if (data.photo) setPhoto(data.photo);
    else setMessage(data.error || "Photo failed.");
  }

  async function clearPhoto() {
    setPhoto("");
    if (!product?.id) return;
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_photo", id: product.id }),
    });
    if (res.ok) {
      setMessage("Picture removed.");
      router.refresh();
    } else {
      setMessage("Could not remove picture.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        id: product?.id,
        locationId,
        name: form.get("name"),
        description: form.get("description"),
        category: form.get("category"),
        dietary: form.get("dietary"),
        note: form.get("note"),
        available: form.get("available") === "on",
        photo,
        prices,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(data.error || "Could not save.");
    router.push("/admin/menu");
    router.refresh();
  }

  async function remove() {
    if (!product || !confirm("Remove this item from this branch only? The other site is not changed.")) return;
    setBusy(true);
    await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: product.id, locationId }),
    });
    router.push("/admin/menu");
    router.refresh();
  }

  return (
    <form className="record-form" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" defaultValue={product?.name} required />
      </label>
      <label>
        Description / toppings list
        <textarea name="description" defaultValue={product?.description} rows={4} />
      </label>
      <label>
        Category
        <select name="category" defaultValue={product?.category || "PIZZAS"}>
          {MENU_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dietary tags
        <input name="dietary" defaultValue={product?.dietary} placeholder="v,vg,n" />
      </label>
      <label>
        Note
        <input name="note" defaultValue={product?.note} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="available" defaultChecked={product ? product.prices.some((p) => p.available) : true} />
        Available at this branch
      </label>

      <div>
        <p className="mb-2 text-sm">Photo</p>
        {photo ? (
          <div className="menu-photo-edit">
            <img src={photo} alt="" />
            <button type="button" className="btn btn-ghost" onClick={clearPhoto}>
              Delete picture
            </button>
          </div>
        ) : (
          <p className="mb-2 text-xs text-mute">No picture on this item.</p>
        )}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>

      <div>
        <p className="mb-2 text-sm">Prices for this branch</p>
        <p className="mb-3 text-xs text-mute">Use a blank label for a single price. Add labels for sizes or extra toppings, e.g. 12&quot;, 14&quot;, Extra meat.</p>
        <div className="space-y-2">
          {prices.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2">
              <input
                placeholder="Label"
                value={row.label}
                onChange={(e) => setPrices(prices.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)))}
              />
              <input
                placeholder="12.50"
                value={row.price}
                onChange={(e) => setPrices(prices.map((p, i) => (i === index ? { ...p, price: e.target.value } : p)))}
              />
              <button type="button" className="text-sm" onClick={() => setPrices(prices.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-2 text-sm text-ember" onClick={() => setPrices([...prices, { label: "", price: "" }])}>
          Add price / size
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-ember" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save and publish"}
        </button>
        {product ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>
            Delete
          </button>
        ) : null}
      </div>
      {message ? <p className="record-note">{message}</p> : null}
    </form>
  );
}

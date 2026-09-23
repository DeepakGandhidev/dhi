"use client";

import { useEffect, useState } from "react";
import { formatBps, formatFcfa } from "@/lib/format";
import { EmptyState, Notice, Pill, ui } from "@/components/portal/ui";
import { adminFetch, useAdminData } from "./useAdmin";

type Product = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  images: string[];
  price: number;
  stock: number;
  pv: number;
  affiliateBps: number | null;
  characteristics: string[];
  delivery: string;
  warranty: string;
  returns: string;
  status: "active" | "draft";
  demo: boolean;
};
type Category = { slug: string; name: string };

const EMPTY = {
  name: "",
  category: "",
  summary: "",
  description: "",
  images: "",
  price: "",
  stock: "",
  pv: "0",
  affiliateBps: "",
  characteristics: "",
  delivery: "",
  warranty: "",
  returns: "",
  status: "active",
};

export function ProductsPanel() {
  const { data, error, loading, reload } = useAdminData<{ items: Product[] }>("/api/admin/products");
  const cats = useAdminData<{ items: Category[] }>("/api/marketplace/categories");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    if (editing === "new") setForm({ ...EMPTY, category: cats.data?.items[0]?.slug ?? "" });
    else if (editing) {
      const p = data?.items.find((x) => x._id === editing);
      if (p)
        setForm({
          name: p.name,
          category: p.category,
          summary: p.summary,
          description: p.description,
          images: p.images.join("\n"),
          price: String(p.price),
          stock: String(p.stock),
          pv: String(p.pv),
          affiliateBps: p.affiliateBps == null ? "" : String(p.affiliateBps),
          characteristics: p.characteristics.join("\n"),
          delivery: p.delivery,
          warranty: p.warranty,
          returns: p.returns,
          status: p.status,
        });
    }
    setErrors({});
  }, [editing, data, cats.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminFetch("/api/admin/products", {
        method: "POST",
        body: {
          ...form,
          id: editing === "new" ? undefined : editing,
          price: Number(form.price),
          stock: Number(form.stock),
          pv: Number(form.pv || 0),
          affiliateBps: form.affiliateBps === "" ? null : Number(form.affiliateBps),
        },
      });
      setMsg({ tone: "green", text: "Produit enregistré." });
      setEditing(null);
      reload();
    } catch (err) {
      setErrors((err as { errors?: Record<string, string> }).errors ?? {});
      setMsg({ tone: "red", text: (err as Error).message });
    }
  }

  const f = (name: string, label: string, multiline = false, hint?: string) => (
    <label className={ui.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea className={ui.input} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
      ) : (
        <input className={ui.input} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
      )}
      {hint ? <small className={ui.rowMeta}>{hint}</small> : null}
      {errors[name] ? <p className={ui.fieldError}>{errors[name]}</p> : null}
    </label>
  );

  return (
    <div className={ui.page}>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {editing ? (
        <form className={`${ui.card} ${ui.formGrid}`} onSubmit={save}>
          <h2 className={ui.sectionTitle} style={{ margin: 0 }}>{editing === "new" ? "Nouveau produit" : "Modifier le produit"}</h2>
          <div className={ui.grid2}>
            {f("name", "Nom")}
            <label className={ui.field}>
              <span>Catégorie</span>
              <select className={ui.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {cats.data?.items.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              {errors.category ? <p className={ui.fieldError}>{errors.category}</p> : null}
            </label>
            {f("price", "Prix public (FCFA)")}
            {f("stock", "Stock")}
            {f("pv", "PV par unité", false, "Crédités à l'acheteur membre et remontés dans son réseau.")}
            {f("affiliateBps", "Commission affilié (points de base)", false, "Vide = taux par défaut. 800 = 8 %.")}
          </div>
          {f("summary", "Résumé")}
          {f("description", "Description", true)}
          {f("characteristics", "Caractéristiques (une par ligne)", true)}
          {f("images", "Photos (une adresse https:// par ligne)", true)}
          <div className={ui.grid3}>
            {f("delivery", "Livraison")}
            {f("warranty", "Garantie")}
            {f("returns", "Retours")}
          </div>
          <label className={ui.field}>
            <span>Statut</span>
            <select className={ui.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Publié</option>
              <option value="draft">Brouillon</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={ui.btn}>Enregistrer</button>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setEditing(null)}>Annuler</button>
          </div>
        </form>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button className={ui.btn} onClick={() => setEditing("new")}>Nouveau produit</button>
          <form
            style={{ display: "flex", gap: 8 }}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch("/api/admin/categories", { method: "POST", body: { name: newCat } });
                setNewCat("");
                cats.reload();
                setMsg({ tone: "green", text: "Catégorie ajoutée." });
              } catch (err) {
                setMsg({ tone: "red", text: (err as Error).message });
              }
            }}
          >
            <input className={ui.input} placeholder="Nouvelle catégorie" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button className={`${ui.btn} ${ui.btnGhost}`}>Ajouter</button>
          </form>
        </div>
      )}

      <section className={ui.card}>
        {error ? <Notice tone="red">{error}</Notice> : null}
        {!data || loading ? (
          <div className={ui.skeleton} style={{ height: 160 }} />
        ) : data.items.length === 0 ? (
          <EmptyState icon="store">Aucun produit. Ajoutez-en un ou lancez « npm run db:seed ».</EmptyState>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className={ui.num}>Prix</th>
                  <th className={ui.num}>Stock</th>
                  <th className={ui.num}>PV</th>
                  <th className={ui.num}>Commission</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className={ui.rowMeta}>
                        <span>{p.category}</span>
                        {p.status === "draft" ? <Pill>Brouillon</Pill> : null}
                        {p.demo ? <Pill tone="gold">Démo</Pill> : null}
                      </div>
                    </td>
                    <td className={ui.num}>{formatFcfa(p.price)}</td>
                    <td className={ui.num}>{p.stock}</td>
                    <td className={ui.num}>{p.pv}</td>
                    <td className={ui.num}>{p.affiliateBps == null ? "défaut" : formatBps(p.affiliateBps)}</td>
                    <td>
                      <button className={`${ui.btn} ${ui.btnSmall} ${ui.btnGhost}`} onClick={() => setEditing(p._id)}>Modifier</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

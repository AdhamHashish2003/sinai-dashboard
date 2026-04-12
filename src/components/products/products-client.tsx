"use client";

import { useState } from "react";
import {
  Package,
  ExternalLink,
  Target,
  MessageSquare,
  Edit,
  X,
  Send,
} from "lucide-react";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  status: string;
  icp: string;
  targetKeywords: string[];
  targetSubreddits: string[];
  valueProp: string;
  freeTierHook: string;
  prodUrl: string;
  groqKey: string;
  telegramChatId: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  idea: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  launched: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  retired: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function ProductsClient({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [editing, setEditing] = useState<Product | null>(null);

  function handleSaved(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight lf-scanline">
          <span className="lf-dot lf-dot-orange mr-2" />
          Products
        </h2>
        <p className="text-xs mt-2" style={{ color: "var(--lf-text-dim)" }}>
          Multi-tenant root · every signal, lead, draft, and post is scoped to a product
        </p>
      </div>

      {products.length === 0 ? (
        <div className="lf-card-static py-16 text-center">
          <Package size={32} className="mx-auto mb-3" style={{ color: "var(--lf-text-dim)" }} />
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--lf-text-dim)" }}>
            No products yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => setEditing(product)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditProductDrawer
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
}: {
  product: Product;
  onEdit: () => void;
}) {
  return (
    <div className="lf-card p-5 relative">
      <button
        onClick={onEdit}
        className="absolute top-3 right-3 rounded-md p-1.5 transition-colors"
        style={{ color: "var(--lf-text-dim)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--lf-orange)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--lf-text-dim)")}
        title="Edit product"
        aria-label="Edit product"
      >
        <Edit size={13} />
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-3">
          <div
            className="rounded-lg p-2.5"
            style={{
              background: "rgba(255, 107, 0, 0.1)",
              border: "1px solid var(--lf-border)",
            }}
          >
            <Package size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{product.name}</h3>
            <p className="text-xs font-mono" style={{ color: "var(--lf-text-dim)" }}>
              /{product.slug}
            </p>
          </div>
        </div>
      </div>

      <span
        className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full capitalize border mb-3 ${
          STATUS_STYLES[product.status] ?? STATUS_STYLES.idea
        }`}
      >
        {product.status}
      </span>

      {product.tagline && (
        <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--lf-text-dim)" }}>
          {product.tagline}
        </p>
      )}

      <div className="space-y-2 mb-4">
        {product.icp && (
          <div className="flex items-start gap-2">
            <Target size={12} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs line-clamp-2" style={{ color: "var(--lf-text-dim)" }}>
              {product.icp}
            </p>
          </div>
        )}
        {product.valueProp && (
          <div className="flex items-start gap-2">
            <MessageSquare size={12} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs line-clamp-2" style={{ color: "var(--lf-text-dim)" }}>
              {product.valueProp}
            </p>
          </div>
        )}
        {product.telegramChatId && (
          <div className="flex items-start gap-2">
            <Send size={12} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs font-mono" style={{ color: "var(--lf-text-dim)" }}>
              Telegram: {product.telegramChatId}
            </p>
          </div>
        )}
      </div>

      {product.targetKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {product.targetKeywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "rgba(255, 107, 0, 0.1)",
                color: "var(--lf-orange)",
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid var(--lf-border)" }}
      >
        {product.freeTierHook && (
          <span className="text-[10px] text-emerald-400">{product.freeTierHook}</span>
        )}
        {product.prodUrl && (
          <a
            href={product.prodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] hover:text-foreground transition-colors ml-auto"
            style={{ color: "var(--lf-text-dim)" }}
          >
            <ExternalLink size={10} />
            {product.prodUrl.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
    </div>
  );
}

function EditProductDrawer({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (updated: Product) => void;
}) {
  const [form, setForm] = useState<Product>(product);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        tagline: form.tagline,
        status: form.status,
        icp: form.icp,
        targetKeywords: form.targetKeywords,
        targetSubreddits: form.targetSubreddits,
        valueProp: form.valueProp,
        freeTierHook: form.freeTierHook,
        prodUrl: form.prodUrl,
        telegramChatId: form.telegramChatId,
      };
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save");
        return;
      }
      onSaved(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSave}
        className="w-full sm:w-[520px] overflow-y-auto"
        style={{
          background: "var(--lf-bg-card)",
          backdropFilter: "blur(14px)",
          borderLeft: "1px solid var(--lf-border)",
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            background: "var(--lf-bg-card)",
            borderBottom: "1px solid var(--lf-border)",
          }}
        >
          <div>
            <h3 className="text-sm font-semibold">Edit Product</h3>
            <p className="text-[10px] font-mono" style={{ color: "var(--lf-text-dim)" }}>
              /{product.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors"
            style={{ color: "var(--lf-text-dim)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="lf-input"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="lf-input"
            >
              <option value="idea">Idea</option>
              <option value="building">Building</option>
              <option value="launched">Launched</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </Field>

          <Field label="Tagline">
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="lf-input"
              placeholder="One-liner"
            />
          </Field>

          <Field label="Value Prop">
            <textarea
              value={form.valueProp}
              onChange={(e) => setForm({ ...form, valueProp: e.target.value })}
              className="lf-input resize-none"
              rows={3}
            />
          </Field>

          <Field label="ICP">
            <textarea
              value={form.icp}
              onChange={(e) => setForm({ ...form, icp: e.target.value })}
              className="lf-input resize-none"
              rows={2}
            />
          </Field>

          <Field label="Free Tier Hook">
            <input
              type="text"
              value={form.freeTierHook}
              onChange={(e) => setForm({ ...form, freeTierHook: e.target.value })}
              className="lf-input"
              placeholder="1 free permit report per email"
            />
          </Field>

          <Field label="Production URL">
            <input
              type="url"
              value={form.prodUrl}
              onChange={(e) => setForm({ ...form, prodUrl: e.target.value })}
              className="lf-input"
              placeholder="https://..."
            />
          </Field>

          <Field
            label="Telegram Chat ID"
            hint="DM @userinfobot on Telegram to find your chat ID"
          >
            <input
              type="text"
              value={form.telegramChatId}
              onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
              className="lf-input font-mono"
              placeholder="123456789"
            />
          </Field>

          <Field label="Target Keywords (comma-separated)">
            <textarea
              value={form.targetKeywords.join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetKeywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              className="lf-input resize-none"
              rows={2}
            />
          </Field>

          <Field label="Target Subreddits (comma-separated, no r/ prefix)">
            <textarea
              value={form.targetSubreddits.join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetSubreddits: e.target.value
                    .split(",")
                    .map((s) => s.trim().replace(/^r\//, ""))
                    .filter(Boolean),
                })
              }
              className="lf-input resize-none"
              rows={2}
            />
          </Field>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="lf-btn lf-btn-primary flex-1"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="lf-btn lf-btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <style jsx>{`
        .lf-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--lf-border);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: var(--lf-text);
          font-family: inherit;
        }
        .lf-input:focus {
          outline: none;
          border-color: var(--lf-orange);
          box-shadow: 0 0 0 1px var(--lf-orange-glow);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase tracking-widest mb-1.5"
        style={{ color: "var(--lf-text-dim)" }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[10px] mt-1" style={{ color: "var(--lf-text-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

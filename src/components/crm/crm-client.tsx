"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Users,
  Plus,
  Play,
  Download,
  Loader2,
  ExternalLink,
  Building2,
  MapPin,
  Clock,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LeadDrawer, type Lead } from "./lead-drawer";

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  products: Product[];
  leads: Lead[];
}

const STATUS_COLUMNS = [
  { id: "new", label: "New", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
  { id: "enriched", label: "Enriched", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
  { id: "contacted", label: "Contacted", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
  { id: "replied", label: "Replied", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
  { id: "trial", label: "Trial", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5" },
  { id: "paid", label: "Paid", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
  { id: "dead", label: "Dead", color: "text-zinc-500 border-zinc-500/20 bg-zinc-500/5" },
] as const;

const SOURCE_STYLES: Record<string, string> = {
  scout: "bg-emerald-500/10 text-emerald-400",
  radar: "bg-orange-500/10 text-orange-400",
  manual: "bg-zinc-500/10 text-zinc-400",
  inbound: "bg-primary/10 text-primary",
};

export function CrmClient({ products, leads: initial }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [productFilter, setProductFilter] = useState<string>(
    products[0]?.id ?? "all"
  );
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [scoutRunning, setScoutRunning] = useState(false);
  const [scoutMessage, setScoutMessage] = useState<string | null>(null);
  const [scoutSearchQuery, setScoutSearchQuery] = useState("");
  const [scoutLocation, setScoutLocation] = useState("");
  const pollRef = useRef<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = leads.filter(
    (l) => productFilter === "all" || l.productId === productFilter
  );

  function getColumn(status: string): Lead[] {
    return filtered.filter((l) => l.status === status);
  }

  async function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  async function persistStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        // Revert
        console.error("Failed to update lead status");
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    const lead = leads.find((l) => l.id === id);
    setDraggingLead(lead ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingLead(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLead = leads.find((l) => l.id === activeId);
    if (!activeLead) return;

    // Determine target column: overId is either a column id or another lead id
    let targetStatus = STATUS_COLUMNS.find((c) => c.id === overId)?.id;
    if (!targetStatus) {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) targetStatus = overLead.status as typeof STATUS_COLUMNS[number]["id"];
    }
    if (!targetStatus || targetStatus === activeLead.status) return;

    updateLead(activeId, { status: targetStatus });
    persistStatus(activeId, targetStatus);
  }

  async function handleRunScout() {
    if (productFilter === "all") {
      setScoutMessage("Select a product first");
      setTimeout(() => setScoutMessage(null), 3000);
      return;
    }
    setScoutRunning(true);
    setScoutMessage("Submitting scout job to Google Maps…");

    const trimmedQuery = scoutSearchQuery.trim();
    const trimmedLocation = scoutLocation.trim();

    try {
      const res = await fetch("/api/scout/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productFilter,
          // Fall back to CA only when no location is specified. Location
          // overrides the default + bypasses the product's city rotation.
          state: trimmedLocation ? "" : "CA",
          ...(trimmedQuery ? { searchQuery: trimmedQuery } : {}),
          ...(trimmedLocation ? { location: trimmedLocation } : {}),
        }),
      });

      const body = await res.json();

      if (!res.ok || body.success === false) {
        const googleDetail = body.googleErrorMessage
          ? ` (${body.googleStatus ?? "ERROR"}: ${body.googleErrorMessage})`
          : body.googleStatus
          ? ` (${body.googleStatus})`
          : "";
        setScoutMessage(`Scout failed: ${body.error ?? "unknown"}${googleDetail}`);
        setScoutRunning(false);
        setTimeout(() => setScoutMessage(null), 8000);
        return;
      }

      if (typeof body.leadsCreated === "number") {
        setScoutRunning(false);
        setScoutMessage(
          `Scout done — ${body.leadsCreated} leads added${
            body.duplicatesSkipped ? `, ${body.duplicatesSkipped} dupes skipped` : ""
          }. Reloading…`
        );
        setTimeout(() => window.location.reload(), 1200);
        return;
      }

      const jobId = body.jobId as string;
      setScoutMessage("Scout running… polling every 5s");
      pollScoutJob(jobId);
    } catch (err) {
      setScoutMessage(`Scout error: ${err instanceof Error ? err.message : "unknown"}`);
      setScoutRunning(false);
      setTimeout(() => setScoutMessage(null), 6000);
    }
  }

  const pollScoutJob = useCallback((jobId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/scout/jobs/${jobId}`);
        const body = await res.json();

        if (body.status === "done") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setScoutRunning(false);
          setScoutMessage(`Scout done — ${body.resultsCount} leads added. Reloading…`);
          // Hard reload to pick up new leads from the server component
          setTimeout(() => window.location.reload(), 1200);
        } else if (body.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setScoutRunning(false);
          setScoutMessage(`Scout failed: ${body.error ?? "unknown"}`);
          setTimeout(() => setScoutMessage(null), 6000);
        }
      } catch (err) {
        console.error("poll error:", err);
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function handleExport() {
    const qs = productFilter !== "all" ? `?productId=${productFilter}` : "";
    window.open(`/api/leads/export${qs}`, "_blank");
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">CRM</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Leads from Scout, Radar, inbound, and manual capture. Drag cards between columns as you work them.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          {products.length > 1 && <option value="all">All Products</option>}
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={scoutSearchQuery}
          onChange={(e) => setScoutSearchQuery(e.target.value)}
          placeholder='What to find (e.g. "dental clinic")'
          disabled={scoutRunning}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !scoutRunning) handleRunScout();
          }}
          className="w-56 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
        />

        <input
          type="text"
          value={scoutLocation}
          onChange={(e) => setScoutLocation(e.target.value)}
          placeholder='Where (e.g. "Cairo, Egypt")'
          disabled={scoutRunning}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !scoutRunning) handleRunScout();
          }}
          className="w-52 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
        />

        <button
          onClick={handleRunScout}
          disabled={scoutRunning}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {scoutRunning ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Play size={12} />
          )}
          Run Scout
        </button>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus size={12} />
          Add Lead
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>

        {/* Reset leads — scoped to the selected product only. The button is
            disabled whenever "All Products" is selected so a missed click can't
            nuke leads across the fleet. */}
        <button
          onClick={() => {
            setResetConfirmText("");
            setResetError(null);
            setShowResetModal(true);
          }}
          disabled={productFilter === "all" || resetting}
          title={
            productFilter === "all"
              ? "Pick a specific product first"
              : "Delete every lead for the selected product"
          }
          className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-card px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 hover:border-red-400/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          Reset leads
        </button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {scoutMessage && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {scoutMessage}
        </div>
      )}

      {/* Kanban */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Users size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No leads yet. Click Run Scout to pull CSLB-licensed ADU builders, or Add Lead for manual entries.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((col) => {
              const items = getColumn(col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  color={col.color}
                  items={items}
                  onCardClick={(lead) => setActiveLead(lead)}
                />
              );
            })}
          </div>

          <DragOverlay>
            {draggingLead ? (
              <div className="rounded-lg border border-primary bg-card p-3 shadow-xl rotate-3">
                <div className="text-sm font-semibold">{draggingLead.name}</div>
                {draggingLead.company && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {draggingLead.company}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {activeLead && (
        <LeadDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onUpdate={updateLead}
          onDelete={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
        />
      )}

      {showAddForm && (
        <AddLeadForm
          products={products}
          defaultProductId={productFilter !== "all" ? productFilter : products[0]?.id}
          onClose={() => setShowAddForm(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setShowAddForm(false);
          }}
        />
      )}

      {showResetModal && productFilter !== "all" && (() => {
        const product = products.find((p) => p.id === productFilter);
        if (!product) return null;
        // Bind non-null values into the closure so the nested async function
        // doesn't lose the type narrowing from the early return above.
        const productId = product.id;
        const productSlug = product.slug;
        const leadCount = leads.filter((l) => l.productId === productFilter).length;
        const slugMatches = resetConfirmText.trim() === productSlug;

        async function confirmReset() {
          setResetting(true);
          setResetError(null);
          try {
            const res = await fetch("/api/leads", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId, confirmSlug: productSlug }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              setResetError(body.error ?? `Reset failed (${res.status})`);
              return;
            }
            // Drop every lead for this product from local state — no reload needed.
            setLeads((prev) => prev.filter((l) => l.productId !== productId));
            setShowResetModal(false);
            setResetConfirmText("");
          } catch (err) {
            setResetError(err instanceof Error ? err.message : "Network error");
          } finally {
            setResetting(false);
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-card p-6 shadow-2xl">
              <div className="flex items-start gap-3 mb-4">
                <Trash2 size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold">Reset leads for {product.name}?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    This permanently deletes <strong>{leadCount} lead{leadCount === 1 ? "" : "s"}</strong>{" "}
                    scoped to <code className="text-[11px]">{product.slug}</code>. Irreversible.
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Type <code className="text-[11px] text-foreground">{product.slug}</code> to confirm
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  autoFocus
                  disabled={resetting}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-red-400/50 disabled:opacity-50"
                  placeholder={product.slug}
                />
              </div>

              {resetError && (
                <p className="text-xs text-red-400 mb-3">{resetError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={confirmReset}
                  disabled={!slugMatches || resetting}
                  className="flex-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium py-2 hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resetting ? "Deleting…" : `Delete ${leadCount} lead${leadCount === 1 ? "" : "s"}`}
                </button>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText("");
                    setResetError(null);
                  }}
                  disabled={resetting}
                  className="rounded-md border border-border text-xs text-muted-foreground px-3 py-2 hover:bg-muted/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function KanbanColumn({
  id,
  label,
  color,
  items,
  onCardClick,
}: {
  id: string;
  label: string;
  color: string;
  items: Lead[];
  onCardClick: (lead: Lead) => void;
}) {
  return (
    <div className={`w-72 shrink-0 rounded-xl border ${color} flex flex-col min-h-[500px]`}>
      <div className="px-3 py-2.5 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{label}</h3>
        <span className="text-[10px] font-mono opacity-60">{items.length}</span>
      </div>
      <SortableContext
        id={id}
        items={items.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-2 space-y-2 overflow-y-auto" data-column-id={id}>
          {items.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
          {items.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-8">
              empty
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        // only open drawer on click without drag
        if (!isDragging) onClick();
      }}
      className="rounded-lg border border-border bg-card p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-xs font-semibold line-clamp-1 flex-1">{lead.name}</div>
        <span
          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
            SOURCE_STYLES[lead.source] ?? "bg-zinc-500/10 text-zinc-400"
          }`}
        >
          {lead.source}
        </span>
      </div>

      {lead.company && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
          <Building2 size={9} />
          <span className="line-clamp-1">{lead.company}</span>
        </div>
      )}

      {(lead.city || lead.state) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
          <MapPin size={9} />
          <span>{[lead.city, lead.state].filter(Boolean).join(", ")}</span>
        </div>
      )}

      {lead.role && (
        <div className="text-[10px] text-muted-foreground mb-1">{lead.role}</div>
      )}

      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
        {lead.lastTouchAt ? (
          <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Clock size={9} />
            {formatDistanceToNow(new Date(lead.lastTouchAt), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-[9px] text-muted-foreground">
            Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </span>
        )}
        {lead.sourceUrl && (
          <a
            href={lead.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground"
            title="Open source"
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

function AddLeadForm({
  products,
  defaultProductId,
  onClose,
  onCreated,
}: {
  products: Product[];
  defaultProductId?: string;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    productId: defaultProductId ?? products[0]?.id ?? "",
    name: "",
    company: "",
    role: "",
    email: "",
    city: "",
    state: "",
    sourceUrl: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.productId) {
      setError("Name and product are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          name: form.name.trim(),
          company: form.company.trim() || null,
          role: form.role.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          sourceUrl: form.sourceUrl.trim() || null,
          notes: form.notes.trim() || null,
          source: "manual",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create lead");
        return;
      }
      const lead = body.lead;
      const product = products.find((p) => p.id === lead.productId);
      onCreated({
        ...lead,
        productName: product?.name ?? "",
        productSlug: product?.slug ?? "",
        enrichmentJson: lead.enrichmentJson ?? {},
        createdAt:
          typeof lead.createdAt === "string"
            ? lead.createdAt
            : new Date(lead.createdAt).toISOString(),
        lastTouchAt: lead.lastTouchAt ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Add Lead (Manual)</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="Product">
            <select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Name *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              placeholder="John Contractor"
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Company">
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </FormField>
            <FormField label="Role">
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </FormField>
          </div>
          <FormField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="City">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </FormField>
            <FormField label="State">
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                placeholder="CA"
              />
            </FormField>
          </div>
          <FormField label="Source URL">
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none"
              placeholder="How did you find them?"
            />
          </FormField>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Lead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase text-muted-foreground mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

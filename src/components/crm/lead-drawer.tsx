"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Mail, Building2, MapPin, User, Phone, FileText, Trash2 } from "lucide-react";

export interface Lead {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  source: string;
  sourceUrl: string;
  name: string;
  email: string;
  company: string;
  role: string;
  city: string;
  state: string;
  enrichmentJson: Record<string, unknown>;
  status: string;
  lastTouchAt: string;
  replyReceived: boolean;
  notes: string;
  createdAt: string;
}

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Lead>) => void;
  onDelete: (id: string) => void;
}

export function LeadDrawer({ lead, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setNotes(lead?.notes ?? "");
    setConfirmingDelete(false);
  }, [lead?.id, lead?.notes]);

  if (!lead) return null;

  async function saveNotes() {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) onUpdate(lead.id, { notes });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(lead.id);
        onClose();
      } else {
        setDeleting(false);
        setConfirmingDelete(false);
      }
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const enrich = lead.enrichmentJson;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full sm:w-[500px] bg-card border-l border-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-card border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">{lead.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{lead.productSlug}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Core fields */}
          <div className="space-y-2">
            {lead.company && (
              <Field icon={Building2} label="Company" value={lead.company} />
            )}
            {lead.role && <Field icon={User} label="Role" value={lead.role} />}
            {lead.email && (
              <Field
                icon={Mail}
                label="Email"
                value={lead.email}
                href={`mailto:${lead.email}`}
              />
            )}
            {(lead.city || lead.state) && (
              <Field
                icon={MapPin}
                label="Location"
                value={[lead.city, lead.state].filter(Boolean).join(", ")}
              />
            )}
            {typeof enrich.phone === "string" && enrich.phone && (
              <Field icon={Phone} label="Phone" value={enrich.phone} />
            )}
            {typeof enrich.mailing_address === "string" && enrich.mailing_address && (
              <Field
                icon={FileText}
                label="Mailing Address"
                value={enrich.mailing_address}
              />
            )}
          </div>

          {/* Source */}
          {lead.sourceUrl && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Source</div>
              <a
                href={lead.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
              >
                <ExternalLink size={11} />
                {lead.sourceUrl}
              </a>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={5}
              placeholder="Add notes about this lead..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
            {saving && (
              <p className="text-[10px] text-muted-foreground mt-1">Saving…</p>
            )}
          </div>

          {/* Enrichment JSON */}
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">
              Enrichment
            </div>
            <pre className="rounded-lg border border-border bg-background/50 p-3 text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(enrich, null, 2)}
            </pre>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-border text-[10px] text-muted-foreground space-y-1">
            <div>Source: {lead.source}</div>
            <div>Created: {new Date(lead.createdAt).toLocaleString()}</div>
            {lead.lastTouchAt && (
              <div>Last touch: {new Date(lead.lastTouchAt).toLocaleString()}</div>
            )}
          </div>

          {/* Destructive actions — two-click confirmation, not a native confirm()
              dialog because those block the whole tab. */}
          <div className="pt-4 border-t border-border">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium py-2 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : `Yes, delete ${lead.name}`}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-md border border-border text-xs text-muted-foreground px-3 py-2 hover:bg-muted/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-md border border-border text-xs text-red-400 px-3 py-1.5 hover:bg-red-400/10 hover:border-red-400/30 transition-colors"
              >
                <Trash2 size={12} />
                Delete lead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        {href ? (
          <a href={href} className="text-xs text-foreground hover:text-primary break-all">
            {value}
          </a>
        ) : (
          <div className="text-xs text-foreground break-all">{value}</div>
        )}
      </div>
    </div>
  );
}

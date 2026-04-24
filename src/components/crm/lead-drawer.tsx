"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldQuestion,
  Trash2,
  Video,
  X,
} from "lucide-react";

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

  const enrichment = lead.enrichmentJson ?? {};
  const emails = getEmails(lead);
  const instagram = asStringArray(enrichment.instagram);
  const tiktok = asStringArray(enrichment.tiktok);
  const website = asString(enrichment.website);
  const phone = asString(enrichment.phone);
  const address = asString(enrichment.address);
  const foundingDate = asString(enrichment.foundingDate);
  const goodSocial = enrichment.goodSocialMedia;
  const maxVideoViews = asNumber(enrichment.maxVideoViews);

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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full overflow-y-auto border-l border-border bg-card sm:w-[560px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[lead.city, lead.state].filter(Boolean).join(", ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="space-y-2">
            <Field icon={Building2} label="Clinic" value={lead.company || lead.name} />
            {address && <Field icon={MapPin} label="Address" value={address} />}
            {phone && <Field icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />}
            {website && <Field icon={Globe} label="Website" value={website} href={website} />}
            {emails.length > 0 && (
              <Field icon={Mail} label="Business emails" value={emails.join(", ")} href={`mailto:${emails[0]}`} />
            )}
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <SignalCard
              icon={Video}
              label="Good social media"
              value={
                goodSocial === true
                  ? `Yes${maxVideoViews ? `, max ${formatViews(maxVideoViews)} views` : ""}`
                  : goodSocial === false
                  ? `No${maxVideoViews ? `, max ${formatViews(maxVideoViews)} views` : ""}`
                  : instagram.length || tiktok.length
                  ? "Unknown, links found but views blocked"
                  : "No social media found"
              }
            />
            <SignalCard
              icon={ShieldQuestion}
              label="Franchise"
              value={enrichment.isFranchise === true ? "Yes" : "No"}
            />
            <SignalCard
              icon={Calendar}
              label="Founding date"
              value={foundingDate || "Unknown"}
            />
            <SignalCard
              icon={ExternalLink}
              label="Source"
              value={lead.source || "google_maps"}
            />
          </section>

          {(instagram.length > 0 || tiktok.length > 0 || lead.sourceUrl) && (
            <section>
              <div className="mb-2 text-[10px] uppercase text-muted-foreground">Links</div>
              <div className="flex flex-wrap gap-2">
                {instagram.map((url) => (
                  <LinkPill key={url} href={url} label="Instagram" />
                ))}
                {tiktok.map((url) => (
                  <LinkPill key={url} href={url} label="TikTok" />
                ))}
                {lead.sourceUrl && <LinkPill href={lead.sourceUrl} label="Google Maps" />}
              </div>
            </section>
          )}

          <section>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Notes</div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={saveNotes}
              rows={5}
              placeholder="Add outreach notes about this clinic..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {saving && <p className="mt-1 text-[10px] text-muted-foreground">Saving...</p>}
          </section>

          {asString(enrichment.foundingEvidence) && (
            <section>
              <div className="mb-1 text-[10px] uppercase text-muted-foreground">Founding evidence</div>
              <p className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                {asString(enrichment.foundingEvidence)}
              </p>
            </section>
          )}

          <section>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Raw enrichment</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-3 font-mono text-[10px] text-muted-foreground">
              {JSON.stringify(enrichment, null, 2)}
            </pre>
          </section>

          <section className="border-t border-border pt-4 text-[10px] text-muted-foreground">
            <div>Created: {new Date(lead.createdAt).toLocaleString()}</div>
            {lead.lastTouchAt && (
              <div>Last touch: {new Date(lead.lastTouchAt).toLocaleString()}</div>
            )}
          </section>

          <section className="border-t border-border pt-4">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-md border border-red-500/40 bg-red-500/20 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : `Yes, delete ${lead.name}`}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-400/30 hover:bg-red-400/10"
              >
                <Trash2 size={12} />
                Delete clinic
              </button>
            )}
          </section>
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
      <Icon size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="break-all text-xs text-foreground hover:text-primary"
          >
            {value}
          </a>
        ) : (
          <div className="break-all text-xs text-foreground">{value}</div>
        )}
      </div>
    </div>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] text-primary hover:bg-primary/10"
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

function getEmails(lead: Lead): string[] {
  const emails = asStringArray(lead.enrichmentJson.emails);
  if (lead.email && !emails.includes(lead.email)) emails.unshift(lead.email);
  return emails;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function formatViews(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

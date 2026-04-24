"use client";

import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Play,
  RotateCcw,
  Search,
  ShieldQuestion,
  Stethoscope,
  Trash2,
  Video,
} from "lucide-react";
import { LeadDrawer, type Lead } from "./lead-drawer";

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  product: Product;
  leads: Lead[];
}

const STATUS_OPTIONS = [
  "new",
  "enriched",
  "contacted",
  "replied",
  "trial",
  "paid",
  "dead",
] as const;

type SocialFilter = "all" | "good" | "not-good" | "none" | "unknown";
type BinaryFilter = "all" | "yes" | "no";

export function CrmClient({ product, leads: initial }: Props) {
  const [leads, setLeads] = useState(initial);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [state, setState] = useState("California");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(10);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [socialFilter, setSocialFilter] = useState<SocialFilter>("all");
  const [emailFilter, setEmailFilter] = useState<BinaryFilter>("all");
  const [franchiseFilter, setFranchiseFilter] = useState<BinaryFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const cities = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean))).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const enrichment = getEnrichment(lead);
      const quality = getSocialQuality(lead);
      const emailCount = getEmails(lead).length;
      const franchise = enrichment.isFranchise === true;

      if (cityFilter !== "all" && lead.city !== cityFilter) return false;
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (socialFilter !== "all" && quality !== socialFilter) return false;
      if (emailFilter === "yes" && emailCount === 0) return false;
      if (emailFilter === "no" && emailCount > 0) return false;
      if (franchiseFilter === "yes" && !franchise) return false;
      if (franchiseFilter === "no" && franchise) return false;

      if (!needle) return true;
      const searchable = [
        lead.name,
        lead.company,
        lead.email,
        lead.city,
        lead.state,
        enrichment.address,
        enrichment.phone,
        enrichment.website,
        getEmails(lead).join(" "),
        getSocialLinks(lead).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [
    leads,
    query,
    cityFilter,
    statusFilter,
    socialFilter,
    emailFilter,
    franchiseFilter,
  ]);

  const stats = useMemo(() => {
    const withEmail = leads.filter((lead) => getEmails(lead).length > 0).length;
    const noSocial = leads.filter((lead) => getSocialQuality(lead) === "none").length;
    const goodSocial = leads.filter((lead) => getSocialQuality(lead) === "good").length;
    const franchise = leads.filter((lead) => getEnrichment(lead).isFranchise === true).length;
    return { withEmail, noSocial, goodSocial, franchise };
  }, [leads]);

  async function handleRunScout() {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setMessage("Enter a California city first.");
      return;
    }

    setRunning(true);
    setMessage(`Fetching dental clinics in ${trimmedCity}, ${state}...`);

    try {
      const res = await fetch("/api/scout/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          state,
          city: trimmedCity,
          limit,
        }),
      });
      const body = await res.json();

      if (!res.ok || body.success === false) {
        setMessage(body.error ?? `Scout failed (${res.status})`);
        return;
      }

      setMessage(
        `Added ${body.leadsCreated} dental clinics${
          body.duplicatesSkipped ? `, skipped ${body.duplicatesSkipped} duplicates` : ""
        }. Reloading...`
      );
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Scout failed");
    } finally {
      setRunning(false);
    }
  }

  async function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setMessage("Could not save lead update. Reload if the row looks stale.");
    }
  }

  function handleExport() {
    window.open(`/api/leads/export?productId=${product.id}`, "_blank");
  }

  async function confirmReset() {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, confirmSlug: product.slug }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(body.error ?? `Reset failed (${res.status})`);
        return;
      }
      setLeads([]);
      setShowResetModal(false);
      setResetConfirmText("");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Network error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope size={22} className="text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Dental CRM</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live California dental clinic discovery with websites, emails, social links,
            video signal, founding date, and franchise checks.
          </p>
        </div>

        <div className="grid gap-2 rounded-lg border border-border bg-card/70 p-3 sm:grid-cols-[150px_180px_96px_auto]">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-muted-foreground">
              State
            </span>
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              disabled={running}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="California">California</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-muted-foreground">
              City
            </span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !running) handleRunScout();
              }}
              disabled={running}
              placeholder="San Diego"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] uppercase text-muted-foreground">
              Limit
            </span>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              disabled={running}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
            >
              {[5, 10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleRunScout}
            disabled={running}
            className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:mt-5"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            Fetch Dental
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Total clinics" value={leads.length} />
        <Stat label="Emails found" value={stats.withEmail} />
        <Stat label="Good social" value={stats.goodSocial} />
        <Stat label="No social" value={stats.noSocial} />
      </div>

      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-64 flex-1">
            <span className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
              <Search size={11} />
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Clinic, website, email, social handle..."
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
            />
          </label>

          <FilterSelect label="City" value={cityFilter} onChange={setCityFilter}>
            <option value="all">All cities</option>
            {cities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Social" value={socialFilter} onChange={(v) => setSocialFilter(v as SocialFilter)}>
            <option value="all">All social</option>
            <option value="good">Good videos</option>
            <option value="not-good">Not good</option>
            <option value="none">No social</option>
            <option value="unknown">Unknown</option>
          </FilterSelect>

          <FilterSelect label="Email" value={emailFilter} onChange={(v) => setEmailFilter(v as BinaryFilter)}>
            <option value="all">Any email</option>
            <option value="yes">Has email</option>
            <option value="no">No email</option>
          </FilterSelect>

          <FilterSelect
            label="Franchise"
            value={franchiseFilter}
            onChange={(v) => setFranchiseFilter(v as BinaryFilter)}
          >
            <option value="all">Any</option>
            <option value="yes">Franchise</option>
            <option value="no">Independent</option>
          </FilterSelect>

          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FilterSelect>

          <button
            onClick={() => {
              setQuery("");
              setCityFilter("all");
              setSocialFilter("all");
              setEmailFilter("all");
              setFranchiseFilter("all");
              setStatusFilter("all");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={12} />
            Clear
          </button>

          <button
            onClick={handleExport}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download size={12} />
            Export CSV
          </button>

          <button
            onClick={() => {
              setResetError(null);
              setResetConfirmText("");
              setShowResetModal(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/30 px-3 text-xs text-red-400 hover:bg-red-400/10"
          >
            <Trash2 size={12} />
            Reset
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card/70">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {leads.length} clinics
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Dental only
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left text-xs">
            <thead className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
              <tr>
                <Th>Clinic</Th>
                <Th>Address</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Website</Th>
                <Th>Instagram</Th>
                <Th>TikTok</Th>
                <Th>Good social</Th>
                <Th>Founded</Th>
                <Th>Franchise</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <ClinicRow
                  key={lead.id}
                  lead={lead}
                  onOpen={() => setActiveLead(lead)}
                  onStatusChange={(status) => patchLead(lead.id, { status })}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    No clinics match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeLead && (
        <LeadDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onUpdate={(id, patch) => {
            setLeads((prev) =>
              prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
            );
          }}
          onDelete={(id) => setLeads((prev) => prev.filter((lead) => lead.id !== id))}
        />
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <Trash2 size={20} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <h3 className="text-sm font-semibold">Reset dental CRM?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  This deletes {leads.length} dental clinic lead{leads.length === 1 ? "" : "s"}.
                  Type <code className="text-[11px] text-foreground">{product.slug}</code> to confirm.
                </p>
              </div>
            </div>

            <input
              value={resetConfirmText}
              onChange={(event) => setResetConfirmText(event.target.value)}
              disabled={resetting}
              className="mb-3 h-9 w-full rounded-md border border-border bg-background px-3 text-xs font-mono"
              placeholder={product.slug}
            />

            {resetError && <p className="mb-3 text-xs text-red-400">{resetError}</p>}

            <div className="flex gap-2">
              <button
                onClick={confirmReset}
                disabled={resetConfirmText.trim() !== product.slug || resetting}
                className="flex-1 rounded-md border border-red-500/40 bg-red-500/20 py-2 text-xs font-medium text-red-400 disabled:opacity-40"
              >
                {resetting ? "Deleting..." : "Delete leads"}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicRow({
  lead,
  onOpen,
  onStatusChange,
}: {
  lead: Lead;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}) {
  const enrichment = getEnrichment(lead);
  const emails = getEmails(lead);
  const instagram = asStringArray(enrichment.instagram);
  const tiktok = asStringArray(enrichment.tiktok);
  const address = asString(enrichment.address);
  const phone = asString(enrichment.phone);
  const website = asString(enrichment.website);
  const quality = getSocialQuality(lead);

  return (
    <tr className="border-b border-border/60 hover:bg-muted/20">
      <Td>
        <button onClick={onOpen} className="max-w-64 text-left font-semibold text-primary hover:underline">
          {lead.name}
        </button>
        <div className="mt-1 text-[10px] text-muted-foreground">{lead.city}, {lead.state}</div>
      </Td>
      <Td>
        <div className="flex max-w-72 items-start gap-1.5 text-muted-foreground">
          <MapPin size={11} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{address || "Unknown"}</span>
        </div>
      </Td>
      <Td>
        {phone ? (
          <a className="inline-flex items-center gap-1 hover:text-primary" href={`tel:${phone}`}>
            <Phone size={11} />
            {phone}
          </a>
        ) : (
          <Muted>None</Muted>
        )}
      </Td>
      <Td>
        {emails.length > 0 ? (
          <a className="inline-flex max-w-52 items-center gap-1 truncate hover:text-primary" href={`mailto:${emails[0]}`}>
            <Mail size={11} />
            {emails[0]}
          </a>
        ) : (
          <Muted>None found</Muted>
        )}
      </Td>
      <Td>
        {website ? (
          <ExternalAnchor href={website} label={trimUrl(website)} />
        ) : (
          <Muted>None</Muted>
        )}
      </Td>
      <Td>
        {instagram.length > 0 ? <ExternalAnchor href={instagram[0]} label="Instagram" /> : <Muted>No</Muted>}
      </Td>
      <Td>
        {tiktok.length > 0 ? <ExternalAnchor href={tiktok[0]} label="TikTok" /> : <Muted>No</Muted>}
      </Td>
      <Td>
        <SocialBadge quality={quality} maxViews={asNumber(enrichment.maxVideoViews)} />
      </Td>
      <Td>{asString(enrichment.foundingDate) || <Muted>Unknown</Muted>}</Td>
      <Td>
        {enrichment.isFranchise === true ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
            <ShieldQuestion size={10} />
            Yes
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            No
          </span>
        )}
      </Td>
      <Td>
        <select
          value={lead.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-[11px]"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Td>
    </tr>
  );
}

function SocialBadge({
  quality,
  maxViews,
}: {
  quality: SocialFilter;
  maxViews: number | null;
}) {
  if (quality === "good") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
        <Video size={10} />
        Yes {maxViews ? `(${formatViews(maxViews)})` : ""}
      </span>
    );
  }
  if (quality === "not-good") {
    return (
      <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] text-zinc-400">
        No {maxViews ? `(${formatViews(maxViews)})` : ""}
      </span>
    );
  }
  if (quality === "none") {
    return (
      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
        No social
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
      Unknown
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
        <Filter size={11} />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-xs"
      >
        {children}
      </select>
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="align-top px-3 py-3">{children}</td>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function ExternalAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex max-w-48 items-center gap-1 truncate text-primary hover:underline"
    >
      {label}
      <ExternalLink size={10} className="shrink-0" />
    </a>
  );
}

function getEnrichment(lead: Lead): Record<string, unknown> {
  return lead.enrichmentJson ?? {};
}

function getEmails(lead: Lead): string[] {
  const enrichment = getEnrichment(lead);
  const emails = asStringArray(enrichment.emails);
  if (lead.email && !emails.includes(lead.email)) emails.unshift(lead.email);
  return emails;
}

function getSocialLinks(lead: Lead): string[] {
  const enrichment = getEnrichment(lead);
  return [
    ...asStringArray(enrichment.socialLinks),
    ...asStringArray(enrichment.instagram),
    ...asStringArray(enrichment.tiktok),
  ];
}

function getSocialQuality(lead: Lead): SocialFilter {
  const enrichment = getEnrichment(lead);
  const hasSocial =
    enrichment.hasSocialMedia === true ||
    getSocialLinks(lead).length > 0 ||
    asStringArray(enrichment.instagram).length > 0 ||
    asStringArray(enrichment.tiktok).length > 0;

  if (!hasSocial) return "none";
  if (enrichment.goodSocialMedia === true) return "good";
  if (enrichment.goodSocialMedia === false) return "not-good";
  return "unknown";
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

function trimUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatViews(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

import { FileText } from "lucide-react";

export default function ContentPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Content</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Content pipeline and publishing workflow. Coming soon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Content module launching soon.</p>
      </div>
    </div>
  );
}

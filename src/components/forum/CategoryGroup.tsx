import { BoardRow, type BoardRowData } from "./BoardRow";

export type CategoryGroupData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  boards: BoardRowData[];
};

export function CategoryGroup({ category }: { category: CategoryGroupData }) {
  const accent = category.color ?? undefined;
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: accent ?? "hsl(var(--primary))" }} />
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/20">
        <div className="min-w-0">
          <h2 className="font-semibold text-lg leading-tight" style={accent ? { color: accent } : undefined}>
            {category.name}
          </h2>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground shrink-0">{category.boards.length} לוחות</div>
      </header>
      <div className="divide-y divide-border">
        {category.boards.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">אין לוחות בקטגוריה זו עדיין.</div>
        ) : (
          category.boards.map((b) => <BoardRow key={b.id} board={b} accentColor={accent} />)
        )}
      </div>
    </section>
  );
}

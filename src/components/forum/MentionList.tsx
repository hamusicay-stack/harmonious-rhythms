import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface MentionItem {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Props {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<MentionListRef, Props>(({ items, command }, ref) => {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);

  const selectItem = (i: number) => {
    const it = items[i];
    if (!it) return;
    command({ id: it.id, label: it.username ?? it.display_name ?? "" });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setIndex((i) => (i + items.length - 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        selectItem(index);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
        אין תוצאות
      </div>
    );
  }

  return (
    <div className="max-h-64 w-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-xl">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={() => selectItem(i)}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-end text-sm transition ${
            i === index ? "bg-primary/15 text-foreground" : "text-foreground/80 hover:bg-muted"
          }`}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={it.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {(it.display_name ?? it.username ?? "?").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate">
            <span className="font-medium">{it.display_name ?? it.username}</span>
            {it.username && (
              <span className="ms-1 text-xs text-muted-foreground">@{it.username}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
});
MentionList.displayName = "MentionList";

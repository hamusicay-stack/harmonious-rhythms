import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { supabase } from "@/integrations/supabase/client";
import { MentionList, type MentionItem, type MentionListRef } from "./MentionList";

async function fetchMentionItems(query: string): Promise<MentionItem[]> {
  const q = query.trim();
  let req = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .not("username", "is", null)
    .limit(8);
  if (q) {
    req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  } else {
    req = req.order("display_name", { ascending: true });
  }
  const { data } = await req;
  return ((data ?? []) as MentionItem[]).filter((p) => !!p.username);
}

export const mentionSuggestion = {
  char: "@",
  allowSpaces: false,
  items: async ({ query }: { query: string }) => fetchMentionItems(query),

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] = [];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor });
        if (!props.clientRect) return;
        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          theme: "lovable-mention",
          arrow: false,
          offset: [0, 6],
        });
      },
      onUpdate: (props: any) => {
        component?.updateProps(props);
        if (!props.clientRect) return;
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
      },
      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          popup[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup[0]?.destroy();
        component?.destroy();
      },
    };
  },
};

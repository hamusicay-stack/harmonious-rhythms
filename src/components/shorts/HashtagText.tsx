import { Fragment } from "react";

type Props = { text: string; className?: string };

const TAG_RE = /(#[\u0590-\u05FF\w_]+)/g;

export function HashtagText({ text, className }: Props) {
  if (!text) return null;
  const parts = text.split(TAG_RE);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        TAG_RE.test(p) ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // future: navigate to tag feed
            }}
            className="font-semibold text-primary-glow hover:text-primary transition-colors"
          >
            {p}
          </button>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </span>
  );
}

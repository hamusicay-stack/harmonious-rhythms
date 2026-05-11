import type { CSSProperties } from "react";
import { ArrowUp, Copy, FileText, FolderOpen, MenuSquare, Music2, Save, Scissors, Trash2, ClipboardPaste } from "lucide-react";
import type { OrganTheme } from "@/lib/organTheme";
import "@/styles/yamaha-organ.css";

const ICONS: Record<string, any> = {
  FileText, Scissors, Copy, ClipboardPaste, Trash2, Save, FolderOpen, MenuSquare,
};

/** Pure visual preview of an organ screen using a given theme. No data fetching. */
export function OrganScreenPreview({ theme, sampleItems = ["MIZRACHI POP", "WEDDING DANCE", "CLASSIC SLOW"] }: { theme: OrganTheme; sampleItems?: string[] }) {
  const cssVars: CSSProperties = {
    // expose theme via CSS variables for nested rules
    ["--ot-top-bg" as any]: theme.topBanner.bg,
    ["--ot-top-text" as any]: theme.topBanner.textColor,
    ["--ot-tabs-bg" as any]: theme.tabsBar.bg,
    ["--ot-tabs-active-bg" as any]: theme.tabsBar.activeBg,
    ["--ot-tabs-text" as any]: theme.tabsBar.textColor,
    ["--ot-tabs-active-text" as any]: theme.tabsBar.activeTextColor,
    ["--ot-lcd-bg" as any]: theme.lcd.bg,
    ["--ot-lcd-text" as any]: theme.lcd.textColor,
    ["--ot-card-bg" as any]: theme.lcd.cardBg,
    ["--ot-card-text" as any]: theme.lcd.cardTextColor,
    ["--ot-accent" as any]: theme.lcd.accentColor,
    ["--ot-bot-bg" as any]: theme.bottomBanner.bg,
    ["--ot-bot-text" as any]: theme.bottomBanner.textColor,
    ["--ot-pbtn-bg" as any]: theme.bottomBanner.pButton.bg,
    ["--ot-pbtn-active" as any]: theme.bottomBanner.pButton.activeColor,
    ["--ot-up-bg" as any]: theme.bottomBanner.upButton.bg,
    ["--ot-up-text" as any]: theme.bottomBanner.upButton.textColor,
    ["--ot-tool-bg" as any]: theme.toolbar.bg,
    ["--ot-tool-item-bg" as any]: theme.toolbar.itemBg,
    ["--ot-tool-text" as any]: theme.toolbar.textColor,
    ["--ot-chassis-bg" as any]: theme.chassis.bg,
    ["--ot-chassis-radius" as any]: `${theme.chassis.borderRadius}px`,
    ["--ot-top-img" as any]: theme.topBanner.bgImage ? `url("${theme.topBanner.bgImage}")` : "none",
    ["--ot-lcd-img" as any]: theme.lcd.bgImage ? `url("${theme.lcd.bgImage}")` : "none",
    ["--ot-bot-img" as any]: theme.bottomBanner.bgImage ? `url("${theme.bottomBanner.bgImage}")` : "none",
    ["--ot-btn-bg" as any]: theme.buttons.bg,
    ["--ot-btn-text" as any]: theme.buttons.textColor,
    ["--ot-led-blue" as any]: theme.buttons.ledBlue,
    ["--ot-led-green" as any]: theme.buttons.ledGreen,
    ["--ot-led-amber" as any]: theme.buttons.ledAmber,
    ["--ot-led-red" as any]: theme.buttons.ledRed,
  };

  const groupedButtons = {
    INTRO: theme.buttons.list.filter((b) => b.group === "INTRO"),
    MAIN: theme.buttons.list.filter((b) => b.group === "MAIN"),
    FILL: theme.buttons.list.filter((b) => b.group === "FILL"),
    ENDING: theme.buttons.list.filter((b) => b.group === "ENDING"),
    EXTRA: theme.buttons.list.filter((b) => b.group === "EXTRA"),
  };

  return (
    <div className="ot-preview yo-root" style={cssVars} dir="ltr">
      {/* LCD bezel + screen */}
      <div className="ot-bezel">
        <div className="ot-screen">
          {/* Top banner */}
          <div className="ot-top" style={{ minHeight: theme.topBanner.height }}>
            {theme.topBanner.showLogo && (
              <span className="ot-yamaha">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 7 L12 13 L16 7 M12 13 L12 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <b>{theme.brandText}</b>
              </span>
            )}
            <span className="ot-screen-label">{theme.screenLabel}</span>
          </div>

          {/* Tabs */}
          <div className="ot-tabs">
            {theme.tabs.map((t, i) => (
              <span key={i} className="ot-tab" data-active={i === 0 ? "true" : undefined}>{t.label}</span>
            ))}
          </div>

          {/* LCD body with sample cards */}
          <div className="ot-lcd-body">
            {sampleItems.map((label, i) => (
              <div key={i} className="ot-card">
                <div className="ot-thumb"><Music2 size={18} /></div>
                <span className="ot-name">{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom banner */}
          <div className="ot-bottom">
            <div style={{ display: "flex", gap: 6 }}>
              <span className="ot-pbtn" data-active="true">P1</span>
              <span className="ot-pbtn">P2</span>
            </div>
            {theme.bottomBanner.upButton.show && (
              <button type="button" className="ot-up">
                <span style={{ letterSpacing: "0.1em", fontWeight: 700 }}>UP</span>
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {theme.toolbar.show && (
          <div className="ot-toolbar">
            {theme.toolbar.items.map((it) => {
              const Icon = ICONS[it.icon ?? "FileText"] ?? FileText;
              return (
                <div key={it.id} className="ot-tool">
                  <Icon size={16} />
                  <span>{it.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hardware panel */}
      <div className="ot-hw">
        {theme.chassis.showScrews && (
          <div className="ot-screws">
            <span /><span /><span /><span />
          </div>
        )}
        <div className="ot-hw-rows">
          {(["INTRO", "MAIN", "FILL", "ENDING", "EXTRA"] as const).map((g) => {
            const list = groupedButtons[g];
            if (!list.length) return null;
            return (
              <div key={g} className="ot-hw-group">
                <div className="ot-hw-row">
                  {list.map((b) => (
                    <button key={b.id} type="button" className="ot-hwbtn" data-led={b.led}>
                      <span className="ot-led" />
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="ot-hw-label">{g}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

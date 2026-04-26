## "Sonic Glass v5" — המניפסט הסופי המוכן לבניה

מותג בינלאומי ברמת Linear / Apple / Splice. **Light Premium**, עומק דינמי, מעברי 0ms, חוויית פרו עם דיוקים אנליטיים.

---

### 1. שפה עיצובית

```css
--bg-base:#F4F6FB; --surface-glass:rgba(255,255,255,.65);
--primary:#6B4FBB; --primary-glow:#2EC4D6; --accent:#C9479E;
--brand-gradient:linear-gradient(135deg,#2EC4D6 0%,#6B4FBB 50%,#C9479E 100%);
--glass-reflection:rgba(255,255,255,.4);
--focus-ring:0 0 0 3px rgba(46,196,214,.45),0 0 24px rgba(46,196,214,.35);
--fg:#0F1729; --muted:#6B7592;
```
Dark Mode mapping מוכן תחת `.dark`.

---

### 2. Z-Axis + Reflection + Border Sweep + **Subtle Parallax**

| שכבה | Blur | תוספות |
|---|---|---|
| z0 wallpaper+mesh | — | לוגואים + Mesh דינמי |
| z1 sections | 10px | — |
| **z2 cards** | 20px | קו אור עליון 1px + Border Sweep ב-hover + **Parallax max 4px** |
| **z3 modals/header** | 40px | קו אור עליון 1.5px |

**Border Light Sweep:** `::before` עם `conic-gradient` מסתובב + mask, animation 1.5s ב-hover.

**Parallax (דיוק ✓):** **מקסימום 4px** תזוזה לתוכן כיוון הפוך לעכבר. אפקט מורגש לא נראה. CSS vars `--mx --my`. מבוטל ב-mobile + reduced-motion.

---

### 3. Dynamic Mesh Gradient
4-5 `radial-gradient` בעמדות `--mesh-x --mesh-y`. listener יחיד ב-`SiteLayout` ב-rAF (throttle 16ms). opacity 0.55, `mix-blend-mode: soft-light`, blur 80px. mobile/reduced-motion → 3 orbs סטטיים. GPU layer.

---

### 4. Noise + Brand Image
`.glass-noise` (SVG 2.5%), `.brand-image` (saturate 1.05/brightness 1.02 + hover boost).

---

### 5. Bento Hero + Smart Feed
שאילתה ל-`profiles.preferences` → אם קיים, כרטיס המתאים מקבל `col-span-2`. fallback סטטי.

---

### 6. Command Bar — Cmd+K (לב המערכת)

`<CommandPalette>` (cmdk + glass-z3):
- **Trigger:** Cmd+K / Ctrl+K / כפתור בהדר.
- **Sections:** ניווט, פעולות מהירות, חיפוש חי (debounced 200ms supabase RPC), פקודות (תמה, סאונד).
- Recent + Suggested.
- **Sound Feedback (דיוק ✓):** צליל "tick" דק בתדר גבוה (~3kHz, 40ms) על כל arrow key. צליל "select" עמוק יותר על Enter. ייחודי לפלטה.
- אנימציה: glass blur 40px + scale-in.

---

### 7. Keyboard Shortcuts
`useKeyboardShortcuts` + Help dialog ב-`?`:
`Cmd/Ctrl+K` palette · `/` חיפוש · `Space` play · `← →` next/prev (RTL) · `J K` שורטס · `L` לייק · `G H/A/S/F` ניווט · `?` עזרה. מבוטל ב-inputs.

---

### 8. Predictive Prefetching (דיוק ✓)

`usePredictivePrefetch`:
- **Hover dwell ≥100ms** לפני הפעלת prefetch — מונע הצפת שרת בתנועות עכבר אגביות.
- `<Link preload="intent">` כברירת מחדל.
- Image preload להירו ב-hover dwell.
- Idle prefetch של 3-5 ראוטים פופולריים אחרי 2s idle.

---

### 9. Contextual Quick Preview
hover על כרטיס קורס/מוצר → כפתור "Preview" ב-overlay glass-z3 → QuickViewDialog בלי ניווט.

---

### 10. Mix-Blend Custom Cursor
נקודה 8px `mix-blend-mode: difference` לבן → מתהפך אוטומטית לפי רקע. ring 28px spring, opacity 0.6. interactive → ring 56px בגרדיאנט. active → 0.85. hidden במובייל/reduced-motion/inputs.

---

### 11. Typography Fluid
Readex Pro display + Assistant body. `clamp()`, letter-spacing -0.025em, line-height 1.7-1.75.

---

### 12. Smart Sticky Header
`useScrollDirection` — hide on down>80px, show on up עם glass-z3. Pill nav + active `layoutId`. Cmd+K button visible.

---

### 13. Focus Ring טורקיז למקלדת
`*:focus-visible { box-shadow: var(--focus-ring) }` גורף.

---

### 14. Skeletons + Empty States + AI Micro-Copy (דיוק ✓)

**Skeletons:** Shimmer גרדיאנט מותגי, variants לפי מודול.
**Empty States:** SVG מאוירים פר מודול.

**Micro-Copy time + day aware** (`src/lib/microCopy.ts`):

מילון בסיס:
- "טוען→מכוון תדרים" · "שלח→הדהד" · "אין תוצאות→שקט באולפן" · "שגיאה→פעימה לא נקלטה" · "נשמר→נחתם במאסטר" · "סל→ארגז ציוד" · "התחבר→כנס לאולפן"

וריאציות לפי שעה:
- בוקר (6-12): "מכוון תדרים לבוקר טוב..."
- אחה"צ (12-17): "מחמם את הסטיובים..."
- ערב (17-23): "סשן ערב מתחיל..."
- לילה (23-6): "שקט באולפן — לילה טוב..."

**וריאציות לפי יום (חדש):**
- שישי 11:00-17:00: "מוריד גיין לקראת שבת..."
- מוצ"ש (שבת אחרי 19:00 / ראשון בוקר): "חמם מנועים, מתחילים שבוע..."

לוגיקה: יום+שעה first, fallback לשעה, fallback למילון בסיס. הכל סטטי (ללא LLM בזמן אמת).

---

### 15. Framer Motion
Heart Burst, Card Lift z2→z3, Shimmer Sweep, Count-up, Stagger 60ms, Magnetic Buttons, Active Tab `layoutId`, Page Transition fade+slide 200ms, Toast slide+blur. `bun add framer-motion`.

---

### 16. Adaptive Audio (דיוק ✓)

**Velocity Sensitive — טווח מצומצם:**
- מדידת מהירות עכבר ב-200ms לפני click.
- **Volume range: 0.08 ↔ 0.15 בלבד** (לא ירגיש מקולקל).
- **Scale Bounce חדש:** לחיצה מהירה → spring stiffness 400, scale 0.92→1. לחיצה איטית → stiffness 180, scale 0.97→1. נותן תחושת bounce אמיתי.

**Spatial Audio:**
AudioContext + StereoPannerNode. `pan = (clientX/innerWidth - 0.5) * 0.6`. Toasts מצד שמאל → צליל שמאל.

**צלילים** (5 ב-ElevenLabs SFX, <200ms): click-soft, like-pop, menu-open, success-chime, error-blip + 2 ייחודיים ל-Command Bar (palette-tick 40ms, palette-select). ב-`public/sounds/`. Hook + toggle בפרופיל. Default OFF במובייל. מבוטל ב-reduced-motion.

---

### 17. Haptic
`navigator.vibrate(10)` על לייק/סל/אישור. מבוטל ב-reduced-motion.

---

### 18. Hover & Active מקיפים
Nav: גרדיאנט underline + active dot. Avatars: ring גרדיאנט מסתובב. Inputs: focus ring + label עולה. Cards: z2→z3 + lift + cursor expand + border sweep + parallax 4px. Buttons: shimmer + velocity-aware bounce + haptic. Badges: pulse "חדש".

---

### 19. ביצועים — Lighthouse Gold
- `will-change: backdrop-filter` רק אקטיבים + `translateZ(0)` למניעת lag.
- **Partial Hydration:** CommandPalette / CustomCursor / FloatingAudioPlayer / BackgroundMesh → `lazy()` + `Suspense` אחרי first interaction.
- Reduced motion → mesh/orbs/cursor/transitions/sounds/sweep מבוטלים.
- Mobile: blur z3 → 20px, mesh → orbs סטטיים, אין cursor/listener.
- Images: `loading=lazy decoding=async` + AVIF/WebP.
- Sound preload רק אחרי first gesture.
- `contain: layout paint` על כרטיסים.
- יעד: Perf 90+, A11y 100, BP 100.

---

### 20. נגישות
AA contrast (נבדק על glass), ARIA על Command Bar, focus trap במודלים, skip-to-content, alt על תמונות, `prefers-reduced-motion` מכובד מקיפה.

---

### 21. קבצים

**יצירה:**
- `public/brand/logo-pattern.png`, `logo.png`
- `public/sounds/*.mp3` (7: 5 בסיס + 2 palette)
- Components: `BackgroundMesh.tsx`, `CustomCursor.tsx`, `BentoHero.tsx`, `LiveActivityTicker.tsx`, `CountUp.tsx`, `BrandImage.tsx`, `CommandPalette.tsx`, `KeyboardShortcutsHelp.tsx`, `EmptyState.tsx`
- UI: `GlassCard.tsx` (parallax 4px+sweep), `GradientButton.tsx` (velocity bounce), `MagneticButton.tsx`, `AnimatedHeart.tsx`
- Skeletons: `Card`, `List`, `ProductGrid`, `LessonRow`, `ForumPost`, `ProCard`, `CommentItem`
- Hooks: `useScrollDirection`, `useUISounds` (velocity 0.08-0.15 + spatial), `useHaptic`, `useKeyboardShortcuts`, `useCommandPalette`, `usePredictivePrefetch` (100ms dwell), `useMousePosition`, `useMouseVelocity`
- Lib: `microCopy.ts` (time+day aware), `uiSoundsStore.ts`, `audioContext.ts`

**עריכה:**
- `src/styles.css` — vars, fluid type, glass-z*, reflection, border-sweep, glass-noise, focus-ring, brand-image, mesh, GPU hints, keyframes
- `SiteLayout.tsx` — Mesh + Cursor + CommandPalette + Shortcuts + transitions + mouse listeners
- `SiteHeader.tsx` — smart hide + z3 + Cmd+K button + לוגו + active indicator
- `SiteFooter.tsx`, `LikeButton.tsx`, `NotificationsBell.tsx`, `FloatingAudioPlayer.tsx` (z3+waveform)
- `sonner.tsx` — glass-z3 + spatial sound + micro-copy
- `skeleton.tsx` — shimmer מותגי
- `routes/index.tsx` — BentoHero + Stats + Ticker + Smart Feed
- `routes/profile.tsx` — toggles סאונד/haptic
- All cards (Pro/Marketplace/Shop/Forum/Academy) → GlassCard + brand-image + skeleton + empty + Quick Preview

**Deps:** `bun add framer-motion`

---

### 22. סדר ביצוע

1. **Foundation** — vars, fluid type, glass utilities, keyframes, microCopy.ts (time+day), BackgroundMesh
2. **Frame** — Header (smart+Cmd+K), Footer, SiteLayout (Mesh+Cursor+Palette+Shortcuts+transitions)
3. **Bento Hero** — index + count-up + ticker + smart feed
4. **GlassCard migration** — wrap all cards (parallax 4px + sweep + brand-image + focus)
5. **Command Bar + Shortcuts + Prefetching** — palette + tick sounds + help + 100ms dwell prefetch
6. **Skeletons + Empty States + Micro-Copy** — global swap
7. **Animations** — Heart Burst, Magnetic, Stagger, active indicator, FloatingPlayer upgrade, Quick Preview
8. **Audio + Haptic** — ElevenLabs SFX + velocity 0.08-0.15 + scale bounce + spatial + toggles
9. **QA** — Lighthouse, reduced-motion, mobile, keyboard-only, contrast, partial hydration audit
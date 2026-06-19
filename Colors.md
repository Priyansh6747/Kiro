# Kiro — Color System
*Design tokens v2*

---

## What changed in v2

Paper, Indigo, and Sage previously shared the same bone structure — same violet accent, same gray-scale typography ramp, same neutral surfaces with a different hue dropped in. They read as one theme recolored four times. Midnight is untouched. The other three now have distinct material identities:

- **Paper** — rebuilt around true warm parchment and clay ink, no violet. Meant to feel like a worn notebook, not an app skin.
- **Sage** — rebuilt around moss, bark, and lichen. Earthy and slightly imperfect, not "green Material Design."
- **Nebula** — built as a clean, vibrant violet light mode: crisp white and soft gray backgrounds with a powerful, pure violet accent.

---

## Reference

| Mode | Material reference |
|---|---|
| Midnight | Resonare (DJ marketplace) — deep navy, teal accent, terminal-adjacent contrast |
| Paper | Worn paperback, tea-stained notebook paper, soft indoor lamp light |
| Sage | Moss on stone, dried botanicals, unbleached linen, forest floor |
| Nebula | Vital app inspiration, clean soft gray backgrounds with vibrant violet headers |

---

## Midnight Mode (Dark) — unchanged

Derived from Resonare's deep navy (`#0B0F10`, `#121620`), teal accent (`#00FFC2`), and smoke white text (`#F2F2F2`). Focused, high-contrast, terminal-adjacent without being literal.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0B0F18` | Page background — deepest navy, close to Resonare's midnight |
| `bg-surface` | `#111827` | Cards, panels — one step up |
| `bg-surface-raised` | `#1E293B` | Nested cards, sidebars, dropdowns |
| `bg-accent-subtle` | `#0A2E24` | Teal accent fills — tags, selected states |
| `bg-done-subtle` | `#0A2E24` | Completed task backgrounds |
| `bg-missed-subtle` | `#2E1810` | Missed task backgrounds |
| `bg-warning-subtle` | `#2A1E08` | Overload warning backgrounds |

### Accent (Primary Action)

Teal — Resonare's `#00FFC2` pulled back to `#4DD9AC` to avoid neon harshness while retaining clarity signal.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#4DD9AC` | Primary buttons, active nav, links |
| `accent-hover` | `#3DC49A` | Hover state |
| `accent-pressed` | `#2EAF88` | Pressed / active state |
| `accent-subtle` | `#0A2E24` | Accent background fills |
| `accent-border` | `#1D6B50` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#E8F0F7` | Headings, body — Resonare's smoke white, slightly cool |
| `text-secondary` | `#94A3B8` | Labels, hints, meta |
| `text-tertiary` | `#4B5563` | Placeholder, disabled |
| `text-accent` | `#4DD9AC` | Links, interactive labels |
| `text-done` | `#4DD9AC` | Completed task titles |
| `text-missed` | `#F0997B` | Missed task titles — lightened coral for dark bg |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#1A2744` | Default card edges — barely visible |
| `border-default` | `#1E3A52` | Input borders, section dividers |
| `border-strong` | `#2D5270` | Focused inputs, emphasized containers |
| `border-accent` | `#1D6B50` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#4DD9AC` | Teal | Completed tasks, progress |
| `done-text` | `#9FE1CB` | Light teal | Text on done backgrounds |
| `missed` | `#F0997B` | Light coral | Missed / overdue — not too aggressive on dark |
| `missed-text` | `#F5C4B3` | Pale coral | Text on missed backgrounds |
| `warning` | `#EF9F27` | Amber | Overload, deadline risk |
| `warning-text` | `#FAC775` | Light amber | Text on warning backgrounds |
| `critical` | `#4DD9AC` | Teal | Critical project type badge |

---

## Paper Mode (Light) — rebuilt

**Mood:** the most relaxed surface in the system. No violet, no saturated UI-blue. Base is genuinely warm parchment, ink is soft clay-brown rather than navy, and the accent is a muted terracotta — the color of a wax seal, not a startup logo. Built to be looked at for hours without strain.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F6EFE4` | Page background — warm parchment, never cool or pure white |
| `bg-surface` | `#FFFCF6` | Cards, modals, panels — barely-there lift off base |
| `bg-surface-raised` | `#FBF4E8` | Nested cards, sidebars — mid-level surface |
| `bg-accent-subtle` | `#F3E4D7` | Terracotta accent fills — tags, selected states |
| `bg-done-subtle` | `#E9F0E1` | Completed task backgrounds |
| `bg-missed-subtle` | `#F6E2D9` | Missed task backgrounds |
| `bg-warning-subtle` | `#FBEDD2` | Overload warning backgrounds |

### Accent (Primary Action)

Terracotta clay — calm and grounded, the warmest possible accent that still reads as "action," not decorative.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#B0623E` | Primary buttons, active nav, links |
| `accent-hover` | `#9A5234` | Hover state |
| `accent-pressed` | `#80442A` | Pressed / active state |
| `accent-subtle` | `#F3E4D7` | Accent background fills |
| `accent-border` | `#D9B79E` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#3A2E22` | Headings, body — soft espresso-brown, never black |
| `text-secondary` | `#7A6B58` | Labels, hints, meta — warm taupe |
| `text-tertiary` | `#B3A48F` | Placeholder, disabled |
| `text-accent` | `#B0623E` | Links, interactive labels |
| `text-done` | `#4F7A4A` | Completed task titles |
| `text-missed` | `#A8482C` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#EBE0D0` | Default card edges, dividers |
| `border-default` | `#DDCCB4` | Input borders, section dividers |
| `border-strong` | `#C2AC8A` | Focused inputs, emphasized containers |
| `border-accent` | `#D9B79E` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#4F7A4A` | Moss green | Completed tasks, progress |
| `done-text` | `#27401F` | Dark moss | Text on done backgrounds |
| `missed` | `#A8482C` | Burnt clay | Missed / overdue tasks |
| `missed-text` | `#6B2C18` | Dark clay | Text on missed backgrounds |
| `warning` | `#A57A1E` | Ochre | Overload, deadline risk |
| `warning-text` | `#5C4310` | Dark ochre | Text on warning backgrounds |
| `critical` | `#B0623E` | Terracotta | Critical project type badge |

---

## Sage Mode (Organic Light) — rebuilt

**Mood:** a forest floor, not a "green theme." Base is unbleached linen with a faint moss cast, the accent is the color of a fresh stem rather than a flat success-green, and a deep bark brown does the heavy lifting typography would otherwise give to gray. Slightly more saturated and textured than Paper — Paper is calm stillness, Sage is calm *aliveness*.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F0F1E6` | Page background — unbleached linen with a green cast |
| `bg-surface` | `#FBFCF6` | Cards, panels — fresh leaf-white |
| `bg-surface-raised` | `#F3F4E9` | Nested cards, dropdowns |
| `bg-accent-subtle` | `#DFE9D3` | Stem-green accent fills |
| `bg-done-subtle` | `#DCEBD6` | Completed task backgrounds |
| `bg-missed-subtle` | `#F2DED2` | Missed task backgrounds |
| `bg-warning-subtle` | `#F5E9C9` | Overload warning backgrounds |

### Accent (Primary Action)

Fresh stem green — more saturated than a typical "sage," closer to new growth than dried herb.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#5B8C3E` | Primary buttons, active nav, links |
| `accent-hover` | `#4C7733` | Hover state |
| `accent-pressed` | `#3D6128` | Pressed / active state |
| `accent-subtle` | `#DFE9D3` | Accent background fills |
| `accent-border` | `#A8C68C` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#283420` | Headings, body — bark brown-green, not olive-gray |
| `text-secondary` | `#5F6E4F` | Labels, hints, meta — mossy gray-green |
| `text-tertiary` | `#9DA98A` | Placeholder, disabled |
| `text-accent` | `#5B8C3E` | Links, interactive labels |
| `text-done` | `#3D6128` | Completed task titles |
| `text-missed` | `#9C4A2E` | Missed task titles — clay-rust, not red |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#E2E4D2` | Default card edges |
| `border-default` | `#CDD2B5` | Input borders, section dividers |
| `border-strong` | `#A8AF8C` | Focused inputs, emphasized containers |
| `border-accent` | `#A8C68C` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#5B8C3E` | Stem green | Completed tasks |
| `done-text` | `#243816` | Dark green | Text on done |
| `missed` | `#9C4A2E` | Clay rust | Missed |
| `missed-text` | `#4F2415` | Dark rust | Text on missed |
| `warning` | `#9C7A1E` | Dried-grass gold | Warning |
| `warning-text` | `#4F3D0E` | Dark gold | Text on warning |
| `critical` | `#5B8C3E` | Stem green | Critical |

---

## Nebula Mode (Soft Lilac Light)

**Mood:** comforting, hopeful, caring. This is not the energetic mode — that job belongs elsewhere. Nebula is the one that should feel like a hand on your shoulder: soft lilac-blush base instead of clinical cool-gray, a dusty muted violet accent instead of a saturated "pop" purple, and warm rather than cool undertones throughout. The previous version (`#9B4DFA`, cool `#F5F6F8` gray base) read as energetic fintech-app violet — vibrant and confident, but not comforting. Comfort comes from lower saturation, lighter value, and warmth, not from intensity. Even the missed-state color was softened from an alarming rose-red to a gentle clay-rose, so the app feels caring even when delivering bad news.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#FAF7FB` | Page background — soft lilac-blush, warm not cool |
| `bg-surface` | `#FFFFFF` | Cards, panels — pure white, the one crisp surface in the mode |
| `bg-surface-raised` | `#FDFAFD` | Nested cards, dropdowns — barely lifted, soft |
| `bg-accent-subtle` | `#EEE3F4` | Lilac accent fills — tags, selected states |
| `bg-done-subtle` | `#E6F1E8` | Completed task backgrounds (soft sage-mint) |
| `bg-missed-subtle` | `#F8EAE5` | Missed task backgrounds (warm dusty rose, not alarming) |
| `bg-warning-subtle` | `#FBF1E2` | Overload warning backgrounds (soft honey) |

### Accent (Primary Action)

Dusty muted violet — soft and held-back rather than saturated. Reads as gentle reassurance, not energy.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#9579C2` | Primary buttons, active nav, links |
| `accent-hover` | `#8468AE` | Hover state |
| `accent-pressed` | `#705590` | Pressed / active state |
| `accent-subtle` | `#EEE3F4` | Accent background fills |
| `accent-border` | `#D6C3E4` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#352E40` | Headings, body — warm deep plum, never charcoal-black |
| `text-secondary` | `#827697` | Labels, hints, meta — soft dusty mauve |
| `text-tertiary` | `#B8ACC4` | Placeholder, disabled |
| `text-accent` | `#8468AE` | Links, interactive labels |
| `text-done` | `#3D6B4A` | Completed task titles |
| `text-missed` | `#B0705C` | Missed task titles — warm clay, not red. Reads as gentle, not alarming |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#F0E8F2` | Default card edges, dividers |
| `border-default` | `#E5D9EA` | Input borders, section dividers |
| `border-strong` | `#CDB9D8` | Focused inputs, emphasized containers |
| `border-accent` | `#D6C3E4` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#5E9470` | Soft sage | Completed tasks — gentle, not clinical emerald |
| `done-text` | `#2E4F38` | Dark sage | Text on done backgrounds |
| `missed` | `#C58267` | Warm clay-rose | Missed / overdue — soft, never alarm-red |
| `missed-text` | `#7A4530` | Dark clay | Text on missed backgrounds |
| `warning` | `#C99A45` | Soft honey | Overload, deadline risk |
| `warning-text` | `#6B4D1E` | Dark honey | Text on warning backgrounds |
| `critical` | `#9579C2` | Dusty violet | Critical project type badge |

### Surface gloss (Nebula-only token)

| Token | Value | Usage |
|---|---|---|
| `surface-sheen` | `none` | Not used — comfort comes from softness and warmth, not gloss or shine. |

---

## Shared Tokens (Mode-Invariant)

These never change between modes.

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | `4px` | Inputs, small chips |
| `radius-sm` | `8px` | Buttons, badges |
| `radius-md` | `12px` | Cards, panels |
| `radius-pill` | `99px` | Status pills, tags |
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Light mode card lift (dark modes use border/sheen only) |
| `font-sans` | `Inter` | All UI text |
| `font-mono` | `JetBrains Mono` | Scores, hex values, metadata |

---

## Typography Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `type-display` | `28px` | `500` | Score, ratio stat |
| `type-title` | `22px` | `500` | Page title |
| `type-heading` | `18px` | `500` | Section heading, project name |
| `type-body` | `15px` | `400` | Task titles, body text |
| `type-label` | `13px` | `400` | Meta, hints, timestamps |
| `type-badge` | `11px` | `500` | Badges, uppercase caps — `letter-spacing: 0.06em` |

---

## Project Type Badge Colors

Each project type gets a distinct badge color, derived per-mode from that mode's own palette (not a shared gray-violet system). Light modes use subtle background + dark text; dark modes use subtle background + light text.

| Type | Paper bg / text | Sage bg / text | Nebula bg / text | Midnight bg / text |
|---|---|---|---|---|
| `critical` | `#F3E4D7` / `#80442A` | `#DFE9D3` / `#3D6128` | `#EEE3F4` / `#6B5491` | `#1A1040` / `#AFA9EC` |
| `recurring` | `#E9F0E1` / `#27401F` | `#DCEBD6` / `#243816` | `#E6F1E8` / `#2E4F38` | `#0A2E24` / `#5DCAA5` |
| `habit` | `#FBEDD2` / `#5C4310` | `#F5E9C9` / `#4F3D0E` | `#FBF1E2` / `#6B4D1E` | `#2A1E08` / `#FAC775` |
| `nicetohave` | `#EBE0D0` / `#7A6B58` | `#E2E4D2` / `#5F6E4F` | `#F0E8F2` / `#827697` | `#1A1F2E` / `#94A3B8` |

---

## Usage Rules

1. **Never use pure black (`#000`) or pure white (`#FFF`) as bg-base.** Every mode's warmth, calm, or energy depends on off-values.
2. **No mode borrows another mode's accent hue.** Paper is terracotta, Sage is stem-green, Nebula is dusty violet, Midnight is teal. If two modes ever look swappable with a find-and-replace on accent color, that's a bug.
3. **Text on colored backgrounds** always uses the dark (or light, on dark modes) stop from the same ramp — never generic gray or black.
4. **Accent color is single-purpose** — only on primary interactive elements.
5. **Status colors are semantic** — done/missed/warning are never used for non-status meaning.
6. **Border width is always `0.5px`** except focus rings (`2px`) and featured card emphasis (`2px`).
7. **Nebula avoids gloss, glow, or vibrance entirely** — comfort comes from softness, warmth, and restraint, not shine.

---

*Kiro — Know your moment.*
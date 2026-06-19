# Kiro — Color System
*Design tokens v1*

---

## Reference

| Source | What it informs |
|---|---|
| Resonare (DJ marketplace) | Dark mode — deep navy base, teal accent, high contrast type |
| Marginalia (bookstore UI) | Light mode — warm cream base, earthy text, analog warmth |

---

## Light Mode — Warm Paper

Derived from Marginalia's off-white cream (`#F5EFE6` background), dark sepia type, and deep burgundy accents. Warm, considered, unmistakably analog.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F7F3EC` | Page background — warm cream, never pure white |
| `bg-surface` | `#FFFFFF` | Cards, modals, panels — lifts off base |
| `bg-surface-raised` | `#FBF9F5` | Nested cards, sidebars — mid-level surface |
| `bg-accent-subtle` | `#EEEDFE` | Violet accent fills — tags, selected states |
| `bg-done-subtle` | `#E6F4EE` | Completed task backgrounds |
| `bg-missed-subtle` | `#FAECE7` | Missed task backgrounds |
| `bg-warning-subtle` | `#FEF3E2` | Overload warning backgrounds |

### Accent (Primary Action)

Violet — wisdom, decisiveness, rare in productivity tools.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#7C6AF7` | Primary buttons, active nav, links |
| `accent-hover` | `#6556E0` | Hover state |
| `accent-pressed` | `#534AB7` | Pressed / active state |
| `accent-subtle` | `#EEEDFE` | Accent background fills |
| `accent-border` | `#CECBF6` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#1E1B2E` | Headings, body — deep warm navy, not pure black |
| `text-secondary` | `#6B6880` | Labels, hints, meta — muted violet-gray |
| `text-tertiary` | `#A09DB8` | Placeholder, disabled |
| `text-accent` | `#7C6AF7` | Links, interactive labels |
| `text-done` | `#1D9E75` | Completed task titles |
| `text-missed` | `#D85A30` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#EDE9E0` | Default card edges, dividers |
| `border-default` | `#E2DED6` | Input borders, section dividers |
| `border-strong` | `#C8C3B8` | Focused inputs, emphasized containers |
| `border-accent` | `#CECBF6` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#1D9E75` | Teal-green | Completed tasks, progress |
| `done-text` | `#085041` | Dark teal | Text on done backgrounds |
| `missed` | `#D85A30` | Coral | Missed / overdue tasks |
| `missed-text` | `#993C1D` | Dark coral | Text on missed backgrounds |
| `warning` | `#BA7517` | Amber | Overload, deadline risk |
| `warning-text` | `#633806` | Dark amber | Text on warning backgrounds |
| `critical` | `#7C6AF7` | Violet | Critical project type badge |

---

## Dark Mode — Midnight Teal

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

## Shared Tokens (Mode-Invariant)

These never change between modes.

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | `4px` | Inputs, small chips |
| `radius-sm` | `8px` | Buttons, badges |
| `radius-md` | `12px` | Cards, panels |
| `radius-pill` | `99px` | Status pills, tags |
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Light mode card lift (dark mode uses border only) |
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

Each project type gets a distinct badge color. All use subtle background + dark text in light mode, subtle background + light text in dark mode.

| Type | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| `critical` | `#EEEDFE` | `#534AB7` | `#1A1040` | `#AFA9EC` |
| `recurring` | `#E1F5EE` | `#0F6E56` | `#0A2E24` | `#5DCAA5` |
| `habit` | `#FAEEDA` | `#854F0B` | `#2A1E08` | `#FAC775` |
| `nicetohave` | `#F1EFE8` | `#5F5E5A` | `#1A1F2E` | `#94A3B8` |

---

## Usage Rules

1. **Never use pure black (`#000`) or pure white (`#FFF`) as bg-base.** The warmth in light and depth in dark both depend on off-values.
2. **Text on colored backgrounds** always uses the dark stop from the same ramp — never generic gray or black.
3. **Accent color is single-purpose** — only on primary interactive elements. Do not use violet/teal as decorative color.
4. **Status colors are semantic** — done/missed/warning are never used for non-status meaning.
5. **Border width is always `0.5px`** except focus rings (`2px`) and featured card emphasis (`2px`).
6. **Dark mode shadows are removed** — depth is communicated through border and background layering only, never drop shadows.

---

*Kiro — Know your moment.*
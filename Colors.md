# Kiro — Color System
*Design tokens v1*

---

## Reference

| Source | What it informs |
|---|---|
| Resonare (DJ marketplace) | Dark mode — deep navy base, teal accent, high contrast type |
| Marginalia (bookstore UI) | Light mode — warm cream base, earthy text, analog warmth |

---

## Paper Mode (Light)

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

## Midnight Mode (Dark)

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

## Indigo Mode (Corporate Dark)

Derived from the "Redefined Creative" aesthetic. Deep navy backgrounds mixed with vibrant purple accents and high-contrast cool-white text.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0B132B` | Page background — deep navy |
| `bg-surface` | `#1C2541` | Cards, panels |
| `bg-surface-raised` | `#28304D` | Nested cards, dropdowns |
| `bg-accent-subtle` | `#201E43` | Indigo accent fills |
| `bg-done-subtle` | `#1A2F2B` | Completed task backgrounds |
| `bg-missed-subtle` | `#3A1F26` | Missed task backgrounds |
| `bg-warning-subtle` | `#362A18` | Overload warning backgrounds |

### Accent (Primary Action)

Vibrant Indigo — `#8E7CFF`

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#8E7CFF` | Primary buttons, active nav, links |
| `accent-hover` | `#A395FF` | Hover state |
| `accent-pressed` | `#7864F0` | Pressed / active state |
| `accent-subtle` | `#201E43` | Accent background fills |
| `accent-border` | `#5648A3` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#F8F9FA` | Headings, body — cool bright white |
| `text-secondary` | `#A0AEC0` | Labels, hints, meta |
| `text-tertiary` | `#4A5568` | Placeholder, disabled |
| `text-accent` | `#8E7CFF` | Links, interactive labels |
| `text-done` | `#48BB78` | Completed task titles |
| `text-missed` | `#F56565` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#202B47` | Default card edges |
| `border-default` | `#2A3B5C` | Input borders, section dividers |
| `border-strong` | `#3A4E7A` | Focused inputs, emphasized containers |
| `border-accent` | `#5648A3` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#48BB78` | Green | Completed tasks |
| `done-text` | `#C6F6D5` | Light green | Text on done |
| `missed` | `#F56565` | Red | Missed |
| `missed-text` | `#FED7D7` | Light red | Text on missed |
| `warning` | `#ECC94B` | Yellow | Warning |
| `warning-text` | `#FEFCBF` | Light yellow | Text on warning |
| `critical` | `#8E7CFF` | Indigo | Critical |

---

## Sage Mode (Organic Light)

Derived from the "Zorea" aesthetic. Warm organic greens, earthy creams, and a highly soothing daylight presence.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F4F5F0` | Page background — earthy cream |
| `bg-surface` | `#FFFFFF` | Cards, panels |
| `bg-surface-raised` | `#FAFAFA` | Nested cards, dropdowns |
| `bg-accent-subtle` | `#E8EFE9` | Sage accent fills |
| `bg-done-subtle` | `#E6F4EA` | Completed task backgrounds |
| `bg-missed-subtle` | `#FCE8E6` | Missed task backgrounds |
| `bg-warning-subtle` | `#FEF7E0` | Overload warning backgrounds |

### Accent (Primary Action)

Sage Green — `#48825D`

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#48825D` | Primary buttons, active nav, links |
| `accent-hover` | `#3A6B4A` | Hover state |
| `accent-pressed` | `#2C5238` | Pressed / active state |
| `accent-subtle` | `#E8EFE9` | Accent background fills |
| `accent-border` | `#B0CEB8` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#2D372B` | Headings, body — deep olive |
| `text-secondary` | `#6B7264` | Labels, hints, meta |
| `text-tertiary` | `#A3A89F` | Placeholder, disabled |
| `text-accent` | `#48825D` | Links, interactive labels |
| `text-done` | `#3A6B4A` | Completed task titles |
| `text-missed` | `#B23B33` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#EAECE6` | Default card edges |
| `border-default` | `#D5D9CD` | Input borders, section dividers |
| `border-strong` | `#AAB0A3` | Focused inputs, emphasized containers |
| `border-accent` | `#B0CEB8` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#48825D` | Sage | Completed tasks |
| `done-text` | `#194025` | Dark green | Text on done |
| `missed` | `#B23B33` | Rust | Missed |
| `missed-text` | `#5C1914` | Dark rust | Text on missed |
| `warning` | `#B37D00` | Golden | Warning |
| `warning-text` | `#593E00` | Dark golden | Text on warning |
| `critical` | `#48825D` | Sage | Critical |

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
# Kiro — Color System
*Design tokens v4*

---

## What changed in v2 / v3 / v4

Paper, Indigo, and Sage previously shared the same bone structure — same violet accent, same gray-scale typography ramp, same neutral surfaces with a different hue dropped in. They read as one theme recolored four times. The other three now have distinct material identities:

- **Paper** — rebuilt around true warm parchment and clay ink, no violet. Meant to feel like a worn notebook, not an app skin.
- **Sage** — rebuilt around moss, bark, and lichen. Earthy and slightly imperfect, not "green Material Design."
- **Nebula** — rebuilt as a soft, comforting lilac light mode: muted dusty violet, warm undertones throughout, no gloss. Comfort over energy.

**v5 completely overhauls Midnight and Nightshade.** 
- **Midnight** abandons its old navy/teal "Resonare" roots. It is now completely rebuilt around the pure black/dark-green background (`#050606`), graphite-green cards, and a striking, glowing Emerald/Mint accent (`#3ABF92`). 
- **Nightshade** drops the Dracula inspiration and fully embraces a premium deep charcoal base (`#101114`), matte graphite surfaces, and a vibrant Electric Indigo accent (`#5C32FA`) alongside saturated green/red/orange status colors.

---

## Reference

| Mode | Material reference |
|---|---|
| Midnight | AdaptoAI inspiration — near-pitch black, glowing emerald green accent, stealthy |
| Paper | Worn paperback, tea-stained notebook paper, soft indoor lamp light |
| Sage | Moss on stone, dried botanicals, unbleached linen, forest floor |
| Nebula | Vital app inspiration, clean soft gray backgrounds with vibrant violet headers |
| Nightshade | Premium Crypto Dashboard — matte charcoal, electric indigo accent, highly saturated status indicators |

---

## Midnight Mode (Adapto Emerald)

Derived from the AdaptoAI aesthetic: extremely deep, near-pitch black (`#050606`), very dark green-tinted graphite cards (`#121514`), and a vibrant, glowing Emerald/Mint accent (`#3ABF92`). Focused, stealthy, and highly modern. 

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#050606` | Page background — near pitch black with a faint green undertone |
| `bg-surface` | `#121514` | Cards, panels — dark green-grey graphite |
| `bg-surface-raised` | `#1C2220` | Nested cards, sidebars, dropdowns |
| `bg-accent-subtle` | `#103527` | Emerald accent fills — tags, selected states |
| `bg-done-subtle` | `#103527` | Completed task backgrounds |
| `bg-missed-subtle` | `#361A1A` | Missed task backgrounds |
| `bg-warning-subtle` | `#382A12` | Overload warning backgrounds |

### Surface gloss (Midnight-only token, updated)

| Token | Value | Usage |
|---|---|---|
| `surface-sheen` | `linear-gradient(160deg, rgba(58,191,146,0.08) 0%, rgba(58,191,146,0) 50%)` | Layer over `bg-surface` — casts a subtle emerald glow across dark cards, matching the AdaptoAI radiant aesthetic. |

### Accent (Primary Action)

Glowing Emerald / Mint. Very high vibrancy against the near-black background.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#3ABF92` | Primary buttons, active nav, links |
| `accent-hover` | `#31A87F` | Hover state |
| `accent-pressed` | `#268C68` | Pressed / active state |
| `accent-subtle` | `#103527` | Accent background fills |
| `accent-border` | `#235A47` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#FFFFFF` | Headings, body — pure white |
| `text-value` | `#E8EBEA` | Distinct values, metadata emphasis |
| `text-secondary` | `#9AA6A1` | Labels, hints, meta — soft green-tinted grey |
| `text-tertiary` | `#606E68` | Placeholder, disabled |
| `text-accent` | `#3ABF92` | Links, interactive labels |
| `text-done` | `#3ABF92` | Completed task titles |
| `text-missed` | `#F27878` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#1C2220` | Default card edges |
| `border-default` | `#262E2A` | Input borders, section dividers |
| `border-strong` | `#333D38` | Focused inputs, emphasized containers |
| `border-accent` | `#235A47` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#3ABF92` | Emerald | Completed tasks, progress |
| `done-text` | `#96EAD0` | Light Emerald | Text on done backgrounds |
| `missed` | `#F27878` | Soft Red | Missed / overdue |
| `missed-text` | `#FAD1D1` | Pale Red | Text on missed backgrounds |
| `warning` | `#F5B258` | Gold | Overload, deadline risk |
| `warning-text` | `#FDE2BF` | Light Gold | Text on warning backgrounds |
| `critical` | `#3ABF92` | Emerald | Critical project type badge |

---

## Nightshade Mode (Charcoal & Electric Indigo)

**Mood:** A premium crypto trading terminal. Deep charcoal backgrounds (`#101114`), matte graphite surfaces (`#1C1D22`), and an incredibly vibrant Electric Indigo accent (`#5C32FA`). Status colors are highly saturated (Emerald, Amber, Red) for immediate data recognition. No purple/Dracula undertones here—just clean, striking contrast.

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#101114` | Page background — pure charcoal |
| `bg-surface` | `#1C1D22` | Cards, panels — matte graphite |
| `bg-surface-raised` | `#26272D` | Nested cards, sidebars, dropdowns |
| `bg-accent-subtle` | `#1F1742` | Indigo accent fills — tags, selected states |
| `bg-done-subtle` | `#133022` | Completed task backgrounds |
| `bg-missed-subtle` | `#3A1A1A` | Missed task backgrounds |
| `bg-warning-subtle` | `#3B2813` | Overload warning backgrounds |

### Accent (Primary Action)

Electric Indigo. Unmistakable, vibrant action color.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#5C32FA` | Primary buttons, active nav, links |
| `accent-hover` | `#4A28C8` | Hover state |
| `accent-pressed` | `#371E96` | Pressed / active state |
| `accent-subtle` | `#1F1742` | Accent background fills |
| `accent-border` | `#7A5CFA` | Accent borders, focus rings |

### Typography

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#FFFFFF` | Headings, body — pure white |
| `text-value` | `#E4E5E9` | Distinct values, metadata emphasis |
| `text-secondary` | `#9294A0` | Labels, hints, meta — cool grey |
| `text-tertiary` | `#585962` | Placeholder, disabled |
| `text-accent` | `#7A5CFA` | Links, interactive labels |
| `text-done` | `#1FC36B` | Completed task titles |
| `text-missed` | `#F84B4B` | Missed task titles |

### Border

| Token | Hex | Usage |
|---|---|---|
| `border-subtle` | `#27282F` | Default card edges |
| `border-default` | `#34353E` | Input borders, section dividers |
| `border-strong` | `#474854` | Focused inputs, emphasized containers |
| `border-accent` | `#5C32FA` | Accent-adjacent borders |

### Status

| Token | Hex | Role | Usage |
|---|---|---|---|
| `done` | `#1FC36B` | Emerald | Completed tasks, progress |
| `done-text` | `#A4E8C2` | Light Green | Text on done backgrounds |
| `missed` | `#F84B4B` | Red | Missed / overdue |
| `missed-text` | `#FBB7B7` | Pale Red | Text on missed backgrounds |
| `warning` | `#F6921E` | Amber | Overload, deadline risk |
| `warning-text` | `#FCD19C` | Light Amber | Text on warning backgrounds |
| `critical` | `#5C32FA` | Indigo | Critical project type badge |

### Surface gloss (Nightshade-only token)

| Token | Value | Usage |
|---|---|---|
| `surface-sheen` | `none` | Not used — Nightshade cards are pure, flat, matte graphite to match the trading-terminal aesthetic. |

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
| `text-value` | `#5A4A3A` | Distinct values, metadata emphasis |
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
| `text-value` | `#435137` | Distinct values, metadata emphasis |
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
| `text-value` | `#5A5068` | Distinct values, metadata emphasis |
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

| Type | Paper bg / text | Sage bg / text | Nebula bg / text | Midnight bg / text | Nightshade bg / text |
|---|---|---|---|---|---|
| `critical` | `#F3E4D7` / `#80442A` | `#DFE9D3` / `#3D6128` | `#EEE3F4` / `#6B5491` | `#1D1248` / `#B7AEEF` | `#332650` / `#BD93F9` |
| `recurring` | `#E9F0E1` / `#27401F` | `#DCEBD6` / `#243816` | `#E6F1E8` / `#2E4F38` | `#0B3328` / `#63D2A8` | `#0E3D2A` / `#50FA7B` |
| `habit` | `#FBEDD2` / `#5C4310` | `#F5E9C9` / `#4F3D0E` | `#FBF1E2` / `#6B4D1E` | `#2C2009` / `#FAC775` | `#3D300F` / `#FFB86C` |
| `nicetohave` | `#EBE0D0` / `#7A6B58` | `#E2E4D2` / `#5F6E4F` | `#F0E8F2` / `#827697` | `#1C2940` / `#A3B7CE` | `#2D2844` / `#B8AAD9` |

---

## Usage Rules

1. **Never use pure black (`#000`) or pure white (`#FFF`) as bg-base.** Every mode's warmth, calm, or energy depends on off-values.
2. **No mode borrows another mode's accent hue** — except Nightshade, which deliberately shares Midnight's teal accent so the two read as siblings; everything else about Nightshade (base, badges, status colors) is distinct. Paper is terracotta, Sage is stem-green, Nebula is dusty violet, Midnight and Nightshade share teal. If two modes ever look swappable beyond that one deliberate exception, that's a bug.
3. **Text on colored backgrounds** always uses the dark (or light, on dark modes) stop from the same ramp — never generic gray or black.
4. **Accent color is single-purpose** — only on primary interactive elements.
5. **Status colors are semantic** — done/missed/warning are never used for non-status meaning.
6. **Border width is always `0.5px`** except focus rings (`2px`), featured card emphasis (`2px`), and Nightshade's borders, which run at standard `1px` as part of its higher-contrast brief.
7. **Dark mode depth comes from border, background layering, and `surface-sheen`** — never drop shadows. Midnight, Nebula, and Nightshade each define `surface-sheen`: Midnight's is a faint teal tint, Nightshade's a faint purple tint, Nebula's is `none` (comfort comes from softness, not shine).
8. **Midnight is the main dark theme and stays untouched by Nightshade's existence.** Nightshade is an additional option for people who want a louder, more saturated dark mode — not a replacement.

---

*Kiro — Know your moment.*
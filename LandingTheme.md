# Kiro Landing Page — Theme & Design System

Status: **Locked.** This is the reference for all section builds going forward.
Direction: Dark, instrument-panel calm — structurally borrowed from Slow Down Creative's
typographic restraint, translated into Kiro's "reliability + productivity" palette.
No hero illustration. No cosmic/nebula imagery. No literal DAG-as-hero-visual.
Type and a single soft glow carry the opening moment; color-blocking carries section rhythm.

---

## 1. Core Principles (do not violate)

1. **No hero image or illustration.** The hero is type + one soft radial glow. Nothing else.
2. **One accent color per moment.** Never two saturated colors competing in the same view.
3. **Italics are the emphasis mechanism**, not color, not bold, not size jumps. Reserve bold
   for UI labels/eyebrows only.
4. **Color-blocked section breaks**, not imagery, separate major sections. A full-width flat
   color band is a legitimate "visual" — we don't need a photo or graphic to justify a section.
5. **Calm by default. Motion is rare and slow.** If in doubt, remove the animation.
6. **Yuki has no visual form.** No avatar, no character art, no mascot, anywhere on this page.
   Her presence is conveyed through copy voice and one small UI artifact (chat-bubble snippet),
   never through illustration.
7. **Hairlines and small tracked-out eyebrows** do the organizing work that boxes/cards/shadows
   would otherwise do. Prefer a rule + label over a bordered card.

---

## 2. Color Tokens

Dark canvas, warm-neutral ink (not cold blue-white), single warm accent for the glow + CTAs,
single separate warm accent for urgency/math contexts. Translated from Slow Down's
cream/peach warmth into a dark register — same temperature, inverted value.

```css
--canvas:        #0E0D0B;   /* near-black, warm undertone (not blue-black) */
--surface:        #181613;   /* panel / color-block band base, one step up from canvas */
--surface-raised:#221F1B;   /* cards, pill buttons (unfilled state) */
--line:           #332E27;   /* hairline rules, dividers, borders */
--ink:            #F4EFE6;   /* primary text, warm off-white (echoes the cream canvas, inverted) */
--ink-dim:        #9C9488;   /* secondary text, captions, eyebrows */
--accent:         #FF8A3D;   /* THE glow + CTA color — warm orange, descended from Slow Down's dot */
--accent-dim:     #7A4420;   /* accent at low opacity for glow falloff / hover states */
--accent-urgency: #FF5C5C;   /* reserved ONLY for neglect-score / math-section urgency cues */
```

Rules:
- `--accent` and `--accent-urgency` never appear in the same section.
- Section color-block bands use `--surface` or a desaturated tint of `--accent` at very low
  opacity over `--canvas` — never a fully different hue. One accent family, varied in value/opacity.

---

## 3. Typography

- **Display / headline**: warm serif with italic variant available (Slow Down's exact
  structural move). Candidates: **Fraunces**, **Canela**, **Lora** (italic). Used for hero
  headline and section openers only. Roman weight for the sentence, **italic for the 1-3 key
  phrases per headline** that need to land hardest — this replaces color/bold as emphasis.
- **Body**: clean humanist sans for all paragraph copy. Candidates: **Inter**, **General Sans**.
- **Eyebrow / labels / UI chrome**: small caps or uppercase, tracked-out (+0.08em–0.12em),
  sans, `--ink-dim` color. ("FEATURED WORK"-style labels.) Used for section tags, nav, captions.
- **Mono**: reserved for the Mission Control (math) section only — actual computed numbers,
  scores, formulas. Candidates: **JetBrains Mono**, **IBM Plex Mono**.

Sizing discipline: hero headline large (clamp ~40px–72px), section headlines one step down,
body copy never smaller than 16px. Generous line-height on the serif (1.3–1.4) — Slow Down's
hero text has noticeable breathing room between lines; replicate that.

---

## 4. Hero Construction (the locked pattern)

- Full-viewport or near-full-viewport, `--canvas` background.
- One soft radial gradient glow, `--accent` → `--accent-dim` → transparent, positioned behind/
  around the headline (not necessarily centered — can sit asymmetrically as in the reference).
  This is the ONLY visual element besides type.
- Optional: one single small bright dot near the glow's edge — the smallest possible accent
  mark, exactly as Tresmares' red dot / Slow Down's orange dot. Never more than one.
- Nav: plain text links, no background, wordmark center or left, single pill CTA button
  top-right (`--surface-raised` bg, `--ink` text, or `--accent` filled — pick one, stay
  consistent across the whole site).
- Headline: serif, roman + italic mix, describing Yuki in narrator voice (not Yuki speaking).
- Subhead: sans, `--ink-dim`, one sentence, states what the crew actually does.
- CTA row: one pill-shaped primary button (`--accent` fill, dark text) + optionally one plain
  text link with arrow (matches Slow Down's "OUR WORK" + "OUR SERVICES →" pairing).
- No scroll cue required, no video, no animation required for v1. If motion is added later,
  it is restricted to the glow very slowly breathing in opacity — nothing else moves.

---

## 5. Section Pattern Library

Reusable patterns, used instead of inventing new layouts per section:

**A. Color-block statement band**
Full-width flat band in `--surface` or low-opacity accent tint. Centered serif-italic
sentence (Slow Down's "Who We Serve" pattern). Small eyebrow label above, centered, with a
tiny icon glyph if needed. Use for short, declarative section transitions (e.g. the
"problem framing" beat).

**B. Horizontal card row**
Flat-colored or `--surface-raised` cards in a single row (not a grid), each with: a flat
background, a small caption row beneath (category label as a pill + title), minimal internal
padding, no heavy shadows. Use for the Crew roster and the Themes/Star-Charts strip.

**C. Split feature row**
Two-column: short copy block (eyebrow + serif headline + sans body + optional link) on one
side, a single supporting visual (diagram, dial, chart) on the other. Alternate sides per
instance. Use for Mission Control (math) and Flight Systems feature beats.

**D. Hairline-divided list**
Thin `--line` rules separating stacked rows, each row a small eyebrow + heading + short body,
expand/collapse optional (per the "Expertise" accordion in the reference). Use sparingly —
good fit if Flight Systems ends up text-heavy rather than visual.

---

## 6. Component Defaults

- **Buttons**: fully pill-shaped (border-radius: 999px), two variants only —
  filled (`--accent` bg) and outlined (`--line` border, transparent bg, `--ink` text).
- **Tags/pills** (category labels like "Branding", "CPG"): tiny pill, `--surface-raised` bg,
  `--ink-dim` text, used next to titles in card rows.
- **Dividers**: 1px `--line`, full-width or container-width, generous margin above/below.
- **Icons**: simple line glyphs only (matches the small flower/star marks in the reference),
  never filled illustrations, never character art.

---

## 7. Explicitly Rejected Directions (do not revisit without re-opening discussion)

- Full-bleed nebula/starfield cosmic hero — dropped in favor of glow-only hero.
- DAG graph as literal hero visual / constellation-as-DAG concept — dropped; the math section
  may still visualize the graph, but it is not the hero's subject.
- Looping background video / scroll-scrubbed frame sequence — dropped as inconsistent with
  "keep it clean."
- Yuki rendered as a character, avatar, or illustrated mascot — dropped; voice only.
- Full light-mode switch — considered, not chosen; we kept dark canvas, borrowed structure only.
# AskAura Design Notes

## Direction

AskAura should feel quiet, restrained, low-light, and reflective. The interface is a focused tool for asking one question and leaving with one next step.

The design should not look like a generic AI chat app, a temple-lottery page, a decorative “Chinese style” campaign, or a mystical prediction product.

## Visual Principles

- Eastern structure, not decorative costume.
- Low-light calm, not supernatural drama.
- Clear hierarchy, not ornamental density.
- Action at the end matters more than the draw animation.
- Tarot, Meihua, Dual, and Daily should feel like one system, not separate products.

## Brand Signals

- Primary brand: AskAura / 象问.
- The brand should be visible in the first viewport.
- Legacy brand marks should not appear in user-facing UI.

## Color

Keep the current restrained palette:

- deep ink background,
- warm paper text,
- soft line separators,
- vermilion only for selected state, seal-like marks, and primary action emphasis.

Avoid gold. Any yellow-gold decorative tone should be treated as off-brand.

## Typography

- Chinese should use a modern serif feeling such as Source Han Serif SC / Noto Serif SC.
- English should feel quiet and editorial, not SaaS-default.
- Do not use oversized hero type inside dense panels.
- Keep letter spacing controlled and avoid cramped labels.

## Layout

- Prefer clear vertical flow and stable panels.
- Do not create card-inside-card structures.
- Avoid decorative shadows for card elevation.
- Result pages should prioritize the core conclusion, evidence, and next action.
- Mobile layouts must avoid horizontal overflow and crowded controls.

## Motion

Motion should support ritual pacing, not distract:

- slow reveal,
- restrained transitions,
- no bounce or elastic effects,
- respect `prefers-reduced-motion`.

## Component Rules

- Buttons should clearly distinguish primary action, return, save, copy, and new reading.
- Follow-up controls must not look like a new primary draw unless they actually start a new draw.
- Empty result sections should be hidden.
- Error states should preserve context and offer one clear recovery path.

## Checklist

- No old visible legacy brand.
- No gold-heavy theme.
- No deterministic prediction language.
- No empty `undefined`, `null`, or blank result sections.
- Core flows work at 375px, 390px, and 430px widths.
- Result ends with one practical action.

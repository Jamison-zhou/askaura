# Design System: Noomo Digital Storytelling

Source: https://storytelling.noomoagency.com/

## 1. Visual Theme & Atmosphere

Noomo's storytelling experience is a cinematic, scroll-driven editorial site—not a conventional marketing landing page. The atmosphere blends soft lavender daylight with deep navy immersion, oversized italic serif drama, and precise sans-serif utility. Motion is central: letter-by-letter reveals, glowing hero typography, liquid-glass overlays, and scroll-triggered narrative beats turn reading into an experience.

- Overall feeling: Premium creative agency, immersive, poetic, slightly mystical
- Visual density: Sparse at any single viewport moment; extremely tall scroll canvas (~27k px) with staged scenes
- Brand posture: Confident, craft-led, emotionally intelligent—not corporate SaaS
- Signature motifs: Gradient-filled italic hero wordmarks, decorative inline icons (bird, star), radial lavender glows, animated underline rules, circular glass CTAs

### Key Characteristics

- Dual-type pairing: **TheSeasons** italic serif for emotional headlines; **TTNeoris** sans for structure and UI
- Periwinkle hero canvas (`#C4C5F1`) transitions into deep brand blues (`#00276E`, `#060B1D`) on scroll
- Hero `storytelling` uses viewport-scaled italic type (~19.5vw) with gradient text fill and intentional horizontal offset
- Navigation uses compact pill buttons with shape-shifting border radii on hover
- Scroll storytelling sections use large italic display copy, split across animated lines
- Fixed chrome: translucent header + pointer-events-none footer overlay with oversized contact CTA
- 3D / WebGL-adjacent immersion suggested by loader reveal mask and long-form case studies (Salesforce, AMD, Coinbase, Intel, Vogue)

## 2. Color Palette & Roles

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Hero canvas | Periwinkle Sky | `#C4C5F1` | Opening scene body background |
| Primary text | Brand Black | `#29345A` | Headlines, nav labels on light surfaces |
| Display accent | Blush Lavender | `#FDEBFD` | Hero display word base color |
| Deep surface | Brand Blue 600 | `#00276E` | Immersive panels, glass overlays |
| Midnight | Dark 400 | `#060B1D` | Blurred ambient blobs, dark scenes |
| Night base | Dark 500 | `#051125` | Deepest backgrounds |
| Core brand | Brand Blue | `#3762BE` | Links, accents, brand moments |
| Mid blue | Brand Blue 500 | `#143A8A` | Secondary blue surfaces |
| Light blue | Brand Blue 200 | `#88AEFF` | Soft highlights |
| Deep blue | Brand Blue 300 | `#062969` | Rich blue accents |
| Rose accent | Brand Rose 200 | `#6248A4` | Editorial accent, alternate button tone |
| Neutral light | Brand White | `#F5F5F5` | Text on dark, soft neutrals |
| Pure white | White | `#FFFFFF` | Footer links, glass borders, CTA text |
| Hot emphasis | Ember Orange | `#FF5A1F` | Animated hero glow states (inferred from keyframes) |
| Loader wash | Lilac Gradient | `#CEBDF8 → #E2DBF8` | Preloader background |

### Primary

- `#29345A` anchors readable editorial copy on pale fields
- `#3762BE` / `#143A8A` carry the Noomo institutional blue story through immersive sections

### Interactive

- Nav pills: text `#29345A`, transparent fill, border implied via shape not heavy stroke
- Footer / overlay links: `#FFFFFF` at full or ~61% opacity
- Hover on simple buttons morphs radius and reveals white gradient underline span
- Glass CTA rings use animated white gradient borders with 0.4s ease-in-out transitions

### Neutral Scale

- `#F5F5F5` on dark
- `#FFFFFF` for high-contrast UI on navy
- `#000000` for base text fallback

### Surface & Overlay

- `liquid-glass` panels: `bg-brand-blue-600/41` (~41% opacity deep blue glass)
- Radial lavender atmospherics: `rgba(234, 189, 246, 0.1–0.2)` in corner gradients
- Header case-back gradient: `linear-gradient(180deg, rgba(0,0,0,0.7), transparent)`

### Theme Modes

Single-mode experience observed (no user-facing light/dark toggle). The page **changes atmosphere by scroll scene** rather than theme switch:

#### Light / Opening Scene

- Background: `#C4C5F1`
- Text: `#29345A`
- Display: blush-lavender gradient-filled italic serif

#### Dark / Immersive Scene

- Background: `#00276E`, `#060B1D`, `#051125`
- Text: `#F5F5F5`, `#FFFFFF`
- Effects: blur blobs, glass overlays, white gradient borders

## 3. Typography Rules

### Font Family

- **Display / editorial:** `TheSeasons`, serif, frequently *italic*
- **UI / body / subheads:** `TTNeoris`, sans-serif
- **Fallback stack:** system-ui, Apple Color Emoji, Segoe UI Emoji

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero display | TheSeasons italic | 19.5vw (~246px @ 1262px) | 400 | 1.0 | -0.1vw | Centered, translated ~18.6vw right; gradient text fill per letter |
| Hero subhead | TTNeoris | 66px desktop / 38px mobile | 400 | 60px / tight | -1.98px (`-.03em`) | "The power of digital"; italic span inside h2 |
| Section display | TheSeasons italic | ~5.2rem small variant | 400 | tight | negative tracking | Animated editorial blocks |
| Nav / UI | TTNeoris | 18px | 400 | 20px | -0.18px | 24px tall pill buttons |
| Mobile menu | TTNeoris | 30px | 400 | 30px | normal | Full-screen overlay links |
| Footer CTA email | TTNeoris | 66px desktop / 30px mobile | 400 | 60px / 30px | -1.98px | Oversized contact anchor |
| Micro UI | TTNeoris | 10px base body reset | 400 | 15px | normal | Root body font-size reference |

### Principles

- Use **scale contrast** more than weight contrast—display sizes are enormous, weights stay near 400
- Italic serif signals emotion; sans signals clarity
- Negative tracking on large sans sizes (`-.01em` to `-.03em`)
- Inline decorative icons (bird, star) substitute for emoji or bullet ornamentation
- Animated text may split words into per-letter spans for scroll/hover choreography

## 4. Component Stylings

### Buttons and Links

**Simple nav button (`simple-button`)**
- Height: 24px (`h-24` = 2.4rem)
- Padding: 8px horizontal (`px-8`)
- Font: 18px TTNeoris, brand black
- Radius variants: `medium-rounded` 4px default → 20px hover; `full-rounded` 20px → 0px hover; `none-rounded` 0px → 20px hover
- Hover: inner `span` expands white linear-gradient underline (`90deg, transparent → white → transparent`)
- Transition: `all 300ms ease-in-out`
- Dark/rose theme classes swap text to white or `#6248A4`

**Glass / release CTA**
- Circular control with masked gradient border (`::before` / `::after` white gradients)
- Backdrop blur 6px on inner gradient surface
- Hover flips border gradient direction opacity

**Footer email link**
- Massive text link, white, no button chrome
- Social links at 18px with optional 61% opacity

### Cards & Containers

- `liquid-glass` containers: low-opacity blue glass over dark scenes
- Case study blocks use full-bleed imagery with typographic overlays
- Long-form sections rely on whitespace and typographic scale, not card grids

### Navigation

- Fixed header, `z-index: 10`, top padding 38px desktop / 20px mobile
- Logo with dual-wrapper hover crossfade on desktop
- Right cluster: Agency / Labs / Contact compact pills + menu trigger
- Mobile menu: large 30px white links, opacity-animated entrance
- Header may include dark gradient backplate over case imagery

### Distinctive Components

- **Hero title letters (`.char`)**: per-letter gradient text fill `white → #E3F0FF`, negative margins for overlap
- **Animated underline rules**: 2px lines, white on dark, width ~250–700px, translated for composition
- **Text-with-stars**: pseudo-element star SVG ornaments before/after phrases
- **Preloader**: lilac diagonal gradient with radial reveal mask (`--reveal-radius`, feathered edge)
- **Sound button**: 48px circular control, bottom-right area
- **Scroll cue**: "Scroll to explore" / "Tap to explore" with star icon

### Image Treatment

- Inline SVG/PNG icons at text scale (bird ~4.8rem wide, stars ~0.8rem)
- Case imagery full-bleed; logos ~130–203px wide in header/footer
- Blurred color blobs as ambient backgrounds, not photos

## 5. Layout Principles

### Spacing System

- Base unit: `--spacing: 0.1rem` (1px at default root)
- Common tokens: 16, 20, 24, 26, 28, 30, 32, 38, 40, 46, 60, 66, 134, 145 (all × 0.1rem → rem-like scale)
- Container padding: `2rem` desktop (`--container-padding`), `1.6rem` mobile (`--container-padding-xs`)
- Section vertical padding often `30px` (`py-30`)
- Hero occupies full viewport height (`h-screen`)

### Grid & Container

- Full-bleed immersive layout; content frequently optically centered then intentionally offset (hero translate)
- Fixed header/footer overlays; main narrative scrolls beneath/through
- Wide editorial measure for hero; narrower stacked copy in principle sections

### Whitespace Philosophy

- One major idea per viewport band
- Generous vertical scroll distance between narrative beats
- Composition uses negative margins and overlapping type rather than tight grids

### Border Radius Scale

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-xs` | 0.4rem (4px) | Nav pill default |
| `--radius-7` | 0.7rem | Small UI |
| `--radius` | 2.4rem | Medium surfaces |
| `--radius-full` | 9999px | Circles, sound button, glass rings |
| Ad hoc | 20px | Nav hover pill state |

## 6. Depth & Elevation

- Prefer **atmosphere over drop shadows**: radial gradients, blur blobs, glass overlays
- `blur-sm` 8px, `blur-lg` 16px, `blur-2xl` 40px, custom `blur(80px)` ambient shapes
- Glass borders simulated via gradient masks, not box-shadow cards
- Hero text glow uses layered `text-shadow` oranges for heat states
- Z-index ladder: base content → footer overlay `z-9` → header `z-10` → loader/menu higher

## 7. Do's and Don'ts

### Do

- Pair oversized italic serif display with restrained sans subheads
- Use scroll to change scene color temperature (lavender → navy)
- Animate typography at the letter or line level for narrative emphasis
- Keep nav compact and shape-playful; let hero typography dominate
- Use gradient text fills and soft radial glows instead of hard cards
- End sections with concrete editorial principles and case-study proof

### Don't

- Don't flatten the hero into a standard left-text/right-image SaaS layout
- Don't use heavy card shadows or generic purple-on-white AI palette
- Don't over-bold type; hierarchy comes from size, italic, and color
- Don't treat the page as a single-screen landing—it is a long story
- Don't add emoji or casual chat tone; voice stays elevated and agency-grade

## 8. Responsive Behavior

### Breakpoints

- Mobile-first utilities with `xs:` and `lg:` prefixes
- Observed mobile threshold around `max-width: 767px` in hero CSS
- Desktop reference captured at 1262×624 viewport

### Collapsing Strategy

- Hero h1: 19.5vw → 18.8vw, minor translate adjustment
- Hero h2 margin-bottom compresses on mobile
- Header padding reduces; some decorative lines hidden on mobile (`lg:!block xs:!hidden`)
- Footer email scales 66px → 30px
- Footer layout shifts from full-screen fixed overlay to flexible height on smaller breakpoints

### Touch Targets

- Menu and sound controls use circular 48px-ish hit areas
- Nav pills are small (24px tall) on desktop—acceptable for precision desktop agency UI; mobile menu enlarges to 30px text links

## 9. Agent Prompt Guide

### Quick Color Reference

- Canvas light: `#C4C5F1`
- Text dark: `#29345A`
- Display blush: `#FDEBFD`
- Deep blue: `#00276E`
- Midnight: `#060B1D`
- Accent rose: `#6248A4`
- White UI: `#FFFFFF`

### Example Component Prompts

**Hero**
> Build a full-viewport hero on a periwinkle `#C4C5F1` field. Subhead in TTNeoris 66px brand black `#29345A` reading "The power of digital". Below, an enormous italic TheSeasons headline "storytelling" at ~20vw, shifted right, with per-letter white-to-ice-blue gradient fill. Add a small "Tap to explore" cue with star icon. Motion: staggered letter pop-in, subtle orange glow pulse on hero title.

**Nav pills**
> Fixed top header with TTNeoris 18px links styled as 24px-tall pills. Default radii vary per item (4px, 20px, 0). On hover, morph radius and reveal a horizontal white gradient underline through the pill. Colors: `#29345A` on transparent over light hero.

**Editorial scroll section**
> Dark navy scene with oversized italic TheSeasons display copy, broken across animated lines. Include thin white horizontal rules offset compositionally. Pair with a principle headline in sans and explanatory lines beneath. Use `#F5F5F5` text on `#00276E` / `#060B1D` backgrounds.

**Footer overlay**
> Fixed full-screen footer frame with pointer-events selectively enabled. Large white email link at 66px, social links at 18px, tagline "Let us help you tell your story the way it was meant". Minimal chrome, cinematic spacing.

### Iteration Guide

- If result feels too "SaaS": increase serif scale, add italic, reduce card boxes
- If result feels flat: add radial lavender glows and gradient text fills
- If result feels noisy: slow motion, enlarge whitespace, one focal type element per scene
- Match scroll rhythm: each section should feel like a chapter, not a feature grid

## Interaction Patterns

- **Preloader reveal:** radial mask expands from center over lilac gradient
- **Hero entrance:** `heroTitleEntrance` blur + translateY + rotateX; per-char `heroLetterPop` stagger
- **Scroll narrative:** long page (~27000px); sections animate on scroll (letter cascades e.g. "Reimagine Phoenix")
- **Hover nav:** radius morph + gradient underline sweep (300ms ease-in-out)
- **Glass controls:** border gradient direction swap on hover (400ms)
- **Reduced motion:** animations disabled; static opacity/color fallbacks

## Content & Messaging Patterns

- Headlines poetic and principle-driven: "Storytelling is much more than words"
- Structured advice blocks: title + short imperative + supporting lines
- Case study name-drops as social proof: Salesforce, AMD, Coinbase, Intel, Vogue
- CTA tone: invitational, not aggressive—"Let us help you tell your story the way it was meant"
- Contact presented as oversized email, not form-first

## Observed Pages

- https://storytelling.noomoagency.com/ — primary immersive storytelling experience (desktop evidence @ 1262px)

## Evidence Notes

- Extracted via `agent-browser` eval (DOM, computed styles, CSS variables, stylesheet rules)
- Mobile viewport pass not fully captured in this run; responsive rules inferred from CSS `xs:` / `lg:` utilities and media queries
- 3D/WebGL scene internals not directly inspected; immersive behavior inferred from meta description and scroll-length structure
- Ember orange glow values taken from observed `@keyframes heroTitleGlowIdle` in stylesheet rules

---
name: Obsidian Telemetry
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: geist
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: geist
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: geist
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: geist
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: geist
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-lg:
    fontFamily: geist
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: geist
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: geist
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  code-md:
    fontFamily: jetbrainsMono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  code-sm:
    fontFamily: jetbrainsMono
    fontSize: 0.6875rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0em
  label-md:
    fontFamily: jetbrainsMono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: jetbrainsMono
    fontSize: 0.625rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  gutter-compact: 0.75rem
  gutter-default: 1rem
  margin-page: 1.5rem
---

## Brand & Style

This design system is engineered for high-density route synchronization. The personality is focused, utilitarian, and uncompromisingly precise—evoking the immediacy of a low-latency UNIX terminal fused with the polished restraint of contemporary engineering suites.

The visual style blends **Minimalism** and **Terminal Modernism**:
- Deep slate-charcoal foundation values that prevent eye fatigue during continuous monitoring.
- High-contrast, unambiguous typographical hierarchy with immediate scannability.
- Crisp hairline framing (1px boundaries) replacing heavy drop shadows to preserve screen real estate.
- Color reserved almost exclusively for operational semantic signals: synchronized state, ingestion queues, merge conflicts, and active node pathways.

## Colors

The palette is rooted in cold, light-absorbing carbon tones, paired with precise status indicators and high-luminance active states.

### Base & Tonal Surfaces
- **Canvas / Root Background (`#0e1318`):** Deep charcoal void for root application views and terminal panes.
- **Surface Level 1 (`#11171d`):** Primary canvas for navigation rails, header bars, and main dashboard zones.
- **Surface Level 2 (`#161f28`):** Raised container surface for inspection panels, route cards, and data tables.
- **Surface Level 3 (`#1c2631`):** Floating dropdowns, hover states, contextual tooltips, and modal overlays.
- **Border Default (`#263544`):** Low-contrast structural boundaries and splitters.
- **Border Subtle (`#1e2936`):** Inner cell dividers and row separators.
- **Border Focus (`#10b981`):** Explicit focus indicators and active state rings.

### Accent & Functional
- **Primary Emerald (`#10b981` / `#22c55e`):** Operational success, live node synchronization, verified route manifests.
- **Secondary Cyan (`#38bdf8`):** Active network traffic, telemetry streaming, directional path metadata.
- **Warning Amber (`#f59e0b`):** Pending synchronizations, network throttling, queued state updates.
- **Danger Crimson (`#f43f5e`):** Synchronization conflicts, corrupt waypoint headers, disconnected daemon threads.
- **Foreground High (`#f8fafc`):** Primary metrics, active route labels, command headers.
- **Foreground Muted (`#94a3b8`):** Secondary metadata, inactive tags, structural labels.
- **Foreground Dim (`#64748b`):** Inline code comments, timestamps, disabled keys.

## Typography

The typography couples the surgical clarity of `Geist` for body copy and dense interface controls with the rigid tabular alignment of `JetBrains Mono` for metadata, coordinates, execution logs, and network tokens.

- Monospaced fonts must always be used for route IDs, SHA hashes, latitude/longitude pairs, latency markers, and raw byte metrics.
- Maintain tight negative letter tracking on headings to provide compact visual weight.
- Tabular lining figures are mandatory across all tables and dynamic status panels to avoid layout shift during live data updates.

## Layout & Spacing

The layout is built on a strictly structured 4px base rhythm designed for multi-panel technical cockpits, split views, and command logs.

### Grid & Composition
- **Panels & Dividers:** The screen is divided into collapsible functional panes: Navigation Rail (fixed 56px or 220px expanded), Main Operational Canvas (flexible 12-column), and Inspector Utility Dock (fixed 360px).
- **Desktop (>= 1280px):** 12 columns, 16px gutters, 24px exterior margin. Data density is high; margins remain compact to maximize raw analytical viewport.
- **Tablet (768px - 1279px):** Inspector slides into a modal sheet or sub-tab. 8 columns, 16px gutters, 16px exterior margin.
- **Mobile (< 768px):** Single-column stacked stream. 4 columns, 12px gutters, 12px exterior margin. Navigation switches to a persistent bottom terminal drawer or compact header.

## Elevation & Depth

This design system avoids heavy drop shadows and faux-3D lighting in favor of **Tonal Layering** and **Low-Contrast Precision Outlines**.

### Elevation Stack
- **Floor (Canvas):** `#0e1318` — Base layer behind all splitters and main dashboard backdrops.
- **Level 1 (Structural Containers):** `#11171d` bordered with 1px `#263544`.
- **Level 2 (Active Cards & Tables):** `#161f28` with `#263544` border. In hovering or selected states, the border transitions to `#38bdf8` at 30% opacity or `#10b981` at 35% opacity.
- **Level 3 (Overlays & Flyouts):** `#1c2631` framed by 1px `#334155`, augmented with a hairline ambient diffuse shadow (`0 8px 24px -4px rgba(0, 0, 0, 0.65)`).

### Atmospheric Elements
- Subtle hairline dividers (`1px solid #1e2936`) delineate table rows, logs, and metadata lists.
- Focused or active states deploy an inner micro-glow (`box-shadow: 0 0 0 1px #10b981, inset 0 0 12px -2px rgba(16, 185, 129, 0.12)`).

## Shapes

The design language uses controlled, restrained corners to evoke a precise, instrumented appearance.

- **Standard Radius:** 4px (`rounded-sm`) on input fields, buttons, log banners, and inline telemetry badges.
- **Structural Radius:** 6px–8px (`rounded-md` / `rounded-lg`) on top-level cards, data modules, and inspection dialogs.
- **Pill Radius:** Used exclusively for circular icon-only indicators or state telemetry pills (e.g., status blips: 9999px).

## Components

### Buttons
- **Primary:** Solid `#10b981` background, `#091b14` foreground, weight 500. On hover: `#22c55e`. Compact padding: `6px 12px`, font: `Geist 13px`.
- **Secondary:** Surface `#161f28`, 1px border `#263544`, `#f8fafc` text. Hover: `#1c2631` background with `#38bdf8` border accent.
- **Destructive / Resolve:** `#1c2631` surface with `#f43f5e` 1px border and text. On active: `#f43f5e` background with `#ffffff` text.
- **Terminal / Ghost:** Zero background, `#94a3b8` text, hover: `#161f28` surface, `#f8fafc` text.

### Telemetry Badges & Chips
- Badges feature a monospaced format (`JetBrains Mono`, 11px), 1px border, 2px 6px padding.
- **Synced:** Background `rgba(16, 185, 129, 0.1)`, border `rgba(16, 185, 129, 0.3)`, text `#34d399`. Accompanied by a 6px pulsing dot blip.
- **Pending:** Background `rgba(245, 158, 11, 0.1)`, border `rgba(245, 158, 11, 0.3)`, text `#fbbf24`.
- **Conflict:** Background `rgba(244, 63, 94, 0.1)`, border `rgba(244, 63, 94, 0.3)`, text `#fb7185`.

### Input Fields & Selectors
- Background `#0e1318`, 1px border `#263544`, color `#f8fafc`, placeholder `#64748b`.
- Fixed height: 32px for compact controls; 38px for primary search inputs.
- Focus state: border `#10b981`, no broad outer ring; clean 1px highlight.

### Route Inspection Cards
- Header with monospaced route coordinate or ID, sync state chip on top right.
- Surface `#161f28`, 1px border `#263544`. Internal layout segmented via subtle hairline divider (`#1e2936`).
- Interactive states: mouseover transitions border color smoothly to `#334155`.

### Data Tables & Log Streamers
- Alternating subtle rows or pure flat rows with 1px bottom border `#1e2936`.
- Row hover: `#161f28` at 60% opacity.
- Header row: `#11171d`, uppercase monospaced labels (`label-sm`), muted text `#64748b`.

### Checkboxes & Radios
- Box size: 14px by 14px with 2px corner radius. Border `#263544`, background `#0e1318`.
- Checked state: background `#10b981`, border `#10b981`, crisp dark SVG checkmark inset.
---
name: Thomas Talas
description: Seasonal portfolio — bento playground, system fonts, 780px column
colors:
  base: "theme-dependent (Mocha: #1e1e2e)"
  mantle: "theme-dependent (Mocha: #181825)"
  crust: "theme-dependent (Mocha: #11111b)"
  surface-0: "theme-dependent (Mocha: #313244)"
  surface-1: "theme-dependent (Mocha: #45475a)"
  surface-2: "theme-dependent (Mocha: #585b70)"
  text: "theme-dependent (Mocha: #cdd6f4)"
  subtext-1: "theme-dependent (Mocha: #bac2de)"
  subtext-0: "theme-dependent (Mocha: #a6adc8)"
  overlay-2: "theme-dependent (Mocha: #9399b2)"
  overlay-1: "theme-dependent (Mocha: #7f849c)"
  overlay-0: "theme-dependent (Mocha: #6c7086)"
  accent: "var(--peach) default, user-selectable from 14 Catppuccin colors"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.938rem"
    fontWeight: 400
    lineHeight: 1.7
  mono:
    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Mono', 'Segoe UI Mono', monospace"
    fontSize: "0.75rem"
    fontWeight: 500
spacing:
  max-width: "780px"
  section: "clamp(56px, 8vw, 112px)"
  pad: "clamp(20px, 4vw, 32px)"
---

## Direction

Personal portfolio inspired by [Jason Cameron's Nyx](https://github.com/JasonLovesDoggo/nyx): projects first, compact control panels, playful counters, and a bento dashboard. The site uses custom seasonal themes (Spring, Summer, Fall, Winter) plus selectable accent colors.

## Stack

- **Framework**: Angular 19 (standalone components, signals)
- **Language**: TypeScript (strict)
- **Styles**: SCSS + CSS custom properties (seasonal palette)
- **Fonts**: System stack only — zero network requests for typography
- **Themes**: Spring/Summer/Fall/Winter classes on `<html>`, persisted in localStorage
- **Motion**: Hero entrance only (opacity + translateY, respects prefers-reduced-motion)

## Architecture

```
src/app/
  components/
    header/    — fixed floating-pills nav, no sidebar
    hero/      — single-line name + intro paragraph with entrance animation
    dashboard/ — bento grid: connect, location, click counter, now, season/accent controls
    projects/  — featured project grid with tags from typed data
    work/      — role list from typed data, featured first role
    about/     — 3 paragraphs of real copy
    footer/    — copyright + abacus view count
  data/
    portfolio.data.ts  — Role/Project interfaces, ROLES/PROJECTS arrays
  services/
    theme.service.ts — seasonal theme + accent color management
    view-counter.service.ts — Abacus API integration
```

## Themes

All 4 seasonal palettes are custom and applied as classes on `<html>`:

| Theme | Mood | Base | Surface | Text |
|-------|------|------|---------|------|
| Winter (default) | Cold midnight | `#0f1219` | `#1a1e28` | `#e2e8f0` |
| Fall | Earthy amber | `#1c1410` | `#2a2018` | `#f0e4d4` |
| Summer | Warm daylight | `#fdf6e8` | `#e0d3b8` | `#3a2e1c` |
| Spring | Dewy green | `#f4f7f0` | `#d2dbc8` | `#2b3626` |

14 accent colors available: rosewater, flamingo, pink, mauve, red, maroon, peach (default), yellow, green, teal, sky, sapphire, blue, lavender.

## Typography

System font stack for body. System monospace for nav name, dates, metadata, tags, footer. No Google Fonts, no CDN, no FOUT.

## Don'ts

- No uppercase tracked section labels
- No scroll animations or reveals
- No gradient text or glassmorphism
- No particle effects, orbs, noise, marquees
- No Google Fonts
- No card hover glow

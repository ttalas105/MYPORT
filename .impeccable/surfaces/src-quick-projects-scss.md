---
version: 1
slug: "src-quick-projects-scss"
primary_target: "src/_quick-projects.scss"
related_targets: []
---

# Quick project view

Project View is opened by the purple exterior neon above the keyboard. Mode: Read.

Recruiters need to scan Thomas's five projects, his contribution, and the technologies without navigating the 3D tour. The user delegated the creative execution and asked for a nice, quick view. Preserve the studio, welcome copy, Index, case studies, and current factual ownership credits.

The exterior PROJECT VIEW sign opens the overview directly; its old shortcut inside CLICK ME is removed. A compact liner-note layout carries five concise contribution summaries and stacks, a dedicated project reader, GitHub, LinkedIn and Email links, and optional links into the studio. A geometric record ties the view to the studio without delaying reading. Existing colors and type apply. The user rejected inline expansion as hard to read, so selecting a project replaces the list with one focused article.

Opening and reading hold the route. All projects or Escape from a reader restores the overview's scroll position and the selected button's focus. Close, outside dismissal, or Escape from the overview restores the exterior position and sign focus. Inside-studio navigation is explicit. Desktop shows the five projects together; mobile uses one scrolling project list below a compact introduction. Keyboard focus is contained, and a text button preserves access without WebGL. Reduced motion skips the sign flourish and small entrance movement.

Project facts come from project-details.ts, PRODUCT.md, and the user's earlier confirmations. The North Group client remains anonymous. No metrics or new ownership claims.

## Implemented design

The dialog uses the existing directory colors, mixed-case Funnel headings, Atkinson body text and 16px corners. Desktop pairs a 16rem introduction column and geometric record with one scrolling project list inside a 68rem maximum width. The stable-height shell contains either this list or a reader with a fixed title/context and scrolling article. Article text is 18px/1.65, or 17px/1.6 on mobile, with role and stack metadata grouped separately from the three narrative sections. At 760px and below, the record hides; during reading the introduction also hides while GitHub, LinkedIn and Email remain as a compact row. Thin dividers separate the overview buttons, with arrows indicating the dedicated reading view.

Surface elevation intentionally uses a soft black shadow (`0 24px 80px rgb(0 0 0 / .4)`), continuing the welcome's existing shadow (`0 16px 48px rgb(0 0 0 / .3)`). The 260ms entrance movement is disabled by the shared reduced-motion rule. The exterior shortcut uses physical purple neon with the shared CLICK ME animation and a native projected hit target. Each reader starts at the top and focuses its title without moving the studio route.

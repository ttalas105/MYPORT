# Thomas Talas — studio portfolio

A standalone Angular application built around a guided Three.js studio. Native page scrolling moves from the street through the room and its projects. Accessible HTML supplies navigation, project readers, album notes, the welcome panel and music controls over the canvas.

## Development

Use Node.js 22 and npm, then run:

```bash
npm ci
npm start
```

Open `http://localhost:4200/`. Angular's development server reloads source changes automatically.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/main.ts`, `app.component.ts`, `app.config.ts` | Standalone bootstrap, initial scroll reset and shared Angular / PrimeNG providers. |
| `portfolio-page.component.*` | Page state, native scroll navigation, dialogs, focus restoration and the project Index. |
| `system-scene.component.ts` | Three.js lifecycle, camera transitions, frame scheduling and projected HTML interaction targets. |
| `studio/studio-route.ts` | Shared route timing and reversible mapping between scroll distance and camera progress. |
| `studio/studio-room.ts`, `studio-furniture.ts`, detail builders | Physical geometry, materials, authored screen textures and resource ownership. |
| `studio/studio-geometry.ts`, `studio-surfaces.ts` | Dimensionally correct rounded boxes and material UV scaling. |
| `studio/studio-lighting.ts`, `studio-rendering.ts` | Lighting, environment capture and post-processing setup. |
| `studio/studio-batching.ts`, `studio-quality.ts` | Spatial batching, static transforms, adaptive canvas quality and render pacing. |
| `studio/studio-audio.service.ts` | Page-scoped music preferences, observable playback state and browser event lifecycle. |
| `studio/studio-audio.ts` | Native media playback, Web Audio doorway filtering and resource disposal, independent of Angular. |
| `studio/studio-music.component.*` | Presentation and user controls for the audio service. |

The scene is deferred until browser idle. The soundtrack's HTML media element starts loading from `index.html` and is adopted by the audio engine without replacing a matching source request. Playback is attempted automatically when enabled. If the browser blocks autoplay, ordinary trusted interactions retry it; saved mute and volume preferences still apply. Camera depth controls the doorway filter.

Project copy lives in `src/app/project-details.ts`; welcome, album and soundtrack data live in their corresponding `src/app/studio/` modules. Album data identifies the seven physical cover meshes. The project readers and album views share scene transitions while retaining separate layouts.

`src/styles.scss` composes focused partials for shared tokens, story captions, persistent controls, the Index, and the three reading surfaces. Music controls keep their styles beside their component. Change an existing rule in its owning partial instead of appending a second override at the end of the global sheet.

Static assets are served from `public/`. See [the asset inventory](public/ASSETS.md), [album sources](public/room/ALBUMS.md) and [material sources](public/studio-assets/ASSETS.md). Fonts retain their bundled OFL licenses. Private research notes and local diagnostic logs are intentionally ignored by Git.

## Validation

```bash
npm test       # Audio, service, quality, render pacing and static geometry checks
npm run typecheck
npm run build  # Angular production compilation and bundle/style budgets
npm run check  # All three in sequence
```

The Node checks in `tests/` transpile the actual audio engine and service with the installed TypeScript compiler. They cover autoplay retries, preloaded media adoption, saved preferences, volume and filter behavior, asynchronous playback races, visibility and disposal. They require no test framework or browser installation.

TypeScript strict checks also reject unused locals and parameters, keeping obsolete helpers and imports from accumulating.

These checks do not render WebGL or emulate a browser's autoplay policy. Verify camera framing, keyboard focus, narrow layouts and actual audio playback in a browser after changes to those behaviors.

Production output is `dist/portfolio/browser`. Public asset URLs assume the application is hosted at the domain root. Serve that directory with a static host after a successful build.

## Rendering performance

Static room and furniture parts are combined by material, shadow settings and two-metre spatial cells after UV mapping. Door/neon/platter animation and album/screen targets keep their identities. Fixed transforms are frozen; moving branches remain live.

Camera movement renders at up to 60 fps, settled interior ambience at 30 fps. The still exterior stops scheduling frames until input, resize or assets require one. Reduced motion continues to render on demand.

Canvas quality starts high on unconstrained desktops and balanced on phones or devices reporting at most four CPU threads or 4GB of memory. High uses half-resolution ambient occlusion and SMAA; balanced skips ambient occlusion; low uses direct canvas MSAA. Pixel-ratio caps are 1.5 / 1.25 / 1, with 3M / 2M / 1.25M pixel targets and a 0.5 resolution floor for very large displays. HTML stays at native resolution. A median above 24ms over 60 moving frames lowers quality, with a four-second cooldown and no automatic upgrades during that visit. Isolated stalls and deliberate idle pacing do not lower quality. Only high desktop quality performs the optional one-time room reflection capture.

For local measurement, open `http://127.0.0.1:4200/?studioProfile=1`. The console reports five-second active samples: frame cadence, CPU submission time, aggregate draw calls/triangles, canvas pixels and allocated geometry/texture counts. It also reports when the exterior becomes idle. Add `&studioBenchmark=1` for an uncapped comparison with adaptive changes disabled. Both diagnostic flags are ignored in production; no telemetry is sent. CPU submission time is not a GPU timer, and results on one machine do not establish performance on other hardware.

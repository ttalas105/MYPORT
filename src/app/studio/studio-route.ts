export const STUDIO_STOPS = [0, 0.30, 0.48, 0.64, 0.80, 1] as const;

// Camera keys and chapter stops use scene progress. Two distinct stretches of
// native scrolling add time for the city approach and the room's look-around;
// every other leg retains its original distance. Include one sticky viewport.
const BASE_SCROLL_VIEWPORTS = 8.4;
export const STUDIO_CITY_APPROACH = { start: 0, end: .055, extraViewports: 1.5 } as const;
export const STUDIO_LOOK_AROUND = { start: .16, end: .265, extraViewports: 2 } as const;
const EXTENDED_SPANS = [STUDIO_CITY_APPROACH, STUDIO_LOOK_AROUND] as const;
const TOTAL_SCROLL_VIEWPORTS = BASE_SCROLL_VIEWPORTS + EXTENDED_SPANS.reduce((sum, span) => sum + span.extraViewports, 0);
export const STUDIO_STORY_HEIGHT_SVH = (TOTAL_SCROLL_VIEWPORTS + 1) * 100;

export function studioProgressFromScroll(scrollProgress: number): number {
  const distance = Math.max(0, Math.min(1, scrollProgress)) * TOTAL_SCROLL_VIEWPORTS;
  let extraBefore = 0;
  for (const span of EXTENDED_SPANS) {
    const start = span.start * BASE_SCROLL_VIEWPORTS + extraBefore;
    const length = (span.end - span.start) * BASE_SCROLL_VIEWPORTS + span.extraViewports;
    if (distance < start) return (distance - extraBefore) / BASE_SCROLL_VIEWPORTS;
    if (distance <= start + length) return span.start + (distance - start) / length * (span.end - span.start);
    extraBefore += span.extraViewports;
  }
  return (distance - extraBefore) / BASE_SCROLL_VIEWPORTS;
}

export function studioScrollFromProgress(sceneProgress: number): number {
  const progress = Math.max(0, Math.min(1, sceneProgress));
  const extraDistance = EXTENDED_SPANS.reduce((sum, span) => {
    const fraction = Math.max(0, Math.min(1, (progress - span.start) / (span.end - span.start)));
    return sum + fraction * span.extraViewports;
  }, 0);
  return (progress * BASE_SCROLL_VIEWPORTS + extraDistance) / TOTAL_SCROLL_VIEWPORTS;
}

// Copy is visible around an arrival and hold, then clears while crossing the room.
const CAPTION_WINDOWS = [
  [0, .10], [.275, .365], [.435, .575], [.625, .715], [.78, .895], [.97, 1],
] as const;

export function studioCaptionAt(progress: number): number | null {
  const chapter = CAPTION_WINDOWS.findIndex(([start, end]) => progress >= start && progress <= end);
  return chapter < 0 ? null : chapter;
}

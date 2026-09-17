/** Drag the scene while leaving vertical touch gestures to native scrolling. */
export class StudioLookControls {
    yaw = 0;
    pitch = 0;
    dragging = false;
    private maxYaw = Infinity;
    private recentering = false;
    private pointer: { id: number; x: number; y: number; touch: boolean } | null = null;
    private suppressClick = false;
    private readonly events = new AbortController();

    constructor(
        private readonly surface: HTMLElement,
        private readonly enabled: () => boolean,
        private readonly changed: () => void,
        private readonly started: () => void,
    ) {
        const options = { signal: this.events.signal };
        surface.addEventListener('pointerdown', this.onDown, options);
        surface.addEventListener('click', this.onClick, { ...options, capture: true });
        surface.addEventListener('lostpointercapture', this.onLostCapture, options);
        window.addEventListener('pointermove', this.onMove, options);
        window.addEventListener('pointerup', this.onEnd, options);
        window.addEventListener('pointercancel', this.onEnd, options);
        window.addEventListener('blur', this.cancel, options);
    }

    get moving(): boolean { return this.dragging || this.recentering; }

    setYawLimit(limit: number): void {
        this.maxYaw = limit;
        this.yaw = Math.max(-limit, Math.min(limit, this.yaw));
    }

    private readonly onDown = (event: PointerEvent): void => {
        if (!event.isPrimary) { this.cancel(); return; }
        this.suppressClick = false;
        if (event.button !== 0 || !this.enabled()) return;
        this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
    };

    private readonly onMove = (event: PointerEvent): void => {
        const pointer = this.pointer;
        if (!pointer || pointer.id !== event.pointerId) return;
        if (!this.enabled() || (!pointer.touch && !(event.buttons & 1))) { this.cancel(); return; }
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        if (!this.dragging) {
            if (Math.hypot(dx, dy) < 6) return;
            // touch-action: pan-y lets the browser take over a vertical swipe.
            if (pointer.touch && Math.abs(dy) >= Math.abs(dx)) { this.cancel(); return; }
            this.dragging = true;
            this.recentering = false;
            this.suppressClick = true;
            this.surface.setPointerCapture(event.pointerId);
            this.surface.classList.add('is-looking');
            this.started();
        }
        if (event.cancelable) event.preventDefault();
        const sensitivity = Math.PI / Math.max(this.surface.clientWidth, 320);
        this.yaw -= dx * sensitivity;
        this.yaw = Number.isFinite(this.maxYaw)
            ? Math.max(-this.maxYaw, Math.min(this.maxYaw, this.yaw))
            : Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
        if (!pointer.touch) this.pitch = Math.max(-1, Math.min(1, this.pitch + dy * sensitivity));
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        this.changed();
    };

    private readonly onEnd = (event: PointerEvent): void => {
        if (event.pointerId === this.pointer?.id) this.cancel();
    };

    private readonly onLostCapture = (event: PointerEvent): void => {
        // Touch starts with implicit capture on the canvas or hotspot. Its loss
        // bubbles when capture transfers to the surface; the drag is still live.
        if (event.target === this.surface) this.onEnd(event);
    };

    private readonly onClick = (event: MouseEvent): void => {
        if (!this.suppressClick || event.detail === 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClick = false;
    };

    readonly cancel = (): void => {
        const pointer = this.pointer;
        this.pointer = null;
        this.dragging = false;
        this.surface.classList.remove('is-looking');
        if (pointer && this.surface.hasPointerCapture(pointer.id)) this.surface.releasePointerCapture(pointer.id);
    };

    recenter(): void {
        this.cancel();
        this.recentering = Math.abs(this.yaw) + Math.abs(this.pitch) > 0;
    }

    update(dt: number, reducedMotion: boolean): void {
        if (!this.recentering) return;
        const decay = reducedMotion ? 0 : Math.exp(-9 * dt);
        this.yaw *= decay;
        this.pitch *= decay;
        if (Math.abs(this.yaw) + Math.abs(this.pitch) < .0001) {
            this.yaw = this.pitch = 0;
            this.recentering = false;
        }
    }

    dispose(): void {
        this.cancel();
        this.events.abort();
    }
}

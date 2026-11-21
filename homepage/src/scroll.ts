import Lenis from "lenis";
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v: number, a: number, b: number) =>
  clamp((v - a) / (b - a));
export const ease = (v: number) => 1 - Math.pow(1 - v, 3);
type Frame = (time: number) => void;
const listeners = new Set<Frame>();
let lenis: Lenis | null = null;
// The existing game loop is the only rAF owner. Scroll never updates React state.
export function start(
  wrapper: HTMLElement,
  content: HTMLElement,
  reduced: boolean,
) {
  lenis?.destroy();
  lenis = reduced
    ? null
    : new Lenis({
        wrapper,
        content,
        lerp: 0.09,
        smoothWheel: true,
        wheelMultiplier: 0.9,
      });
}
export function tick(time: number) {
  lenis?.raf(time);
  listeners.forEach((fn) => fn(time));
}
export function stop() {
  lenis?.destroy();
  lenis = null;
}
export function frame(fn: Frame) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function go(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.15 });
  else el.scrollIntoView({ behavior: "auto" });
}
export function progress(el: HTMLElement, viewport: HTMLElement) {
  const r = el.getBoundingClientRect(),
    v = viewport.getBoundingClientRect(),
    span = Math.max(1, r.height - v.height);
  return clamp((v.top - r.top) / span);
}

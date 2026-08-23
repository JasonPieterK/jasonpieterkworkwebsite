const COLORS = ["#FF3D8A", "#2D7FF9", "#B8E22B", "#FFC93C", "#FF6B4A", "#6B3FA0"];

/**
 * Full-screen confetti: a fall across the whole viewport plus two side cannons
 * firing inward, so the celebration covers the page rather than one button.
 * ponytail: Web Animations API + plain divs — no canvas, no dependency.
 * Elements remove themselves when their animation finishes.
 */
export function confettiScreen(count = 160): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:600;overflow:hidden";
  document.body.appendChild(layer);

  let alive = count;
  let maxLifetime = 0;

  for (let i = 0; i < count; i++) {
    // Two thirds rain down the full width; the rest are side cannons.
    const mode = i % 3 === 0 ? (i % 6 === 0 ? "left" : "right") : "fall";
    const piece = document.createElement("i");
    const size = 6 + Math.random() * 9;
    const round = Math.random() < 0.3;

    let startX: number;
    let startY: number;
    let dx: number;
    let dy: number;

    if (mode === "fall") {
      startX = Math.random() * W;
      startY = -20 - Math.random() * H * 0.5;
      dx = (Math.random() - 0.5) * W * 0.35; // sideways drift
      dy = H + Math.abs(startY) + 40;
    } else {
      const fromLeft = mode === "left";
      startX = fromLeft ? -20 : W + 20;
      startY = H * (0.45 + Math.random() * 0.35);
      dx = (fromLeft ? 1 : -1) * (W * (0.45 + Math.random() * 0.55));
      dy = -H * (0.25 + Math.random() * 0.4); // arc up, gravity below pulls it back
    }

    piece.style.cssText = `position:absolute;left:${startX}px;top:${startY}px;width:${size}px;height:${
      size * (round ? 1 : 0.45)
    }px;background:${COLORS[i % COLORS.length]};border-radius:${round ? "50%" : "2px"};will-change:transform,opacity`;
    layer.appendChild(piece);

    const spin = (Math.random() - 0.5) * 1440;
    const duration = 2200 + Math.random() * 1800;
    const delay = mode === "fall" ? Math.random() * 900 : Math.random() * 150;
    const gravity = mode === "fall" ? 0 : H * 0.9;
    maxLifetime = Math.max(maxLifetime, duration + delay);

    const anim = piece.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 + gravity * 0.15}px) rotate(${spin * 0.5}deg)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translate(${dx}px, ${dy + gravity}px) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration, delay, easing: "cubic-bezier(0.15, 0.6, 0.35, 1)", fill: "forwards" }
    );

    anim.onfinish = () => {
      piece.remove();
      if (--alive === 0) layer.remove();
    };
  }

  // Backstop: animations stall while the tab is hidden, so onfinish may never
  // land. Sweep the layer once the burst should long since be over.
  setTimeout(() => layer.remove(), maxLifetime + 4000);
}

import { useEffect, useState } from 'react';

// Browser RAF-based FPS sampler. Independent of r3f's loop, but ticks at the
// same display rate (both queue onto requestAnimationFrame). State updates
// throttled to ~2 Hz so we don't re-render React every frame.
function useFps(sampleWindowMs = 500): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const tick = () => {
      frames++;
      const now = performance.now();
      const dt = now - last;
      if (dt >= sampleWindowMs) {
        setFps(Math.round((frames * 1000) / dt));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sampleWindowMs]);

  return fps;
}

export function FpsBadge() {
  const fps = useFps();
  const tier = fps >= 55 ? 'good' : fps >= 30 ? 'ok' : 'bad';

  return (
    <div className={`fps-badge fps-${tier}`} title={`Frame rate: ${fps} FPS`}>
      <span className="fps-dot" />
      <span className="fps-num">{fps || '—'}</span>
      <span className="fps-unit">FPS</span>
    </div>
  );
}

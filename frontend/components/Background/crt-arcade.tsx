/**
 * Arcade / CRT background, rendered once globally by the root layout.
 *
 * Renders an opaque "cabinet screen" ground, plus scanlines, a drifting bright
 * band, and a vignette on top. All layers are fixed, decorative, and
 * pointer-transparent, so they sit behind interactive UI without blocking it.
 * Animations respect prefers-reduced-motion (see styles/globals.css).
 */
export function ArcadeBackground() {
  return (
    <>
      <div className="arcade-ground" aria-hidden="true" />
      <div className="arcade-grid" aria-hidden="true" />
      <div className="crt-scanlines" aria-hidden="true" />
      <div className="crt-vignette" aria-hidden="true" />
    </>
  );
}

/* Empty frame the WebGL object is projected into (see features/three/scene.js →
   "layout-locked framing"). Keeping it empty guarantees the 3D never sits behind text. */
const tag = 'stage-tag absolute whitespace-nowrap bg-plate px-1.5 py-0.5 text-[11px] tracking-[.14em]';

export default function Stage3D({ id, className = '', topLeft, bottomRight }) {
  return (
    <div className={`stage3d w-full ${className}`} data-anchor3d={id} aria-hidden="true">
      <span className={`${tag} left-2.5 top-2.5 text-secondary`}>{topLeft}</span>
      <span className={`${tag} bottom-2.5 right-2.5 text-fg-2`}>{bottomRight}</span>
    </div>
  );
}



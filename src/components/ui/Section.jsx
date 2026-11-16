/* Page section wrapper + the two-column "content | 3D stage" split. */
import Stage3D from './Stage3D.jsx';

export function Section({ id, labelledBy, className = '', children }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`relative pb-[clamp(64px,10vh,110px)] pt-[clamp(96px,14vh,150px)] ${className}`}>
      <div className="shell">{children}</div>
    </section>
  );
}

/** Content on one side, an empty 3D stage on the other. On < 1024px the stage stacks on top. */
export function Split({ stage, side = 'right', children }) {
  const cols = side === 'right' ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]';
  return (
    <div className={`grid grid-cols-1 items-start gap-[clamp(28px,4vw,56px)] ${cols}`}>
      <div className={`min-w-0 ${side === 'right' ? 'lg:order-1' : 'lg:order-2'}`}>{children}</div>
      <div className={`relative min-w-0 self-stretch max-lg:order-first ${side === 'right' ? 'lg:order-2' : 'lg:order-1'}`}>
        <Stage3D
          id={stage.id}
          topLeft={stage.topLeft}
          bottomRight={stage.bottomRight}
          className="h-[clamp(200px,34vh,320px)] lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:h-[min(68vh,560px)] lg:min-h-60"
        />
      </div>
    </div>
  );
}



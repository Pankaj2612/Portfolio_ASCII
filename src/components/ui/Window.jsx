/* Retro window panel. `reveal` = 'crt' | 'card' (scroll-in effect). */
import WindowBar, { Meta } from './WindowBar.jsx';
import { useReveal } from '../../hooks/useReveal.js';

export default function Window({ title, meta, metaClass, reveal, className = '', bodyClass = 'p-4 sm:p-[clamp(16px,2.6vw,28px)]', children }) {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} className={`window ${className} ${reveal && shown ? 'in' : ''}`} data-reveal={reveal || undefined}>
      <WindowBar title={title} right={meta != null ? <Meta className={metaClass}>{meta}</Meta> : null} />
      <div className={bodyClass}>{children}</div>
    </div>
  );
}



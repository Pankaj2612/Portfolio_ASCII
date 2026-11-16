/* CRT layers above everything (pointer-events: none): scanlines, vignette, nav warp flash. */
export default function CrtOverlay() {
  return (
    <>
      <div className="fx fx-scan" aria-hidden="true" />
      <div className="fx fx-vignette" aria-hidden="true" />
      <div className="fx fx-warp" id="warp" aria-hidden="true" />
    </>
  );
}



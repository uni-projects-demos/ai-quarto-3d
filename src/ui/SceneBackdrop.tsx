import type { JSX } from "react";

export function SceneBackdrop(): JSX.Element {
  return (
    <>
      <div className="marble-interior" aria-hidden="true" />
      <div className="nature-landscape" aria-hidden="true" />
      <div className="flogsta-balcony" aria-hidden="true" />
      <div className="scene-architecture" aria-hidden="true">
        <div className="victorian-wall" />
        <div className="victorian-lamplight" />
      </div>
    </>
  );
}

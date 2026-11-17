import type { JSX } from "react";

export function SceneBackdrop(): JSX.Element {
  return (
    <>
      <div className="marble-interior" aria-hidden="true" />
      <div className="nature-landscape" aria-hidden="true" />
      <div className="flogsta-balcony" aria-hidden="true" />
      <div className="quake-landscape" aria-hidden="true" />
      <div className="bunk-cabin" aria-hidden="true">
        <div className="bunk-cabin-art" />
        <div className="bunk-window">
          <div className="bunk-ocean" />
        </div>
        <div className="bunk-window-bolts" />
        <div className="bunk-hull-ribs" />
        <div className="bunk-cabin-light" />
        <div className="bunk-berth">
          <div className="bunk-lower-slot">
            <div className="bunk-lower-pillow" />
            <div className="bunk-lower-blanket" />
          </div>
          <div className="bunk-bedframe-left" />
          <div className="bunk-bedframe-right" />
          <div className="bunk-upper-bar" />
          <div className="bunk-mattress" />
          <div className="bunk-sheet" />
          <div className="bunk-blanket" />
          <div className="bunk-pillow" />
          <div className="bunk-soft-toy">
            <span className="bunk-toy-ear" />
            <span className="bunk-toy-ear" />
          </div>
          <div className="bunk-guard-panel" />
          <div className="bunk-outer-rail" />
          <div className="bunk-rail" />
          <div className="bunk-ladder" />
        </div>
      </div>
      <div className="scene-architecture" aria-hidden="true">
        <div className="victorian-wall" />
        <div className="victorian-lamplight" />
      </div>
    </>
  );
}

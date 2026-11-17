export function createWoodCanvas(): HTMLCanvasElement {
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = 512;
  cvs.height = 512;
  return cvs;
}

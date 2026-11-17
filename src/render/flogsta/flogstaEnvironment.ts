import { PMREMGenerator, type Texture, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { SceneResources } from "../SceneResources";

export function createCoffeeEnvironment(renderer: WebGLRenderer, resMap: SceneResources): Texture {
  const env = new RoomEnvironment();
  const gen = new PMREMGenerator(renderer);
  try {
    return resMap.track(gen.fromScene(env, 0.04)).texture;
  } finally {
    env.dispose();
    gen.dispose();
  }
}

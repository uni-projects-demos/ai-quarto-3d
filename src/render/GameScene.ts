import {
  ACESFilmicToneMapping,
  type BufferGeometry,
  type CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  type InstancedMesh,
  LoadingManager,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  type MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  type Object3DEventMap,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  type SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GAME_PIECES, type PieceTraits } from "../game/pieces";
import { BOARD_SIZE, CELL_COUNT, getWinLines } from "../game/rules";
import type { Cell, Phase, PieceId } from "../game/types";
import { Cleanup } from "../shared/Cleanup";
import { GAME_THEMES, THEME_REG, type ThemeId } from "../themes";
import { createCoasterGeom } from "./flogstaCoasters";
import { type CoffeeMaterials, createCoffeeDetails } from "./flogstaCoffee";
import { createRiceGrains } from "./flogstaPieces";
import { createMossRim } from "./natureMoss";
import { PieceGeometry } from "./PieceGeometry";
import { getPresentedPieceTraits } from "./piecePresentation";
import { CanterburyAftershocks, type QuakeRotation } from "./quakeAftershocks";
import { quakeCellColourIndex } from "./quakePalette";
import { createQuakePieceDetails } from "./quakePieces";
import { createQuakeTableDetails } from "./quakeTable";
import { SceneResources } from "./SceneResources";
import { createTableGeometries, lowerTableRear, type TableGeometries } from "./tableGeometry";
import { createWoodTexture } from "./textures";
import {
  createThemeMaterials,
  MARBLE_CELL_COLS,
  QUAKE_CELL_COLS,
  type ThemeMaterials,
  VICTORIAN_CELL_COLS,
} from "./themeMaterials";
import { createVictorianPieceDetails, type VictorianCraftMaterials } from "./victorianCraft";

const BOARD_SPACE: number = 1.16;
const BOARD_ROTATION: number = Math.PI / 4;
const BOARD_ROTATION_COS: number = Math.cos(BOARD_ROTATION);
const BOARD_ROTATION_SIN: number = Math.sin(BOARD_ROTATION);
const MOBILE_ASPECT: number = 0.92;
const VIEW_POLAR_ANGLE: number = 1.25 + MathUtils.degToRad(10);
const BASE_Y: number = -0.11;
const TABLE_RADIUS: number = 12;
const TABLE_BEVEL: number = 0.06;
const TABLE_THICKNESS: number = 0.22;
const TABLE_REAR_SCALE: number = 0.78;
const CELL_TOP_Y: number = 0.02;
const ANIMATION_FACTOR: number = 0.14;
const RESERVE_SCALE: number = 0.78;
const HOVER_SCALE: number = 0.94;
const WIN_SCALE: number = 1.12;
const RESERVE_RADIUS: number = 4.65;
const RESERVE_LOWER_START: number = MathUtils.degToRad(-8);
const RESERVE_LOWER_END: number = MathUtils.degToRad(-82);
const RESERVE_UPPER_START: number = MathUtils.degToRad(82);
const RESERVE_UPPER_END: number = MathUtils.degToRad(8);
const PORTRAIT_RESERVE_START: number = MathUtils.degToRad(-127);
const PORTRAIT_RESERVE_END: number = MathUtils.degToRad(-53);

export interface SceneState {
  readonly board: readonly Cell[];
  readonly remaining: readonly PieceId[];
  readonly pendingPiece: PieceId | null;
  readonly phase: Phase;
}

interface PieceView {
  group: Group;
  body: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  inset: Mesh<BufferGeometry, MeshPhysicalMaterial> | null;
  bezel: Mesh<BufferGeometry, MeshPhysicalMaterial> | null;
  details: Group;
  quakeDetails: Group;
  rice: InstancedMesh<SphereGeometry, MeshPhysicalMaterial> | null;
  coffee: Group | null;
  target: Vector3;
  baseScale: number;
  targetScale: number;
}

type InteractiveRef = { type: "cell"; id: number } | { type: "piece"; id: PieceId };

export interface SceneCallbacks {
  readonly onCellClick: (cell: number) => void;
  readonly onPieceClick: (pc: PieceId) => void;
  readonly onPieceHover: (pc: PieceId | null) => void;
}

export class GameScene {
  private readonly cleanup: Cleanup = new Cleanup();
  private readonly resMap: SceneResources = new SceneResources();
  private readonly interactiveRefs: WeakMap<Object3D<Object3DEventMap>, InteractiveRef> =
    new WeakMap<Object3D, InteractiveRef>();
  private isDisposed: boolean = false;
  private isNeedRender: boolean = true;
  private readonly scn: Scene<Object3DEventMap> = new Scene();
  private readonly quakePivot: Group = new Group();
  private readonly tableContents: Group = new Group();
  private readonly aftershocks: CanterburyAftershocks = new CanterburyAftershocks();
  private lastFrameAt: number = 0;
  private readonly camera: PerspectiveCamera = new PerspectiveCamera(37, 1, 0.1, 100);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster: Raycaster = new Raycaster();
  private readonly ptr: Vector2 = new Vector2();
  private readonly prevSize: Vector2 = new Vector2();
  private readonly textureManager: LoadingManager = new LoadingManager();
  private readonly texturesReady: Promise<void> = new Promise<void>((resolve, reject): void => {
    this.textureManager.onLoad = (): void => resolve();
    this.textureManager.onError = (url: string): void => reject(new Error(`Could not load ${url}`));
  });
  private readonly textureLoader: TextureLoader = new TextureLoader(this.textureManager);
  private readonly previewSize: Vector2 = new Vector2();
  private previewTargets: ReadonlyMap<ThemeId, HTMLCanvasElement> | null = null;
  private readonly baseMesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly tableEdge: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly boardRingBase: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly boardRim: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly originalRimGeometry: TorusGeometry = new TorusGeometry(3.45, 0.12, 20, 132);
  private readonly natureMoss = createMossRim();
  private readonly victorianBoardDetails: Group = new Group();
  private readonly quakeTableDetails: Group = createQuakeTableDetails();
  private readonly themeMaterials: Record<ThemeId, ThemeMaterials>;
  private readonly tableGeoms: TableGeometries;
  private readonly interiorFog: Fog = new Fog(0x11161e, 18, 28);
  private readonly hemisphere: HemisphereLight = new HemisphereLight(0xfff0d8, 0x2a1e14, 0.7);
  private coffeeEnvironment: Texture | null = null;
  private activeTheme: ThemeId = "marble";
  private readonly boardCells: Mesh<CylinderGeometry, MeshPhysicalMaterial>[] = [];
  private readonly cellAccents: Mesh<TorusGeometry, MeshPhysicalMaterial | MeshBasicMaterial>[] =
    [];
  private readonly winningCellAccents: Mesh<TorusGeometry, MeshBasicMaterial>[] = [];
  private readonly winningCellAccentGeometry: TorusGeometry = new TorusGeometry(0.49, 0.025, 8, 48);
  private readonly winningHighlightMaterial: MeshBasicMaterial = new MeshBasicMaterial({
    color: THEME_REG.marble.winHighlight,
    toneMapped: false,
  });
  private readonly marbleHighlightAccent: MeshBasicMaterial = new MeshBasicMaterial({
    color: 0xbcecff,
  });
  private readonly victorianHighlightAccent: MeshBasicMaterial = new MeshBasicMaterial({
    color: 0xffe1a0,
  });
  private readonly quakeHighlightAccent: MeshBasicMaterial = new MeshBasicMaterial({
    color: 0xe84b4c,
  });
  private readonly pcs: Map<PieceId, PieceView> = new Map<PieceId, PieceView>();
  private readonly interactiveObj: Object3D[] = [];
  private readonly boardOffset: Vector3 = new Vector3();
  private readonly dirLight: DirectionalLight = new DirectionalLight(0xffddb1, 4.8);
  private readonly dirLightTarget: Object3D<Object3DEventMap> = new Object3D();
  private readonly brassMaterial: MeshStandardMaterial = new MeshStandardMaterial({
    color: 0xb48c50,
    roughness: 0.48,
    metalness: 0.55,
  });
  private readonly pieceGeometries: PieceGeometry;
  private readonly cellGeometry: CylinderGeometry = new CylinderGeometry(0.53, 0.53, 0.12, 48);
  private readonly coasterGeometry: CylinderGeometry = this.resMap.track(createCoasterGeom());
  private readonly cellAccentGeometry: TorusGeometry = new TorusGeometry(0.46, 0.012, 8, 48);
  private st: SceneState = {
    board: Array<Cell>(CELL_COUNT).fill(null),
    remaining: [],
    pendingPiece: null,
    phase: "select",
  };
  private hovered: InteractiveRef | null = null;
  private winCells: ReadonlySet<number> = new Set<number>();
  private isMobileLayout: boolean = false;
  private isSized: boolean = false;
  private readonly resizeObs: ResizeObserver;

  constructor(
    cvs: HTMLCanvasElement,
    private readonly cbs: SceneCallbacks,
  ) {
    try {
      this.renderer = new WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
      this.cleanup.add((): void => {
        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
      });
      this.cleanup.add((): void => this.resMap.dispose());
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = PCFShadowMap;

      this.controls = new OrbitControls(this.camera, cvs);
      const onChange: () => void = (): void => {
        this.isNeedRender = true;
      };
      this.controls.addEventListener("change", onChange);
      this.cleanup.add((): void => {
        this.controls.removeEventListener("change", onChange);
        this.controls.dispose();
      });
      this.pieceGeometries = new PieceGeometry(this.resMap);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 18;
      this.controls.minPolarAngle = 0.35;
      this.controls.maxPolarAngle = VIEW_POLAR_ANGLE;

      const woodTexture: CanvasTexture = createWoodTexture();
      this.themeMaterials = createThemeMaterials(
        this.loadStoneTexture.bind(this),
        woodTexture,
        this.resMap,
      );
      const tableMaterial: MeshPhysicalMaterial = this.themeMaterials.marble.table;
      this.tableGeoms = createTableGeometries(TABLE_RADIUS, TABLE_BEVEL, TABLE_THICKNESS);
      for (const geom of Object.values(this.tableGeoms)) this.resMap.track(geom);
      this.baseMesh = new Mesh(this.tableGeoms.regularTop, tableMaterial);
      this.tableEdge = new Mesh(this.tableGeoms.regularEdge, tableMaterial);
      this.lowerTableRear();
      this.boardRingBase = new Mesh(
        new CylinderGeometry(3.42, 3.48, 0.18, 96),
        this.themeMaterials.marble.board,
      );
      this.boardRim = new Mesh(this.originalRimGeometry, this.themeMaterials.marble.rim);
      this.boardRim.add(this.natureMoss.fibres);

      this.createEnv();
      this.quakePivot.add(this.tableContents);
      this.scn.add(this.quakePivot);
      this.createBoard();
      this.layoutTable();
      this.createPieces();

      const resizeTgt: HTMLElement = cvs.parentElement ?? cvs;
      this.resizeObs = new ResizeObserver(this.resize);
      this.resizeObs.observe(resizeTgt);
      this.cleanup.add((): void => this.resizeObs.disconnect());
      this.resize();

      const events = { signal: this.cleanup.signal };
      cvs.addEventListener("pointermove", this.onPointerMove, events);
      cvs.addEventListener("pointerleave", this.onPointerLeave, events);
      cvs.addEventListener("click", this.onClick, events);
      cvs.addEventListener(
        "webglcontextrestored",
        (): void => {
          this.isNeedRender = true;
        },
        events,
      );
      window.addEventListener("resize", this.resize, events);

      this.resMap.trackObject(this.scn);
      this.resMap.track(this.natureMoss.geometry);
      this.resMap.track(this.dirLight.shadow);
      this.resMap.track(this.marbleHighlightAccent);
      this.resMap.track(this.victorianHighlightAccent);
      this.resMap.track(this.quakeHighlightAccent);
      this.renderer.setAnimationLoop(this.animate);
    } catch (err) {
      this.cleanup.dispose();
      throw err;
    }
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.cleanup.dispose();
    this.scn.clear();
    this.pcs.clear();
    this.interactiveObj.length = 0;
    this.previewTargets = null;
  }

  async preloadThemes(previews: ReadonlyMap<ThemeId, HTMLCanvasElement>): Promise<void> {
    await this.texturesReady;
    this.renderThemePreviews(previews);
  }

  renderThemePreviews(previews: ReadonlyMap<ThemeId, HTMLCanvasElement>): void {
    if (this.isDisposed) return;
    this.resize();
    const src: HTMLCanvasElement = this.renderer.domElement;
    if (
      this.previewTargets === previews &&
      this.previewSize.x === src.width &&
      this.previewSize.y === src.height
    )
      return;
    const thm: "flogsta" | "marble" | "nature" | "quake" | "victorian" = this.activeTheme;
    const st: SceneState = this.st;
    this.setState({
      board: Array<Cell>(CELL_COUNT).fill(null),
      remaining: GAME_PIECES,
      pendingPiece: null,
      phase: "select",
    });
    for (const vw of this.pcs.values()) {
      vw.group.position.copy(vw.target);
      vw.group.scale.setScalar(vw.targetScale);
    }
    try {
      for (const def of GAME_THEMES) {
        const prevw: HTMLCanvasElement | undefined = previews.get(def.id);
        const ctx: CanvasRenderingContext2D | null | undefined = prevw?.getContext("2d");
        if (!prevw || !ctx) throw new Error(`Missing preview for ${def.id}`);
        this.setTheme(def.id);
        this.renderer.render(this.scn, this.camera);
        prevw.width = Math.min(src.width, 1048);
        prevw.height = Math.round(prevw.width / this.camera.aspect);
        ctx.drawImage(src, 0, 0, prevw.width, prevw.height);
      }
      this.previewTargets = previews;
      this.previewSize.set(src.width, src.height);
    } finally {
      this.setTheme(thm);
      this.setState(st);
      this.isNeedRender = true;
    }
  }

  setState(st: SceneState): void {
    if (this.isDisposed) return;
    if (
      st.pendingPiece === this.st.pendingPiece &&
      st.phase === this.st.phase &&
      st.board.length === this.st.board.length &&
      st.board.every((pc: Cell, idx: number): boolean => pc === this.st.board[idx]) &&
      st.remaining.length === this.st.remaining.length &&
      st.remaining.every((pc, idx: number): boolean => pc === this.st.remaining[idx])
    )
      return;
    this.st = { ...st, board: [...st.board], remaining: [...st.remaining] };
    this.layoutObjects();
  }

  getTheme(): ThemeId {
    return this.activeTheme;
  }

  setTheme(thm: ThemeId): void {
    if (this.isDisposed || thm === this.activeTheme) return;
    const isVictorian: boolean = thm === "victorian";
    const isNature: boolean = thm === "nature";
    const isFlogsta: boolean = thm === "flogsta";
    const isQuake: boolean = thm === "quake";
    const look: ThemeMaterials = this.themeMaterials[thm];
    this.activeTheme = thm;
    this.resetQuakeMotion();
    this.aftershocks.reset();
    this.lastFrameAt = 0;
    this.winningHighlightMaterial.color.set(THEME_REG[thm].winHighlight);
    this.baseMesh.material = look.table;
    this.tableEdge.material = look.edge;
    this.tableEdge.castShadow = isNature;
    this.baseMesh.geometry = isNature ? this.tableGeoms.natureTop : this.tableGeoms.regularTop;
    this.tableEdge.geometry = isNature ? this.tableGeoms.natureEdge : this.tableGeoms.regularEdge;
    this.layoutTable();
    this.boardRingBase.material = look.board;
    this.boardRim.material = look.rim;
    this.boardRim.visible = !isFlogsta;
    this.boardRim.geometry = isNature ? this.natureMoss.geometry : this.originalRimGeometry;
    this.natureMoss.fibres.visible = isNature;
    this.quakeTableDetails.visible = isQuake;
    for (const [cell, mesh] of this.boardCells.entries()) {
      mesh.geometry = isFlogsta ? this.coasterGeometry : this.cellGeometry;
      mesh.rotation.y = isFlogsta ? Math.sin(cell * 7.13) * 0.18 : 0;
      mesh.material = look.cells[cell] ?? mesh.material;
      const accent: Mesh<TorusGeometry, MeshBasicMaterial | MeshPhysicalMaterial> | undefined =
        this.cellAccents[cell];
      if (accent) accent.material = look.accent;
    }
    for (const [pc, vw] of this.pcs) {
      const { body, details: dtls, quakeDetails, inset, bezel, rice, coffee } = vw;
      const traits: PieceTraits = getPresentedPieceTraits(pc);
      body.geometry = isQuake
        ? this.pieceGeometries.getQuakeBodyGeometry(pc, traits)
        : isFlogsta && traits.isDark
          ? this.pieceGeometries.getCoffeeBodyGeometry(pc, traits)
          : isVictorian
            ? this.pieceGeometries.getVictorianBodyGeometry(pc, traits)
            : this.pieceGeometries.getMarbleBodyGeometry(pc, traits);
      body.material = isQuake
        ? (look.quakeBodies?.[pc] ?? look.pieces.darkBody)
        : traits.isDark
          ? look.pieces.darkBody
          : look.pieces.redBody;
      if (inset) {
        inset.material = isQuake
          ? (look.quakeInsets?.[pc] ?? look.hollowDark)
          : traits.isDark
            ? look.hollowDark
            : look.hollowLight;
        inset.position.y =
          (traits.isBig ? 1.45 : 0.9) - (isFlogsta ? (traits.isDark ? 0.126 : 0.014) : 0.103);
      }
      if (bezel) {
        bezel.visible = !isNature && !isFlogsta && !isQuake;
        bezel.material = look.accent;
      }
      dtls.visible = isVictorian;
      quakeDetails.visible = isQuake;
      if (rice) rice.visible = isFlogsta;
      if (coffee) coffee.visible = isFlogsta;
    }
    this.victorianBoardDetails.visible = isVictorian;
    this.scn.fog = isFlogsta ? null : this.interiorFog;
    this.scn.environment = isFlogsta ? this.getCoffeeEnvironment() : null;
    this.scn.environmentIntensity = isFlogsta ? 0.22 : 1;
    this.renderer.toneMapping = isFlogsta ? ACESFilmicToneMapping : NoToneMapping;
    this.hemisphere.color.setHex(isFlogsta ? 0xe1f3ff : isQuake ? 0xdfe7f1 : 0xfff0d8);
    this.hemisphere.groundColor.setHex(isFlogsta ? 0x66664e : isQuake ? 0x484348 : 0x2a1e14);
    this.hemisphere.intensity = isFlogsta ? 1.8 : isQuake ? 1.18 : 0.7;
    this.dirLight.color.setHex(isFlogsta ? 0xfff4de : isQuake ? 0xe3e6ed : 0xffddb1);
    this.dirLight.intensity = isFlogsta ? 3 : isQuake ? 3.25 : 4.8;
    this.updateHighlights();
  }

  private createEnv(): void {
    this.scn.background = null;
    this.scn.fog = this.interiorFog;

    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -12;
    this.dirLight.shadow.camera.right = 12;
    this.dirLight.shadow.camera.top = 12;
    this.dirLight.shadow.camera.bottom = -12;
    this.dirLight.shadow.bias = -0.00015;
    this.dirLight.target = this.dirLightTarget;

    this.scn.add(this.hemisphere, this.dirLight, this.dirLightTarget);
  }

  private createBoard(): void {
    this.baseMesh.rotation.x = -Math.PI / 2;
    this.baseMesh.position.y = BASE_Y;
    this.baseMesh.receiveShadow = true;
    this.tableEdge.position.y = BASE_Y;
    this.tableEdge.receiveShadow = true;

    this.boardRingBase.castShadow = true;
    this.boardRingBase.receiveShadow = true;

    this.boardRim.rotation.x = Math.PI / 2;
    this.boardRim.castShadow = true;
    this.boardRim.receiveShadow = true;

    this.tableContents.add(this.baseMesh, this.tableEdge, this.boardRingBase, this.boardRim);
    this.tableContents.add(this.quakeTableDetails);

    for (let cell: number = 0; cell < CELL_COUNT; cell += 1) {
      const mesh = new Mesh(this.cellGeometry, this.themeMaterials.marble.cells[cell]);

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.interactiveRefs.set(mesh, { type: "cell", id: cell });

      const accent = new Mesh(this.cellAccentGeometry, this.themeMaterials.marble.accent);
      accent.rotation.x = Math.PI / 2;
      accent.position.y = 0.064;
      accent.receiveShadow = true;
      accent.raycast = (): void => {};
      mesh.add(accent);
      this.cellAccents.push(accent);

      const winningAccent: Mesh<TorusGeometry, MeshBasicMaterial> = new Mesh(
        this.winningCellAccentGeometry,
        this.winningHighlightMaterial,
      );
      winningAccent.rotation.x = Math.PI / 2;
      winningAccent.position.y = 0.09;
      winningAccent.visible = false;
      winningAccent.raycast = (): void => {};
      mesh.add(winningAccent);
      this.winningCellAccents.push(winningAccent);

      this.boardCells.push(mesh);
      this.interactiveObj.push(mesh);
      this.tableContents.add(mesh);
    }
    this.createVictorianBoardDetails();
  }

  private createVictorianBoardDetails(): void {
    this.victorianBoardDetails.visible = false;
    for (const rad of [3.12, 3.24]) {
      const ring = new Mesh(new TorusGeometry(rad, 0.012, 8, 96), this.brassMaterial);
      ring.rotation.x = Math.PI / 2;
      this.victorianBoardDetails.add(ring);
    }
    for (let corner: number = 0; corner < 4; corner += 1) {
      const ang: number = (corner * Math.PI) / 2;
      const ornament = new Mesh(new TorusGeometry(0.07, 0.012, 8, 24), this.brassMaterial);
      ornament.rotation.x = Math.PI / 2;
      ornament.position.set(Math.cos(ang) * 3.18, 0, Math.sin(ang) * 3.18);
      this.victorianBoardDetails.add(ornament);
    }
    this.tableContents.add(this.victorianBoardDetails);
  }

  private createPieces(): void {
    for (const pc of GAME_PIECES) {
      const vw: PieceView = this.makePiece(pc);
      const group: Group = vw.group;
      this.pcs.set(pc, vw);
      this.interactiveObj.push(group);
      this.tableContents.add(group);
    }
  }

  private makePiece(pc: PieceId): PieceView {
    const traits: PieceTraits = getPresentedPieceTraits(pc);
    const group = new Group();
    const interactive: InteractiveRef = {
      type: "piece",
      id: pc,
    } satisfies InteractiveRef;
    const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
    this.interactiveRefs.set(group, interactive);

    const body = new Mesh(
      this.pieceGeometries.getMarbleBodyGeometry(pc, traits),
      traits.isDark
        ? this.themeMaterials.marble.pieces.darkBody
        : this.themeMaterials.marble.pieces.redBody,
    );
    body.name = "piece-body";
    body.position.y = hgt / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.interactiveRefs.set(body, interactive);
    group.add(body);

    let inset: PieceView["inset"] = null;
    let bezel: PieceView["bezel"] = null;
    if (!traits.isSolid) {
      const look: ThemeMaterials = this.themeMaterials.marble;
      inset = new Mesh(
        traits.isRound
          ? new CylinderGeometry(0.201, 0.201, 0.018, 32)
          : new RoundedBoxGeometry(0.397, 0.018, 0.397, 3, 0.008),
        traits.isDark ? look.hollowDark : look.hollowLight,
      );
      inset.name = "hollow-inset";
      inset.position.y = hgt - 0.103;
      inset.receiveShadow = true;
      this.interactiveRefs.set(inset, interactive);
      group.add(inset);
      bezel = new Mesh(
        traits.isRound
          ? new TorusGeometry(0.215, 0.011, 8, 48)
          : this.pieceGeometries.createSquareBezel(),
        look.accent,
      );
      bezel.name = "hollow-bezel";
      if (traits.isRound) bezel.rotation.x = Math.PI / 2;
      bezel.position.y = hgt - 0.014;
      bezel.receiveShadow = true;
      bezel.raycast = (): void => {};
      group.add(bezel);
    }
    const craft: VictorianCraftMaterials | undefined = this.themeMaterials.victorian.craft;
    if (!craft) throw new Error("Victorian craft materials are missing");
    const dtls: Group = createVictorianPieceDetails(traits, hgt, craft);
    group.add(dtls);
    const quakeDetails: Group = createQuakePieceDetails(traits, pc);
    group.add(quakeDetails);
    const rice: InstancedMesh<SphereGeometry, MeshPhysicalMaterial> | null = traits.isDark
      ? null
      : createRiceGrains(
          body.geometry,
          traits,
          this.themeMaterials.flogsta.pieces.redBody,
          this.pieceGeometries.riceGrainGeometry,
        );
    if (rice) group.add(rice);
    const coffeeMats: CoffeeMaterials | undefined = this.themeMaterials.flogsta.coffee;
    if (!coffeeMats) throw new Error("Coffee materials are missing");
    const coffee: Group | null = traits.isDark ? createCoffeeDetails(traits, coffeeMats) : null;
    if (coffee) group.add(coffee);
    return {
      group,
      body,
      inset,
      bezel,
      details: dtls,
      quakeDetails,
      rice,
      coffee,
      target: new Vector3(),
      baseScale: 1,
      targetScale: 1,
    };
  }

  private lowerTableRear(): void {
    lowerTableRear(this.tableGeoms, TABLE_REAR_SCALE);
  }

  private layoutTable(): void {
    this.baseMesh.scale.setScalar(1);
    this.tableEdge.scale.setScalar(1);
    this.baseMesh.position.copy(this.boardOffset).setY(BASE_Y);
    this.tableEdge.position.copy(this.baseMesh.position);
  }

  private layoutObjects(): void {
    this.boardOffset.set(this.isMobileLayout ? 0 : -1.35, 0, this.isMobileLayout ? -1.1 : 0);
    this.quakePivot.position.copy(this.boardOffset).setY(BASE_Y);
    this.tableContents.position.copy(this.quakePivot.position).negate();
    this.layoutTable();
    this.boardRingBase.position.copy(this.boardOffset).setY(BASE_Y + 0.01);
    this.boardRim.position.copy(this.boardOffset).setY(BASE_Y + 0.08);
    this.victorianBoardDetails.position.copy(this.boardOffset).setY(BASE_Y + 0.115);
    this.quakeTableDetails.position.copy(this.boardOffset).setY(BASE_Y + 0.008);

    for (const [cell, mesh] of this.boardCells.entries()) {
      const row: number = Math.floor(cell / BOARD_SIZE);
      const col: number = cell % BOARD_SIZE;
      const x: number = (col - 1.5) * BOARD_SPACE;
      const z: number = (row - 1.5) * BOARD_SPACE;

      mesh.position.set(
        this.boardOffset.x + x * BOARD_ROTATION_COS - z * BOARD_ROTATION_SIN,
        BASE_Y + 0.07,
        this.boardOffset.z + x * BOARD_ROTATION_SIN + z * BOARD_ROTATION_COS,
      );
    }

    const winCells: Set<number> = new Set<number>();
    for (const winLine of getWinLines(this.st.board)) {
      for (const cell of winLine) winCells.add(cell);
    }
    this.winCells = winCells;
    const rem = new Set(this.st.remaining);
    const pieceCells = new Map<PieceId, number>();
    for (const [cell, pc] of this.st.board.entries()) {
      if (pc !== null) pieceCells.set(pc, cell);
    }

    for (const pc of GAME_PIECES) {
      const vw: PieceView | undefined = this.pcs.get(pc);
      if (!vw) continue;

      const boardCell: number | undefined = pieceCells.get(pc);
      if (boardCell !== undefined) {
        const cellMesh: Mesh<CylinderGeometry, MeshPhysicalMaterial> | undefined =
          this.boardCells[boardCell];
        if (!cellMesh) continue;

        this.setPieceTarget(
          vw,
          cellMesh.position.x,
          CELL_TOP_Y,
          cellMesh.position.z,
          winCells.has(boardCell) ? WIN_SCALE : 1,
        );
      } else if (this.st.pendingPiece === pc) {
        this.setPieceTarget(
          vw,
          this.isMobileLayout ? 2.95 : 5.25,
          BASE_Y,
          this.isMobileLayout ? 2.0 : 0,
          WIN_SCALE,
        );
      } else if (rem.has(pc)) {
        this.layoutReservePiece(pc, vw);
      } else {
        vw.group.visible = false;
      }
    }
    this.updateHighlights(rem);
  }

  private layoutReservePiece(pc: PieceId, vw: PieceView): void {
    const upper: boolean = pc < 8;
    const sideIdx: number = upper ? pc : pc - 8;
    const prog: number = sideIdx / 7;
    const ang: number = this.isMobileLayout
      ? MathUtils.lerp(PORTRAIT_RESERVE_START, PORTRAIT_RESERVE_END, prog)
      : (upper
          ? MathUtils.lerp(RESERVE_UPPER_START, RESERVE_UPPER_END, prog)
          : MathUtils.lerp(RESERVE_LOWER_START, RESERVE_LOWER_END, prog)) -
        Math.PI / 2;
    const rad: number = this.isMobileLayout
      ? upper
        ? 6.1
        : 4.75
      : RESERVE_RADIUS + (upper ? 0.04 : -0.04);

    this.setPieceTarget(
      vw,
      this.boardOffset.x + Math.cos(ang) * rad,
      BASE_Y,
      this.boardOffset.z + Math.sin(ang) * rad,
      RESERVE_SCALE,
    );
  }

  private setPieceTarget(vw: PieceView, x: number, y: number, z: number, scale: number): void {
    vw.target.set(x, y, z);
    vw.baseScale = scale;
    vw.targetScale = scale;
    vw.group.visible = true;
  }

  private updateHighlights(rem = new Set(this.st.remaining)): void {
    this.isNeedRender = true;
    for (const [cell, mesh] of this.boardCells.entries()) {
      const winningAccent: Mesh<TorusGeometry, MeshBasicMaterial> | undefined =
        this.winningCellAccents[cell];
      if (winningAccent)
        winningAccent.visible = this.st.phase === "finished" && this.winCells.has(cell);
      const mat: MeshPhysicalMaterial = mesh.material;
      const interactive: boolean = this.st.phase === "place" && this.st.board[cell] === null;
      const hovered: boolean =
        interactive && this.hovered?.type === "cell" && this.hovered.id === cell;

      const accent: Mesh<TorusGeometry, MeshBasicMaterial | MeshPhysicalMaterial> | undefined =
        this.cellAccents[cell];
      if (accent) {
        accent.visible = this.activeTheme !== "flogsta" && this.st.board[cell] === null;
        accent.material =
          this.activeTheme === "marble" && hovered
            ? this.marbleHighlightAccent
            : this.activeTheme === "victorian" && hovered
              ? this.victorianHighlightAccent
              : this.activeTheme === "quake" && hovered
                ? this.quakeHighlightAccent
                : this.themeMaterials[this.activeTheme].accent;
        accent.scale.setScalar(this.activeTheme !== "nature" && hovered ? 1.05 : 1);
      }
      if (this.activeTheme === "marble") {
        mat.color.setHex(
          hovered ? 0x297d94 : interactive ? 0x849f9e : MARBLE_CELL_COLS[cell % 2 === 0 ? 0 : 1],
        );
        mat.emissive.setHex(hovered ? 0x088c9f : interactive ? 0x09374e : 0x000000);
        mat.emissiveIntensity = hovered ? 0.75 : interactive ? 0.65 : 0;
      } else if (this.activeTheme === "victorian") {
        mat.color.setHex(
          hovered ? 0xffe9b4 : interactive ? 0xefd5a7 : VICTORIAN_CELL_COLS[cell % 2 === 0 ? 0 : 1],
        );
        mat.emissive.setHex(hovered ? 0x644014 : interactive ? 0x211609 : 0x000000);
        mat.emissiveIntensity = hovered ? 0.75 : interactive ? 0.3 : 0;
      } else if (this.activeTheme === "quake") {
        mat.color.setHex(hovered ? 0xe34b50 : QUAKE_CELL_COLS[quakeCellColourIndex(cell)]);
        mat.emissive.setHex(hovered ? 0x5a1017 : interactive ? 0x22080b : 0x000000);
        mat.emissiveIntensity = hovered ? 0.62 : interactive ? 0.17 : 0;
      } else if (this.activeTheme === "flogsta") {
        mat.emissive.setHex(hovered ? 0xa9b9b2 : interactive ? 0x34433e : 0x000000);
        mat.emissiveIntensity = hovered ? 0.35 : interactive ? 0.12 : 0;
      } else {
        mat.emissive.setHex(hovered ? 0x317362 : interactive ? 0x123b32 : 0x000000);
        mat.emissiveIntensity = hovered ? 1.5 : interactive ? 0.9 : 0;
      }
    }

    for (const [pc, vw] of this.pcs) {
      vw.targetScale = vw.baseScale;
      if (
        this.st.phase === "select" &&
        rem.has(pc) &&
        this.hovered?.type === "piece" &&
        this.hovered.id === pc
      ) {
        vw.targetScale = Math.max(vw.baseScale, HOVER_SCALE);
      }
    }
  }

  private findInteractive(obj: Object3D): InteractiveRef | null {
    for (let cur: Object3D | null = obj; cur; cur = cur.parent) {
      const ref: InteractiveRef | undefined = this.interactiveRefs.get(cur);
      if (ref) return ref;
    }
    return null;
  }

  private isInteractive(ref: InteractiveRef): boolean {
    return ref.type === "cell"
      ? this.st.phase === "place" && this.st.board[ref.id] === null
      : this.st.phase === "select" && this.st.remaining.includes(ref.id);
  }

  private pick(evt: MouseEvent): InteractiveRef | null {
    const rect: DOMRect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.ptr.set(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ptr, this.camera);

    for (const hit of this.raycaster.intersectObjects(this.interactiveObj, true)) {
      const ref: InteractiveRef | null = this.findInteractive(hit.object);
      if (ref && this.isInteractive(ref)) return ref;
    }
    return null;
  }

  private readonly onPointerMove: (evt: PointerEvent) => void = (evt: PointerEvent): void => {
    const nxt: InteractiveRef | null = this.pick(evt);
    if (nxt?.type === this.hovered?.type && nxt?.id === this.hovered?.id) return;

    this.hovered = nxt;
    this.renderer.domElement.style.cursor = nxt ? "pointer" : "grab";
    this.cbs.onPieceHover(nxt?.type === "piece" ? nxt.id : null);
    this.updateHighlights();
  };

  private readonly onPointerLeave: () => void = (): void => {
    this.hovered = null;
    this.cbs.onPieceHover(null);
    this.renderer.domElement.style.cursor = "grab";
    this.updateHighlights();
  };

  private readonly onClick: (evt: MouseEvent) => void = (evt: MouseEvent): void => {
    const ref: InteractiveRef | null = this.pick(evt);
    if (ref?.type === "cell") this.cbs.onCellClick(ref.id);
    else if (ref?.type === "piece") this.cbs.onPieceClick(ref.id);
  };

  private readonly resize: () => void = (): void => {
    if (this.isDisposed) return;
    const cvs: HTMLCanvasElement = this.renderer.domElement;
    const resizeTgt: HTMLElement = cvs.parentElement ?? cvs;
    const wdt: number = Math.max(1, resizeTgt.clientWidth);
    const hgt: number = Math.max(1, resizeTgt.clientHeight);
    const pixelRatio: number = Math.min(window.devicePixelRatio, 2);
    this.renderer.getSize(this.prevSize);
    if (
      this.isSized &&
      this.prevSize.x === wdt &&
      this.prevSize.y === hgt &&
      this.renderer.getPixelRatio() === pixelRatio
    )
      return;
    const aspect: number = wdt / hgt;
    const isNxtMobileLayout: boolean = aspect < MOBILE_ASPECT;
    const isLayoutChange: boolean = !this.isSized || isNxtMobileLayout !== this.isMobileLayout;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(wdt, hgt, false);
    this.camera.aspect = aspect;
    this.camera.fov = isNxtMobileLayout ? 50 : 37;
    this.isMobileLayout = isNxtMobileLayout;

    if (isLayoutChange) {
      if (this.isMobileLayout) {
        this.camera.position.set(0, 6.8, 15.9);
        this.controls.target.set(0, 1.2, -1.1);
      } else {
        this.camera.position.set(-1.35, 7.2, 16.2);
        this.controls.target.set(-1.35, 1.25, -0.5);
      }
      const ofs: Vector3 = this.camera.position.clone().sub(this.controls.target);
      ofs.setFromSphericalCoords(ofs.length(), VIEW_POLAR_ANGLE, 0);
      this.camera.position.copy(this.controls.target).add(ofs);
      this.layoutObjects();
    }

    this.isSized = true;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.dirLight.position.copy(this.camera.position);
    this.isNeedRender = true;
  };

  private resetQuakeMotion(): void {
    this.quakePivot.rotation.set(0, 0, 0);
    for (const vw of this.pcs.values()) vw.group.rotation.set(0, 0, 0);
    this.isNeedRender = true;
  }

  private readonly animate: () => void = (): void => {
    if (this.isDisposed) return;
    const now: number = performance.now();
    const elapsed: number = this.lastFrameAt === 0 ? 0 : (now - this.lastFrameAt) / 1000;
    this.lastFrameAt = now;
    this.isNeedRender = this.controls.update() || this.isNeedRender;
    this.dirLight.position.copy(this.camera.position);
    if (this.activeTheme === "quake") {
      const motion: QuakeRotation = this.aftershocks.step(elapsed);
      if (
        this.quakePivot.rotation.x !== motion.pitch ||
        this.quakePivot.rotation.z !== motion.roll ||
        this.quakePivot.rotation.y !== motion.yaw
      ) {
        this.quakePivot.rotation.set(motion.pitch, motion.yaw, motion.roll);
        this.isNeedRender = true;
      }
      for (const [pc, vw] of this.pcs) {
        const wobble: QuakeRotation = this.aftershocks.pieceWobble(pc);
        if (vw.group.rotation.x !== wobble.pitch || vw.group.rotation.z !== wobble.roll) {
          vw.group.rotation.set(wobble.pitch, 0, wobble.roll);
          this.isNeedRender = true;
        }
      }
    }
    for (const vw of this.pcs.values()) {
      if (!vw.group.visible) continue;

      const isMoving: boolean =
        vw.group.position.distanceToSquared(vw.target) > 1e-12 ||
        Math.abs(vw.group.scale.x - vw.targetScale) > 1e-6;
      if (isMoving) {
        vw.group.position.lerp(vw.target, ANIMATION_FACTOR);
        vw.group.scale.setScalar(
          MathUtils.lerp(vw.group.scale.x, vw.targetScale, ANIMATION_FACTOR),
        );
        this.isNeedRender = true;
      } else if (!vw.group.position.equals(vw.target) || vw.group.scale.x !== vw.targetScale) {
        vw.group.position.copy(vw.target);
        vw.group.scale.setScalar(vw.targetScale);
        this.isNeedRender = true;
      }
    }
    if (!this.isNeedRender) return;
    this.renderer.render(this.scn, this.camera);
    this.isNeedRender = false;
  };

  private getCoffeeEnvironment(): Texture {
    if (this.coffeeEnvironment) return this.coffeeEnvironment;
    const env = new RoomEnvironment();
    const gen = new PMREMGenerator(this.renderer);
    try {
      this.coffeeEnvironment = this.resMap.track(gen.fromScene(env, 0.04)).texture;
      return this.coffeeEnvironment;
    } finally {
      env.dispose();
      gen.dispose();
    }
  }

  private loadStoneTexture(url: string): Texture {
    const tex: Texture = this.textureLoader.load(url, (): void => {
      if (!this.isDisposed) this.isNeedRender = true;
    });
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return this.resMap.track(tex);
  }
}

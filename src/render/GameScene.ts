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
import { GAME_THEMES, type ThemeId } from "../themes";
import { createCoasterGeom } from "./flogstaCoasters";
import { createCoffeeDetails } from "./flogstaCoffee";
import { createRiceGrains } from "./flogstaPieces";
import { createMossRim } from "./natureMoss";
import { PieceGeometry } from "./PieceGeometry";
import { getPresentedPieceTraits } from "./piecePresentation";
import { SceneResources } from "./SceneResources";
import { createTableGeometries, lowerTableRear, type TableGeometries } from "./tableGeometry";
import { createWoodTexture } from "./textures";
import {
  createThemeMaterials,
  MARBLE_CELL_COLS,
  type ThemeMaterials,
  VICTORIAN_CELL_COLS,
} from "./themeMaterials";
import { createVictorianPieceDetails } from "./victorianCraft";

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
  rice: InstancedMesh<SphereGeometry, MeshPhysicalMaterial> | null;
  coffee: Group | null;
  target: Vector3;
  baseScale: number;
  targetScale: number;
}

type InteractiveRef = { type: "cell"; id: number } | { type: "piece"; id: PieceId };

export interface SceneCallbacks {
  readonly onCellClick: (cell: number) => void;
  readonly onPieceClick: (piece: PieceId) => void;
  readonly onPieceHover: (piece: PieceId | null) => void;
}

export class GameScene {
  private readonly cleanup = new Cleanup();
  private readonly resources = new SceneResources();
  private readonly interactiveRefs = new WeakMap<Object3D, InteractiveRef>();
  private isDisposed = false;
  private needsRender = true;
  private readonly scene: Scene<Object3DEventMap> = new Scene();
  private readonly camera: PerspectiveCamera = new PerspectiveCamera(37, 1, 0.1, 100);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster: Raycaster = new Raycaster();
  private readonly pointer: Vector2 = new Vector2();
  private readonly prevSize = new Vector2();
  private readonly textureManager = new LoadingManager();
  private readonly texturesReady = new Promise<void>((resolve, reject): void => {
    this.textureManager.onLoad = (): void => resolve();
    this.textureManager.onError = (url: string): void => reject(new Error(`Could not load ${url}`));
  });
  private readonly textureLoader = new TextureLoader(this.textureManager);
  private readonly previewSize = new Vector2();
  private previewTargets: ReadonlyMap<ThemeId, HTMLCanvasElement> | null = null;
  private readonly baseMesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly tableEdge: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly boardRingBase: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly boardRim: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly originalRimGeometry = new TorusGeometry(3.45, 0.12, 20, 132);
  private readonly natureMoss = createMossRim();
  private readonly victorianBoardDetails: Group = new Group();
  private readonly themeMaterials: Record<ThemeId, ThemeMaterials>;
  private readonly tableGeometries: TableGeometries;
  private readonly interiorFog = new Fog(0x11161e, 18, 28);
  private readonly hemisphere = new HemisphereLight(0xfff0d8, 0x2a1e14, 0.7);
  private coffeeEnvironment: Texture | null = null;
  private activeTheme: ThemeId = "marble";
  private readonly boardCells: Mesh<CylinderGeometry, MeshPhysicalMaterial>[] = [];
  private readonly cellAccents: Mesh<TorusGeometry, MeshPhysicalMaterial | MeshBasicMaterial>[] =
    [];
  private readonly marbleHighlightAccent = new MeshBasicMaterial({ color: 0xbcecff });
  private readonly victorianHighlightAccent = new MeshBasicMaterial({ color: 0xffe1a0 });
  private readonly pieces: Map<PieceId, PieceView> = new Map<PieceId, PieceView>();
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
  private readonly cellGeometry = new CylinderGeometry(0.53, 0.53, 0.12, 48);
  private readonly coasterGeometry = this.resources.track(createCoasterGeom());
  private readonly cellAccentGeometry = new TorusGeometry(0.46, 0.012, 8, 48);
  private state: SceneState = {
    board: Array<Cell>(CELL_COUNT).fill(null),
    remaining: [],
    pendingPiece: null,
    phase: "select",
  };
  private hovered: InteractiveRef | null = null;
  private mobileLayout: boolean = false;
  private isSized: boolean = false;
  private readonly resizeObs: ResizeObserver;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly callbacks: SceneCallbacks,
  ) {
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.cleanup.add((): void => {
        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
      });
      this.cleanup.add((): void => this.resources.dispose());
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = PCFShadowMap;

      this.controls = new OrbitControls(this.camera, canvas);
      const onChange = (): void => {
        this.needsRender = true;
      };
      this.controls.addEventListener("change", onChange);
      this.cleanup.add((): void => {
        this.controls.removeEventListener("change", onChange);
        this.controls.dispose();
      });
      this.pieceGeometries = new PieceGeometry(this.resources);
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
        this.resources,
      );
      const tableMaterial = this.themeMaterials.marble.table;
      this.tableGeometries = createTableGeometries(TABLE_RADIUS, TABLE_BEVEL, TABLE_THICKNESS);
      for (const geometry of Object.values(this.tableGeometries)) this.resources.track(geometry);
      this.baseMesh = new Mesh(this.tableGeometries.regularTop, tableMaterial);
      this.tableEdge = new Mesh(this.tableGeometries.regularEdge, tableMaterial);
      this.lowerTableRear();
      this.boardRingBase = new Mesh(
        new CylinderGeometry(3.42, 3.48, 0.18, 96),
        this.themeMaterials.marble.board,
      );
      this.boardRim = new Mesh(this.originalRimGeometry, this.themeMaterials.marble.rim);
      this.boardRim.add(this.natureMoss.fibres);

      this.createEnv();
      this.createBoard();
      this.layoutTable();
      this.createPieces();

      const resizeTarget: HTMLElement = canvas.parentElement ?? canvas;
      this.resizeObs = new ResizeObserver(this.resize);
      this.resizeObs.observe(resizeTarget);
      this.cleanup.add((): void => this.resizeObs.disconnect());
      this.resize();

      const events = { signal: this.cleanup.signal };
      canvas.addEventListener("pointermove", this.onPointerMove, events);
      canvas.addEventListener("pointerleave", this.onPointerLeave, events);
      canvas.addEventListener("click", this.onClick, events);
      canvas.addEventListener(
        "webglcontextrestored",
        (): void => {
          this.needsRender = true;
        },
        events,
      );
      window.addEventListener("resize", this.resize, events);

      this.resources.trackObject(this.scene);
      this.resources.track(this.natureMoss.geometry);
      this.resources.track(this.dirLight.shadow);
      this.resources.track(this.marbleHighlightAccent);
      this.resources.track(this.victorianHighlightAccent);
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
    this.scene.clear();
    this.pieces.clear();
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
    const src = this.renderer.domElement;
    if (
      this.previewTargets === previews &&
      this.previewSize.x === src.width &&
      this.previewSize.y === src.height
    )
      return;
    const theme = this.activeTheme;
    const state = this.state;
    this.setState({
      board: Array<Cell>(CELL_COUNT).fill(null),
      remaining: GAME_PIECES,
      pendingPiece: null,
      phase: "select",
    });
    for (const view of this.pieces.values()) {
      view.group.position.copy(view.target);
      view.group.scale.setScalar(view.targetScale);
    }
    try {
      for (const def of GAME_THEMES) {
        const preview = previews.get(def.id);
        const context = preview?.getContext("2d");
        if (!preview || !context) throw new Error(`Missing preview for ${def.id}`);
        this.setTheme(def.id);
        this.renderer.render(this.scene, this.camera);
        preview.width = Math.min(src.width, 1048);
        preview.height = Math.round(preview.width / this.camera.aspect);
        context.drawImage(src, 0, 0, preview.width, preview.height);
      }
      this.previewTargets = previews;
      this.previewSize.set(src.width, src.height);
    } finally {
      this.setTheme(theme);
      this.setState(state);
      this.needsRender = true;
    }
  }

  setState(state: SceneState): void {
    if (this.isDisposed) return;
    if (
      state.pendingPiece === this.state.pendingPiece &&
      state.phase === this.state.phase &&
      state.board.length === this.state.board.length &&
      state.board.every((piece, idx) => piece === this.state.board[idx]) &&
      state.remaining.length === this.state.remaining.length &&
      state.remaining.every((piece, idx) => piece === this.state.remaining[idx])
    )
      return;
    this.state = { ...state, board: [...state.board], remaining: [...state.remaining] };
    this.layoutObjects();
  }

  getTheme(): ThemeId {
    return this.activeTheme;
  }

  setTheme(theme: ThemeId): void {
    if (this.isDisposed || theme === this.activeTheme) return;
    const isVictorian: boolean = theme === "victorian";
    const isNature: boolean = theme === "nature";
    const isFlogsta: boolean = theme === "flogsta";
    const look = this.themeMaterials[theme];
    this.activeTheme = theme;
    this.baseMesh.material = look.table;
    this.tableEdge.material = look.edge;
    this.tableEdge.castShadow = isNature;
    this.baseMesh.geometry = isNature
      ? this.tableGeometries.natureTop
      : this.tableGeometries.regularTop;
    this.tableEdge.geometry = isNature
      ? this.tableGeometries.natureEdge
      : this.tableGeometries.regularEdge;
    this.layoutTable();
    this.boardRingBase.material = look.board;
    this.boardRim.material = look.rim;
    this.boardRim.visible = !isFlogsta;
    this.boardRim.geometry = isNature ? this.natureMoss.geometry : this.originalRimGeometry;
    this.natureMoss.fibres.visible = isNature;
    for (const [cell, mesh] of this.boardCells.entries()) {
      mesh.geometry = isFlogsta ? this.coasterGeometry : this.cellGeometry;
      mesh.rotation.y = isFlogsta ? Math.sin(cell * 7.13) * 0.18 : 0;
      mesh.material = look.cells[cell] ?? mesh.material;
      const accent = this.cellAccents[cell];
      if (accent) accent.material = look.accent;
    }
    for (const [piece, view] of this.pieces) {
      const { body, details, inset, bezel, rice, coffee } = view;
      const traits: PieceTraits = getPresentedPieceTraits(piece);
      body.geometry =
        isFlogsta && traits.isDark
          ? this.pieceGeometries.getCoffeeBodyGeometry(piece, traits)
          : isVictorian
            ? this.pieceGeometries.getVictorianBodyGeometry(piece, traits)
            : this.pieceGeometries.getMarbleBodyGeometry(piece, traits);
      body.material = traits.isDark ? look.pieces.darkBody : look.pieces.redBody;
      if (inset) {
        inset.material = traits.isDark ? look.hollowDark : look.hollowLight;
        inset.position.y =
          (traits.isBig ? 1.45 : 0.9) - (isFlogsta ? (traits.isDark ? 0.126 : 0.014) : 0.103);
      }
      if (bezel) {
        bezel.visible = !isNature && !isFlogsta;
        bezel.material = look.accent;
      }
      details.visible = isVictorian;
      if (rice) rice.visible = isFlogsta;
      if (coffee) coffee.visible = isFlogsta;
    }
    this.victorianBoardDetails.visible = isVictorian;
    this.scene.fog = isFlogsta ? null : this.interiorFog;
    this.scene.environment = isFlogsta ? this.getCoffeeEnvironment() : null;
    this.scene.environmentIntensity = isFlogsta ? 0.22 : 1;
    this.renderer.toneMapping = isFlogsta ? ACESFilmicToneMapping : NoToneMapping;
    this.hemisphere.color.setHex(isFlogsta ? 0xe1f3ff : 0xfff0d8);
    this.hemisphere.groundColor.setHex(isFlogsta ? 0x66664e : 0x2a1e14);
    this.hemisphere.intensity = isFlogsta ? 1.8 : 0.7;
    this.dirLight.color.setHex(isFlogsta ? 0xfff4de : 0xffddb1);
    this.dirLight.intensity = isFlogsta ? 3 : 4.8;
    this.updateHighlights();
  }

  private createEnv(): void {
    this.scene.background = null;
    this.scene.fog = this.interiorFog;

    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -12;
    this.dirLight.shadow.camera.right = 12;
    this.dirLight.shadow.camera.top = 12;
    this.dirLight.shadow.camera.bottom = -12;
    this.dirLight.shadow.bias = -0.00015;
    this.dirLight.target = this.dirLightTarget;

    this.scene.add(this.hemisphere, this.dirLight, this.dirLightTarget);
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

    this.scene.add(this.baseMesh, this.tableEdge, this.boardRingBase, this.boardRim);

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

      this.boardCells.push(mesh);
      this.interactiveObj.push(mesh);
      this.scene.add(mesh);
    }
    this.createVictorianBoardDetails();
  }

  private createVictorianBoardDetails(): void {
    this.victorianBoardDetails.visible = false;
    for (const radius of [3.12, 3.24]) {
      const ring = new Mesh(new TorusGeometry(radius, 0.012, 8, 96), this.brassMaterial);
      ring.rotation.x = Math.PI / 2;
      this.victorianBoardDetails.add(ring);
    }
    for (let corner: number = 0; corner < 4; corner += 1) {
      const angle: number = (corner * Math.PI) / 2;
      const ornament = new Mesh(new TorusGeometry(0.07, 0.012, 8, 24), this.brassMaterial);
      ornament.rotation.x = Math.PI / 2;
      ornament.position.set(Math.cos(angle) * 3.18, 0, Math.sin(angle) * 3.18);
      this.victorianBoardDetails.add(ornament);
    }
    this.scene.add(this.victorianBoardDetails);
  }

  private createPieces(): void {
    for (const piece of GAME_PIECES) {
      const view = this.makePiece(piece);
      const group = view.group;
      this.pieces.set(piece, view);
      this.interactiveObj.push(group);
      this.scene.add(group);
    }
  }

  private makePiece(piece: PieceId): PieceView {
    const traits: PieceTraits = getPresentedPieceTraits(piece);
    const group = new Group();
    const interactive: InteractiveRef = {
      type: "piece",
      id: piece,
    } satisfies InteractiveRef;
    const height: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
    this.interactiveRefs.set(group, interactive);

    const body = new Mesh(
      this.pieceGeometries.getMarbleBodyGeometry(piece, traits),
      traits.isDark
        ? this.themeMaterials.marble.pieces.darkBody
        : this.themeMaterials.marble.pieces.redBody,
    );
    body.name = "piece-body";
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.interactiveRefs.set(body, interactive);
    group.add(body);

    let inset: PieceView["inset"] = null;
    let bezel: PieceView["bezel"] = null;
    if (!traits.isSolid) {
      const look = this.themeMaterials.marble;
      inset = new Mesh(
        traits.isRound
          ? new CylinderGeometry(0.201, 0.201, 0.018, 32)
          : new RoundedBoxGeometry(0.397, 0.018, 0.397, 3, 0.008),
        traits.isDark ? look.hollowDark : look.hollowLight,
      );
      inset.name = "hollow-inset";
      inset.position.y = height - 0.103;
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
      bezel.position.y = height - 0.014;
      bezel.receiveShadow = true;
      bezel.raycast = (): void => {};
      group.add(bezel);
    }
    const craft = this.themeMaterials.victorian.craft;
    if (!craft) throw new Error("Victorian craft materials are missing");
    const details = createVictorianPieceDetails(traits, height, craft);
    group.add(details);
    const rice = traits.isDark
      ? null
      : createRiceGrains(
          body.geometry,
          traits,
          this.themeMaterials.flogsta.pieces.redBody,
          this.pieceGeometries.riceGrainGeometry,
        );
    if (rice) group.add(rice);
    const coffeeMaterials = this.themeMaterials.flogsta.coffee;
    if (!coffeeMaterials) throw new Error("Coffee materials are missing");
    const coffee = traits.isDark ? createCoffeeDetails(traits, coffeeMaterials) : null;
    if (coffee) group.add(coffee);
    return {
      group,
      body,
      inset,
      bezel,
      details,
      rice,
      coffee,
      target: new Vector3(),
      baseScale: 1,
      targetScale: 1,
    };
  }

  private lowerTableRear(): void {
    lowerTableRear(this.tableGeometries, TABLE_REAR_SCALE);
  }

  private layoutTable(): void {
    this.baseMesh.scale.setScalar(1);
    this.tableEdge.scale.setScalar(1);
    this.baseMesh.position.copy(this.boardOffset).setY(BASE_Y);
    this.tableEdge.position.copy(this.baseMesh.position);
  }

  private layoutObjects(): void {
    this.boardOffset.set(this.mobileLayout ? 0 : -1.35, 0, this.mobileLayout ? -1.1 : 0);
    this.layoutTable();
    this.boardRingBase.position.copy(this.boardOffset).setY(BASE_Y + 0.01);
    this.boardRim.position.copy(this.boardOffset).setY(BASE_Y + 0.08);
    this.victorianBoardDetails.position.copy(this.boardOffset).setY(BASE_Y + 0.115);

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

    const winningCells = new Set<number>();
    for (const winLine of getWinLines(this.state.board)) {
      for (const cell of winLine) winningCells.add(cell);
    }
    const remaining = new Set(this.state.remaining);
    const pieceCells = new Map<PieceId, number>();
    for (const [cell, piece] of this.state.board.entries()) {
      if (piece !== null) pieceCells.set(piece, cell);
    }

    for (const piece of GAME_PIECES) {
      const view: PieceView | undefined = this.pieces.get(piece);
      if (!view) continue;

      const boardCell: number | undefined = pieceCells.get(piece);
      if (boardCell !== undefined) {
        const cellMesh = this.boardCells[boardCell];
        if (!cellMesh) continue;

        this.setPieceTarget(
          view,
          cellMesh.position.x,
          CELL_TOP_Y,
          cellMesh.position.z,
          winningCells.has(boardCell) ? WIN_SCALE : 1,
        );
      } else if (this.state.pendingPiece === piece) {
        this.setPieceTarget(
          view,
          this.mobileLayout ? 2.95 : 5.25,
          BASE_Y,
          this.mobileLayout ? 2.0 : 0,
          WIN_SCALE,
        );
      } else if (remaining.has(piece)) {
        this.layoutReservePiece(piece, view);
      } else {
        view.group.visible = false;
      }
    }
    this.updateHighlights(remaining);
  }

  private layoutReservePiece(piece: PieceId, view: PieceView): void {
    const upper: boolean = piece < 8;
    const sideIdx: number = upper ? piece : piece - 8;
    const progress: number = sideIdx / 7;
    const angle: number = this.mobileLayout
      ? MathUtils.lerp(PORTRAIT_RESERVE_START, PORTRAIT_RESERVE_END, progress)
      : (upper
          ? MathUtils.lerp(RESERVE_UPPER_START, RESERVE_UPPER_END, progress)
          : MathUtils.lerp(RESERVE_LOWER_START, RESERVE_LOWER_END, progress)) -
        Math.PI / 2;
    const radius: number = this.mobileLayout
      ? upper
        ? 6.1
        : 4.75
      : RESERVE_RADIUS + (upper ? 0.04 : -0.04);

    this.setPieceTarget(
      view,
      this.boardOffset.x + Math.cos(angle) * radius,
      BASE_Y,
      this.boardOffset.z + Math.sin(angle) * radius,
      RESERVE_SCALE,
    );
  }

  private setPieceTarget(view: PieceView, x: number, y: number, z: number, scale: number): void {
    view.target.set(x, y, z);
    view.baseScale = scale;
    view.targetScale = scale;
    view.group.visible = true;
  }

  private updateHighlights(remaining = new Set(this.state.remaining)): void {
    this.needsRender = true;
    for (const [cell, mesh] of this.boardCells.entries()) {
      const material = mesh.material;
      const interactive: boolean = this.state.phase === "place" && this.state.board[cell] === null;
      const hovered: boolean =
        interactive && this.hovered?.type === "cell" && this.hovered.id === cell;

      const accent = this.cellAccents[cell];
      if (accent) {
        accent.visible = this.activeTheme !== "flogsta" && this.state.board[cell] === null;
        accent.material =
          this.activeTheme === "marble" && hovered
            ? this.marbleHighlightAccent
            : this.activeTheme === "victorian" && hovered
              ? this.victorianHighlightAccent
              : this.themeMaterials[this.activeTheme].accent;
        accent.scale.setScalar(this.activeTheme !== "nature" && hovered ? 1.05 : 1);
      }
      if (this.activeTheme === "marble") {
        material.color.setHex(
          hovered ? 0x297d94 : interactive ? 0x849f9e : MARBLE_CELL_COLS[cell % 2 === 0 ? 0 : 1],
        );
        material.emissive.setHex(hovered ? 0x088c9f : interactive ? 0x09374e : 0x000000);
        material.emissiveIntensity = hovered ? 0.75 : interactive ? 0.65 : 0;
      } else if (this.activeTheme === "victorian") {
        material.color.setHex(
          hovered ? 0xffe9b4 : interactive ? 0xefd5a7 : VICTORIAN_CELL_COLS[cell % 2 === 0 ? 0 : 1],
        );
        material.emissive.setHex(hovered ? 0x644014 : interactive ? 0x211609 : 0x000000);
        material.emissiveIntensity = hovered ? 0.75 : interactive ? 0.3 : 0;
      } else if (this.activeTheme === "flogsta") {
        material.emissive.setHex(hovered ? 0xa9b9b2 : interactive ? 0x34433e : 0x000000);
        material.emissiveIntensity = hovered ? 0.35 : interactive ? 0.12 : 0;
      } else {
        material.emissive.setHex(hovered ? 0x317362 : interactive ? 0x123b32 : 0x000000);
        material.emissiveIntensity = hovered ? 1.5 : interactive ? 0.9 : 0;
      }
    }

    for (const [piece, view] of this.pieces) {
      view.targetScale = view.baseScale;
      if (
        this.state.phase === "select" &&
        remaining.has(piece) &&
        this.hovered?.type === "piece" &&
        this.hovered.id === piece
      ) {
        view.targetScale = Math.max(view.baseScale, HOVER_SCALE);
      }
    }
  }

  private findInteractive(object: Object3D): InteractiveRef | null {
    for (let cur: Object3D | null = object; cur; cur = cur.parent) {
      const ref = this.interactiveRefs.get(cur);
      if (ref) return ref;
    }
    return null;
  }

  private isInteractive(ref: InteractiveRef): boolean {
    return ref.type === "cell"
      ? this.state.phase === "place" && this.state.board[ref.id] === null
      : this.state.phase === "select" && this.state.remaining.includes(ref.id);
  }

  private pick(event: MouseEvent): InteractiveRef | null {
    const rect: DOMRect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    for (const hit of this.raycaster.intersectObjects(this.interactiveObj, true)) {
      const ref: InteractiveRef | null = this.findInteractive(hit.object);
      if (ref && this.isInteractive(ref)) return ref;
    }
    return null;
  }

  private readonly onPointerMove: (event: PointerEvent) => void = (event: PointerEvent): void => {
    const next: InteractiveRef | null = this.pick(event);
    if (next?.type === this.hovered?.type && next?.id === this.hovered?.id) return;

    this.hovered = next;
    this.renderer.domElement.style.cursor = next ? "pointer" : "grab";
    this.callbacks.onPieceHover(next?.type === "piece" ? next.id : null);
    this.updateHighlights();
  };

  private readonly onPointerLeave: () => void = (): void => {
    this.hovered = null;
    this.callbacks.onPieceHover(null);
    this.renderer.domElement.style.cursor = "grab";
    this.updateHighlights();
  };

  private readonly onClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
    const ref: InteractiveRef | null = this.pick(event);
    if (ref?.type === "cell") this.callbacks.onCellClick(ref.id);
    else if (ref?.type === "piece") this.callbacks.onPieceClick(ref.id);
  };

  private readonly resize: () => void = (): void => {
    if (this.isDisposed) return;
    const canvas: HTMLCanvasElement = this.renderer.domElement;
    const resizeTarget: HTMLElement = canvas.parentElement ?? canvas;
    const width: number = Math.max(1, resizeTarget.clientWidth);
    const height: number = Math.max(1, resizeTarget.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.getSize(this.prevSize);
    if (
      this.isSized &&
      this.prevSize.x === width &&
      this.prevSize.y === height &&
      this.renderer.getPixelRatio() === pixelRatio
    )
      return;
    const aspect: number = width / height;
    const nxtMobileLayout: boolean = aspect < MOBILE_ASPECT;
    const isLayoutChange: boolean = !this.isSized || nxtMobileLayout !== this.mobileLayout;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    this.camera.fov = nxtMobileLayout ? 50 : 37;
    this.mobileLayout = nxtMobileLayout;

    if (isLayoutChange) {
      if (this.mobileLayout) {
        this.camera.position.set(0, 6.8, 15.9);
        this.controls.target.set(0, 1.2, -1.1);
      } else {
        this.camera.position.set(-1.35, 7.2, 16.2);
        this.controls.target.set(-1.35, 1.25, -0.5);
      }
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.setFromSphericalCoords(offset.length(), VIEW_POLAR_ANGLE, 0);
      this.camera.position.copy(this.controls.target).add(offset);
      this.layoutObjects();
    }

    this.isSized = true;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.dirLight.position.copy(this.camera.position);
    this.needsRender = true;
  };

  private readonly animate: () => void = (): void => {
    if (this.isDisposed) return;
    this.needsRender = this.controls.update() || this.needsRender;
    this.dirLight.position.copy(this.camera.position);
    for (const view of this.pieces.values()) {
      if (!view.group.visible) continue;

      const isMoving =
        view.group.position.distanceToSquared(view.target) > 1e-12 ||
        Math.abs(view.group.scale.x - view.targetScale) > 1e-6;
      if (isMoving) {
        view.group.position.lerp(view.target, ANIMATION_FACTOR);
        view.group.scale.setScalar(
          MathUtils.lerp(view.group.scale.x, view.targetScale, ANIMATION_FACTOR),
        );
        this.needsRender = true;
      } else if (
        !view.group.position.equals(view.target) ||
        view.group.scale.x !== view.targetScale
      ) {
        view.group.position.copy(view.target);
        view.group.scale.setScalar(view.targetScale);
        this.needsRender = true;
      }
    }
    if (!this.needsRender) return;
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  };

  private getCoffeeEnvironment(): Texture {
    if (this.coffeeEnvironment) return this.coffeeEnvironment;
    const environment = new RoomEnvironment();
    const generator = new PMREMGenerator(this.renderer);
    try {
      this.coffeeEnvironment = this.resources.track(generator.fromScene(environment, 0.04)).texture;
      return this.coffeeEnvironment;
    } finally {
      environment.dispose();
      generator.dispose();
    }
  }

  private loadStoneTexture(url: string): Texture {
    const texture: Texture = this.textureLoader.load(url, (): void => {
      if (!this.isDisposed) this.needsRender = true;
    });
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return this.resources.track(texture);
  }
}

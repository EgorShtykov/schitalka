import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { WorldPalette } from "./palettes";
import type { GalaxyBody, GalaxySpec } from "./galaxyData";
import { mulberry32 } from "./prng";

// Карта галактики: звезда «Смешанная» в центре, планета ученика на
// внутренней орбите, сектора-темы на средних орбитах (тёмная → растёт →
// сияет), направления сайта на внешних. Клик по телу — выбор, камера
// подлетает к выбранному телу и следует за ним по орбите.

export interface GalaxyHoverInfo {
  id: string;
  name: string;
  state: GalaxyBody["state"];
  score: number;
  x: number;
  y: number;
}

export interface GalaxySceneHandle {
  dispose: () => void;
  setRunning: (running: boolean) => void;
  /** Обновить состояния тел без пересоздания сцены (прогресс растёт). */
  update: (spec: GalaxySpec) => void;
  /** Подлететь к телу; null — вернуться к обзору системы. */
  focus: (id: string | null) => void;
}

interface BodyVisual {
  body: GalaxyBody;
  group: THREE.Group;
  planet: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  glow: THREE.Sprite;
  ring: THREE.Mesh;
}

const OVERVIEW_POSITION = new THREE.Vector3(0, 52, 86);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

function makeGlowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.4, outer);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

function stateColors(body: GalaxyBody): { color: THREE.Color; emissive: number; glowOpacity: number } {
  const base = new THREE.Color().setHSL(body.hue / 360, 0.62, 0.55);
  if (body.type !== "topic") {
    return { color: base, emissive: body.type === "sun" ? 1.6 : 0.55, glowOpacity: body.type === "sun" ? 0.85 : 0.45 };
  }
  if (body.state === "shining") {
    return { color: base, emissive: 0.85, glowOpacity: 0.6 };
  }
  if (body.state === "growing") {
    const dim = new THREE.Color().setHSL(body.hue / 360, 0.45, 0.42);
    return { color: dim, emissive: 0.32, glowOpacity: 0.22 };
  }
  const asleep = new THREE.Color().setHSL(body.hue / 360, 0.22, 0.26);
  return { color: asleep, emissive: 0.05, glowOpacity: 0.06 };
}

export function createGalaxyScene(
  container: HTMLElement,
  spec: GalaxySpec,
  palette: WorldPalette,
  seed: number,
  callbacks: {
    onSelect: (id: string) => void;
    onHover: (info: GalaxyHoverInfo | null) => void;
  },
): GalaxySceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    46,
    Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
    0.1,
    600,
  );
  camera.position.copy(OVERVIEW_POSITION);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 30;
  controls.maxDistance = 160;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.maxPolarAngle = Math.PI * 0.62;

  // Свет: центральная звезда — главный источник.
  const ambient = new THREE.AmbientLight("#3a4470", 1.5);
  const sunLight = new THREE.PointLight("#ffe6b0", 900, 0, 1.6);
  sunLight.position.set(0, 0, 0);
  const rim = new THREE.DirectionalLight(palette.nebulaB, 0.8);
  rim.position.set(-40, 30, -50);
  scene.add(ambient, sunLight, rim);

  // Небо: градиентная сфера + звёзды.
  const skyGeometry = new THREE.SphereGeometry(280, 24, 24);
  const skyPositions = skyGeometry.getAttribute("position");
  const skyColors = new Float32Array(skyPositions.count * 3);
  const skyTop = new THREE.Color(palette.skyTop);
  const skyBottom = new THREE.Color(palette.skyBottom);
  const skyVertex = new THREE.Vector3();
  const skyColor = new THREE.Color();
  for (let index = 0; index < skyPositions.count; index += 1) {
    skyVertex.fromBufferAttribute(skyPositions, index).normalize();
    skyColor.copy(skyBottom).lerp(skyTop, THREE.MathUtils.clamp(skyVertex.y * 0.5 + 0.5, 0, 1));
    skyColors[index * 3] = skyColor.r;
    skyColors[index * 3 + 1] = skyColor.g;
    skyColors[index * 3 + 2] = skyColor.b;
  }
  skyGeometry.setAttribute("color", new THREE.BufferAttribute(skyColors, 3));
  scene.add(new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));

  const starRand = mulberry32(seed ^ 0x9e3779b9);
  const starCount = 1600;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starColor = new THREE.Color(palette.star);
  for (let index = 0; index < starCount; index += 1) {
    const direction = new THREE.Vector3(starRand() * 2 - 1, starRand() * 2 - 1, starRand() * 2 - 1)
      .normalize()
      .multiplyScalar(150 + starRand() * 90);
    starPositions.set([direction.x, direction.y, direction.z], index * 3);
    const brightness = 0.4 + starRand() * 0.6;
    starColors.set([starColor.r * brightness, starColor.g * brightness, starColor.b * brightness], index * 3);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  scene.add(new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ size: 1.1, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }),
  ));

  const glowTexture = makeGlowTexture("#ffffff", palette.lanternGlow);
  const nebulaTexture = makeGlowTexture(palette.nebulaB, palette.nebulaA);
  const nebulaRand = mulberry32(seed ^ 0x51ed);
  for (let index = 0; index < 3; index += 1) {
    const nebula = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: nebulaTexture, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const direction = new THREE.Vector3(nebulaRand() * 2 - 1, nebulaRand() * 0.7 - 0.1, nebulaRand() * 2 - 1).normalize();
    nebula.position.copy(direction.multiplyScalar(190));
    nebula.scale.setScalar(140 + nebulaRand() * 80);
    scene.add(nebula);
  }

  // Орбиты: тонкие светящиеся кольца.
  const orbitMaterial = new THREE.LineBasicMaterial({ color: "#9db4ff", transparent: true, opacity: 0.16 });
  const orbitRadii = [...new Set(spec.bodies.filter(b => b.orbitRadius > 0).map(b => b.orbitRadius))];
  for (const radius of orbitRadii) {
    const points: THREE.Vector3[] = [];
    for (let segment = 0; segment <= 96; segment += 1) {
      const angle = (segment / 96) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    scene.add(new THREE.Line(geometry, orbitMaterial));
  }

  // Тела системы.
  const visuals = new Map<string, BodyVisual>();
  const pickMeshes: THREE.Mesh[] = [];

  for (const body of spec.bodies) {
    const group = new THREE.Group();
    const { color, emissive, glowOpacity } = stateColors(body);

    let planet: THREE.Mesh;
    let material: THREE.MeshStandardMaterial;
    if (body.type === "sun") {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffdf8e"),
        emissive: new THREE.Color("#ffca5a"),
        emissiveIntensity: emissive,
        roughness: 1,
      });
      planet = new THREE.Mesh(new THREE.SphereGeometry(body.size, 24, 24), material);
    } else {
      material = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.9,
        emissive: color,
        emissiveIntensity: emissive,
      });
      planet = new THREE.Mesh(new THREE.IcosahedronGeometry(body.size, 2), material);
    }
    planet.userData.id = body.id;
    pickMeshes.push(planet);
    group.add(planet);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: glowOpacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glow.scale.setScalar(body.size * (body.type === "sun" ? 4.4 : 3.4));
    group.add(glow);

    // Кольцо у сияющих и особых тел.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(body.size * 1.7, 0.07, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.visible = body.state === "shining" && body.type !== "sun";
    group.add(ring);

    group.position.set(Math.cos(body.phase) * body.orbitRadius, 0, Math.sin(body.phase) * body.orbitRadius);
    scene.add(group);
    visuals.set(body.id, { body: { ...body }, group, planet, material, glow, ring });
  }

  // Наведение и выбор.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredId: string | null = null;
  let downAt: { x: number; y: number } | null = null;

  const bodyAt = (event: PointerEvent): BodyVisual | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickMeshes, false);
    if (hits.length === 0) return null;
    const id = hits[0].object.userData.id as string;
    return visuals.get(id) ?? null;
  };

  const onPointerMove = (event: PointerEvent) => {
    const hit = bodyAt(event);
    if (!hit) {
      if (hoveredId !== null) {
        hoveredId = null;
        renderer.domElement.style.cursor = "";
        callbacks.onHover(null);
      }
      return;
    }
    hoveredId = hit.body.id;
    renderer.domElement.style.cursor = "pointer";
    callbacks.onHover({
      id: hit.body.id,
      name: hit.body.name,
      state: hit.body.state,
      score: hit.body.score,
      x: event.clientX,
      y: event.clientY,
    });
  };
  const onPointerDown = (event: PointerEvent) => {
    downAt = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return; // это было вращение, не клик
    const hit = bodyAt(event);
    if (hit) callbacks.onSelect(hit.body.id);
  };
  const onPointerLeave = () => {
    hoveredId = null;
    renderer.domElement.style.cursor = "";
    callbacks.onHover(null);
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);

  // Фокус камеры: null — обзор всей системы.
  let focusedId: string | null = null;
  const desiredPosition = OVERVIEW_POSITION.clone();
  const desiredTarget = OVERVIEW_TARGET.clone();

  const clock = new THREE.Clock();
  let running = true;
  let rafId = 0;
  let elapsed = 0;
  const scratch = new THREE.Vector3();

  function animate() {
    rafId = window.requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!running) return;
    elapsed += delta;

    // Движение тел по орбитам.
    visuals.forEach(visual => {
      const { body } = visual;
      if (body.orbitRadius > 0) {
        const angle = body.phase + elapsed * body.speed;
        visual.group.position.set(Math.cos(angle) * body.orbitRadius, 0, Math.sin(angle) * body.orbitRadius);
      }
      visual.planet.rotation.y += delta * 0.25;
      if (visual.body.state === "shining" && visual.body.type !== "sun") {
        visual.ring.rotation.z += delta * 0.4;
      }
      if (visual.body.type === "sun") {
        visual.material.emissiveIntensity = 1.55 + Math.sin(elapsed * 1.4) * 0.18;
      }
    });

    // Камера: плавный перелёт к цели.
    const focused = focusedId ? visuals.get(focusedId) : null;
    if (focused) {
      scratch.copy(focused.group.position).normalize();
      desiredTarget.copy(focused.group.position);
      desiredPosition
        .copy(focused.group.position)
        .addScaledVector(scratch, focused.body.size * 5.2)
        .add(new THREE.Vector3(0, focused.body.size * 2.6, 0));
    } else {
      desiredTarget.copy(OVERVIEW_TARGET);
      desiredPosition.copy(OVERVIEW_POSITION);
    }
    const ease = 1 - Math.pow(0.002, delta); // плавно, без рывков
    camera.position.lerp(desiredPosition, ease);
    controls.target.lerp(desiredTarget, ease);
    controls.update();

    renderer.render(scene, camera);
  }
  animate();

  const resizeObserver = new ResizeObserver(() => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resizeObserver.observe(container);

  return {
    setRunning(value: boolean) {
      running = value;
      if (value) clock.getDelta();
    },
    update(next: GalaxySpec) {
      for (const body of next.bodies) {
        const visual = visuals.get(body.id);
        if (!visual) continue;
        visual.body.state = body.state;
        visual.body.score = body.score;
        const { color, emissive, glowOpacity } = stateColors(body);
        visual.material.color.copy(color);
        visual.material.emissive.copy(color);
        if (body.type !== "sun") visual.material.emissiveIntensity = emissive;
        (visual.glow.material as THREE.SpriteMaterial).opacity = glowOpacity;
        visual.ring.visible = body.state === "shining" && body.type !== "sun";
      }
    },
    focus(id: string | null) {
      focusedId = id;
      const focused = id ? visuals.get(id) : null;
      controls.autoRotate = !focused;
      controls.minDistance = focused ? 6 : 30;
      controls.maxDistance = focused ? 30 : 160;
    },
    dispose() {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { WorldPalette } from "./palettes";
import type { WorldPlacement, WorldSpec } from "./worldData";
import { mulberry32 } from "./prng";

// Сцена планеты ученика: low-poly мир, созвездия-темы, дух-спутник,
// звёздное небо и редкие кометы. Всё процедурно, без внешних ассетов.

export interface PlanetSceneHandle {
  dispose: () => void;
  setRunning: (running: boolean) => void;
  snapshot: () => string;
}

const PLANET_RADIUS = 10;

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

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

/** Дешёвый детерминированный «шум» из синусов — рельеф планеты. */
function terrainNoise(x: number, y: number, z: number, ox: number, oy: number, oz: number): number {
  return (
    Math.sin((x + ox) * 1.7) * Math.cos((z + oz) * 1.3) * 0.5 +
    Math.sin((y + oy) * 2.3 + (x + ox)) * 0.3 +
    Math.sin((z + oz) * 3.1 + (y + oy) * 1.1) * 0.2
  );
}

function buildPlanet(palette: WorldPalette, seed: number): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, 4);
  const positions = geometry.getAttribute("position");
  const rand = mulberry32(seed);
  const offset = { x: rand() * 20, y: rand() * 20, z: rand() * 20 };
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color(palette.rockLow);
  const high = new THREE.Color(palette.rockHigh);
  const vertex = new THREE.Vector3();
  const color = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index).normalize();
    const height = terrainNoise(vertex.x, vertex.y, vertex.z, offset.x, offset.y, offset.z);
    const radius = PLANET_RADIUS * (1 + height * 0.055);
    positions.setXYZ(index, vertex.x * radius, vertex.y * radius, vertex.z * radius);
    const mix = THREE.MathUtils.clamp(0.5 + height * 0.7 + vertex.y * 0.25, 0, 1);
    color.copy(low).lerp(high, mix);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }),
  );
}

const KIND_SCALE: Record<string, number> = {
  tree: 1.4,
  flowerTree: 1.4,
  crystal: 1.25,
  lantern: 1.15,
  cabin: 1.15,
  trophyGold: 1.2,
  trophySilver: 1.2,
  trophyBronze: 1.2,
};

function placeOnPlanet(object: THREE.Object3D, placement: WorldPlacement) {
  const normal = latLonToVec3(placement.lat, placement.lon, 1).normalize();
  const position = normal.clone().multiplyScalar(PLANET_RADIUS * 0.99);
  object.position.copy(position);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  object.scale.setScalar(placement.scale * (KIND_SCALE[placement.kind] ?? 1));
}

function shiftColor(hex: string, hueShift: number): THREE.Color {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL((hsl.h + hueShift * 0.06 + 1) % 1, hsl.s, THREE.MathUtils.clamp(hsl.l + hueShift * 0.05, 0, 1));
  return color;
}

function buildTree(palette: WorldPalette, placement: WorldPlacement): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 0.7, 5),
    new THREE.MeshStandardMaterial({ color: "#4a3550", flatShading: true, roughness: 1 }),
  );
  trunk.position.y = 0.35;
  const foliageColor = shiftColor(placement.kind === "flowerTree" ? palette.flower : palette.foliage, placement.hueShift * 0.5);
  const material = new THREE.MeshStandardMaterial({
    color: foliageColor,
    flatShading: true,
    roughness: 0.9,
    emissive: foliageColor,
    emissiveIntensity: placement.kind === "flowerTree" ? 0.3 : 0.15,
  });
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.0, 7), material);
  lower.position.y = 1.0;
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.8, 7), material);
  upper.position.y = 1.62;
  group.add(trunk, lower, upper);
  return group;
}

function buildCrystal(palette: WorldPalette, placement: WorldPlacement, glowTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const color = shiftColor(palette.crystal, placement.hueShift * 0.5);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5),
    new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.25,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.92,
    }),
  );
  crystal.scale.y = 1.7;
  crystal.position.y = 0.75;
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  glow.scale.setScalar(2.6);
  glow.position.y = 0.8;
  group.add(crystal, glow);
  return group;
}

function buildLantern(palette: WorldPalette, glowTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 1.1, 5),
    new THREE.MeshStandardMaterial({ color: "#3a3040", flatShading: true, roughness: 1 }),
  );
  post.position.y = 0.55;
  const lampColor = new THREE.Color(palette.lanternGlow);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: lampColor, emissive: lampColor, emissiveIntensity: 1.4 }),
  );
  lamp.position.y = 1.25;
  lamp.name = "lanternLamp";
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color: lampColor, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  glow.scale.setScalar(1.8);
  glow.position.y = 1.25;
  group.add(post, lamp, glow);
  return group;
}

function buildCabin(palette: WorldPalette): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.1, 1.4),
    new THREE.MeshStandardMaterial({ color: "#5a4058", flatShading: true, roughness: 1 }),
  );
  body.position.y = 0.55;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 0.9, 4),
    new THREE.MeshStandardMaterial({ color: "#8a4a52", flatShading: true, roughness: 1 }),
  );
  roof.position.y = 1.55;
  roof.rotation.y = Math.PI / 4;
  const windowColor = new THREE.Color(palette.lanternGlow);
  const windowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ color: windowColor }),
  );
  windowMesh.position.set(0, 0.62, 0.71);
  group.add(body, roof, windowMesh);
  return group;
}

function buildTrophy(kind: WorldPlacement["kind"]): THREE.Group {
  const colors: Record<string, { cup: string; metalness: number }> = {
    trophyGold: { cup: "#f5c542", metalness: 0.8 },
    trophySilver: { cup: "#c8ccd4", metalness: 0.75 },
    trophyBronze: { cup: "#c98a4b", metalness: 0.7 },
  };
  const config = colors[kind] ?? colors.trophyGold;
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: config.cup,
    flatShading: true,
    roughness: 0.3,
    metalness: config.metalness,
    emissive: config.cup,
    emissiveIntensity: 0.18,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.18, 6), material);
  base.position.y = 0.09;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.35, 6), material);
  stem.position.y = 0.35;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.16, 0.42, 8), material);
  cup.position.y = 0.72;
  group.add(base, stem, cup);
  return group;
}

function buildConstellation(spec: WorldSpec["constellations"][number], palette: WorldPalette, seed: number): THREE.Group {
  const group = new THREE.Group();
  const rand = mulberry32(seed ^ (spec.topicIndex + 3) * 104729);
  const color = new THREE.Color(palette.constellation);
  const points: THREE.Vector3[] = [];
  const starMaterial = new THREE.MeshBasicMaterial({ color });
  const starGeometry = new THREE.SphereGeometry(0.32, 6, 6);

  for (let index = 0; index < spec.starCount; index += 1) {
    const point = new THREE.Vector3((rand() - 0.5) * 8, (rand() - 0.5) * 6, (rand() - 0.5) * 2);
    points.push(point);
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.copy(point);
    group.add(star);
  }
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    linePositions.push(...points[index].toArray(), ...points[index + 1].toArray());
  }
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }),
  );
  group.add(lines);

  const anchor = latLonToVec3(spec.lat, spec.lon, 24).normalize();
  group.position.copy(anchor.multiplyScalar(24));
  group.lookAt(0, 0, 0);
  group.scale.setScalar(spec.scale);
  return group;
}

function timeTint(): { intensity: number; warmth: number } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return { intensity: 1.05, warmth: 0.35 };
  if (hour >= 10 && hour < 18) return { intensity: 1.15, warmth: 0.1 };
  if (hour >= 18 && hour < 22) return { intensity: 1.0, warmth: 0.55 };
  return { intensity: 0.9, warmth: 0 };
}

export function createPlanetScene(
  container: HTMLElement,
  spec: WorldSpec,
  palette: WorldPalette,
  seed: number,
): PlanetSceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
    0.1,
    400,
  );
  camera.position.set(6, 11, 33);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 17;
  controls.maxDistance = 70;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.maxPolarAngle = Math.PI * 0.85;

  const tint = timeTint();
  const hemisphere = new THREE.HemisphereLight(new THREE.Color(palette.skyBottom).lerp(new THREE.Color("#ffffff"), 0.45), "#131a3a", 1.7 * tint.intensity);
  const key = new THREE.DirectionalLight(new THREE.Color("#ffe0b0").lerp(new THREE.Color("#ffffff"), 1 - tint.warmth), 2.4 * tint.intensity);
  key.position.set(18, 24, 14);
  const rim = new THREE.DirectionalLight(palette.nebulaB, 1.1);
  rim.position.set(-16, -6, -18);
  const fill = new THREE.DirectionalLight("#8fa3e0", 0.55);
  fill.position.set(2, 4, 30);
  scene.add(hemisphere, key, rim, fill);

  // Небо: градиентная сфера + звёзды + туманности.
  const skyGeometry = new THREE.SphereGeometry(180, 24, 24);
  const skyColors = new Float32Array(skyGeometry.getAttribute("position").count * 3);
  const skyTop = new THREE.Color(palette.skyTop);
  const skyBottom = new THREE.Color(palette.skyBottom);
  const skyVertex = new THREE.Vector3();
  const skyColor = new THREE.Color();
  const skyPositions = skyGeometry.getAttribute("position");
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
  const starCount = 1400;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starColor = new THREE.Color(palette.star);
  for (let index = 0; index < starCount; index += 1) {
    const direction = new THREE.Vector3(starRand() * 2 - 1, starRand() * 2 - 1, starRand() * 2 - 1)
      .normalize()
      .multiplyScalar(95 + starRand() * 55);
    starPositions.set([direction.x, direction.y, direction.z], index * 3);
    const brightness = 0.5 + starRand() * 0.5;
    starColors.set([starColor.r * brightness, starColor.g * brightness, starColor.b * brightness], index * 3);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ size: 0.9, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  scene.add(stars);

  const nebulaTextureA = makeGlowTexture(palette.nebulaB, palette.nebulaA);
  const nebulaTextureB = makeGlowTexture(palette.nebulaA, palette.nebulaB);
  const nebulaRand = mulberry32(seed ^ 0x51ed);
  for (let index = 0; index < 4; index += 1) {
    const nebula = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: index % 2 === 0 ? nebulaTextureA : nebulaTextureB,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const direction = new THREE.Vector3(nebulaRand() * 2 - 1, nebulaRand() * 0.8 - 0.2, nebulaRand() * 2 - 1).normalize();
    nebula.position.copy(direction.multiplyScalar(120));
    nebula.scale.setScalar(90 + nebulaRand() * 70);
    scene.add(nebula);
  }

  // Планета и атмосфера.
  const planetGroup = new THREE.Group();
  planetGroup.add(buildPlanet(palette, seed));

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.16, 32, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(palette.crystal) },
        strength: { value: 0.25 + spec.masteryRatio * 0.55 },
      },
      vertexShader: `
        varying float vRim;
        void main() {
          vec3 n = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vRim = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 2.2);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float strength;
        varying float vRim;
        void main() { gl_FragColor = vec4(glowColor, vRim * strength); }`,
    }),
  );
  planetGroup.add(atmosphere);

  const glowTexture = makeGlowTexture("#ffffff", palette.lanternGlow);
  const crystalGlowTexture = makeGlowTexture("#ffffff", palette.crystal);
  const lanternMeshes: THREE.Mesh[] = [];

  for (const placement of spec.placements) {
    let object: THREE.Group;
    if (placement.kind === "tree" || placement.kind === "flowerTree") object = buildTree(palette, placement);
    else if (placement.kind === "crystal") object = buildCrystal(palette, placement, crystalGlowTexture);
    else if (placement.kind === "lantern") object = buildLantern(palette, glowTexture);
    else if (placement.kind === "cabin") object = buildCabin(palette);
    else object = buildTrophy(placement.kind);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === "lanternLamp") lanternMeshes.push(child);
    });
    placeOnPlanet(object, placement);
    planetGroup.add(object);
  }
  scene.add(planetGroup);

  // Созвездия освоенных тем — медленно вращающийся купол.
  const constellationDome = new THREE.Group();
  for (const constellation of spec.constellations) {
    constellationDome.add(buildConstellation(constellation, palette, seed));
  }
  // Поворачиваем купол так, чтобы первое созвездие сразу было видно с камеры.
  let domeBaseRotation = 0;
  if (spec.constellations.length > 0) {
    const cameraTheta = Math.atan2(camera.position.z, -camera.position.x);
    const firstTheta = THREE.MathUtils.degToRad(spec.constellations[0].lon + 180);
    domeBaseRotation = cameraTheta - firstTheta;
    constellationDome.rotation.y = domeBaseRotation;
  }
  scene.add(constellationDome);

  // Дух-спутник: светящийся шар с орбитой вокруг планеты.
  const spiritGroup = new THREE.Group();
  let spiritCore: THREE.Mesh | null = null;
  if (spec.spirit.unlocked) {
    const spiritColor = new THREE.Color(palette.spirit);
    spiritCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 + spec.spirit.stage * 0.06, 1),
      new THREE.MeshStandardMaterial({ color: spiritColor, emissive: spiritColor, emissiveIntensity: 1.6, flatShading: true }),
    );
    const spiritGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeGlowTexture("#ffffff", palette.spirit), color: spiritColor, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    spiritGlow.scale.setScalar(1.6 + spec.spirit.stage * 0.5);
    spiritGroup.add(spiritCore, spiritGlow);
    scene.add(spiritGroup);
  }

  // Комета: редкий пролёт по небу.
  const comet = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeGlowTexture("#ffffff", palette.star), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  comet.scale.set(6, 1.2, 1);
  scene.add(comet);
  let cometLife = -1;
  let nextCometAt = 5 + Math.random() * 6;
  let cometVelocity = new THREE.Vector3();

  const clock = new THREE.Clock();
  let running = true;
  let rafId = 0;
  let elapsed = 0;

  function animate() {
    rafId = window.requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!running) return;
    elapsed += delta;

    controls.update();
    constellationDome.rotation.y = domeBaseRotation + elapsed * 0.02;
    stars.rotation.y = elapsed * 0.004;

    lanternMeshes.forEach((lamp, index) => {
      const material = lamp.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.2 + Math.sin(elapsed * 3 + index * 1.7) * 0.35;
    });

    if (spiritCore) {
      const angle = elapsed * 0.45;
      const radius = 14.5;
      spiritGroup.position.set(Math.cos(angle) * radius, 3.4 + Math.sin(elapsed * 1.6) * 1.1, Math.sin(angle) * radius);
      spiritGroup.rotation.y = angle;
    }

    nextCometAt -= delta;
    if (nextCometAt <= 0 && cometLife < 0) {
      cometLife = 1.4;
      nextCometAt = 7 + Math.random() * 9;
      const start = new THREE.Vector3(Math.random() * 2 - 1, 0.4 + Math.random() * 0.5, Math.random() * 2 - 1).normalize().multiplyScalar(110);
      comet.position.copy(start);
      cometVelocity = new THREE.Vector3(-start.z, -0.25 * start.y, start.x).normalize().multiplyScalar(48);
    }
    if (cometLife >= 0) {
      cometLife -= delta;
      comet.position.addScaledVector(cometVelocity, delta);
      (comet.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, cometLife / 0.7)) * 0.9;
    }

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
    snapshot() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    dispose() {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
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

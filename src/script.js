import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// initialize the scene
const scene = new THREE.Scene();

// ─── Loading Manager ───
// Tracks texture-load progress and fades out the loading screen when done.
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (_url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  const bar = document.getElementById('loading-bar');
  const txt = document.getElementById('loading-text');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = `Loading… ${pct}%`;
};
loadingManager.onLoad = () => {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.classList.add('fade-out');
    setTimeout(() => screen.remove(), 900);
  }
};

const textureLoader = new THREE.TextureLoader(loadingManager);
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);

cubeTextureLoader.setPath('/textures/cubeMap/')
const sunTexture = textureLoader.load('/textures/2k_sun.jpg')
const mercuryTexture = textureLoader.load('/textures/2k_mercury.jpg')
const venusTexture = textureLoader.load('/textures/2k_venus_surface.jpg')
const earthTexture = textureLoader.load('/textures/2k_earth_daymap.jpg')
const marsTexture = textureLoader.load('/textures/2k_mars.jpg')
const jupiterTexture = textureLoader.load('/textures/2k_jupiter.jpg')
const saturnTexture = textureLoader.load('/textures/2k_saturn.jpg')
const saturnringTexture = textureLoader.load('/textures/2k_saturn_ring_alpha.png')
// UV-mapped manually in the loop below – wrapS/wrapT/repeat not needed
const uranusTexture = textureLoader.load('/textures/2k_uranus.jpg')
const neptuneTexture = textureLoader.load('/textures/2k_neptune.jpg')
const moonTexture = textureLoader.load('/textures/2k_moon.jpg')

const backgroundCubemap = cubeTextureLoader.load([
  'px.png', 'nx.png',
  'py.png', 'ny.png',
  'pz.png', 'nz.png'
])
scene.background = backgroundCubemap

// ─── Materials ───
// Rocky planets: high roughness (cratered / dusty surfaces), zero metalness
const mercuryMaterial = new THREE.MeshStandardMaterial({
  map: mercuryTexture,
  roughness: 0.9,      // Very rough, no atmosphere to smooth it
  metalness: 0.0,
})
const venusMaterial = new THREE.MeshStandardMaterial({
  map: venusTexture,
  roughness: 0.7,      // Thick cloud cover makes it appear smoother
  metalness: 0.0,
})
const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 0.6,      // Mix of ocean (low) and land (high)
  metalness: 0.0,
})
const marsMaterial = new THREE.MeshStandardMaterial({
  map: marsTexture,
  roughness: 0.95,     // Dusty, barren desert world
  metalness: 0.0,
})
// Gas giants: smooth, slightly shiny due to cloud bands
const jupiterMaterial = new THREE.MeshStandardMaterial({
  map: jupiterTexture,
  roughness: 0.4,
  metalness: 0.0,
})
const saturnMaterial = new THREE.MeshStandardMaterial({
  map: saturnTexture,
  roughness: 0.45,
  metalness: 0.0,
})
// Saturn ring: MeshBasicMaterial (unaffected by distance from sun).
// color: 0xc8a882 = warm reddish-sandy tint matching real ring colour (brownish ice & rock).
const saturnringMaterial = new THREE.MeshBasicMaterial({
  map: saturnringTexture,
  color: 0xc8a882,
  transparent: true,
  alphaMap: saturnringTexture,
  side: THREE.DoubleSide,
  depthWrite: false,   // Ring doesn't block other transparent objects
  // depthTest stays TRUE so Saturn correctly occludes the back half of the ring
  opacity: 0.92,
})
// Ice giants: slightly reflective, cold blue-green tone
const uranusMaterial = new THREE.MeshStandardMaterial({
  map: uranusTexture,
  roughness: 0.35,
  metalness: 0.05,
})
const neptuneMaterial = new THREE.MeshStandardMaterial({
  map: neptuneTexture,
  roughness: 0.3,
  metalness: 0.05,
})
// Moon: heavily cratered, very rough grey surface
const moonMaterial = new THREE.MeshStandardMaterial({
  map: moonTexture,
  roughness: 1.0,
  metalness: 0.0,
})

// ─── Geometry ───
// Higher segment count = smoother spheres (especially visible on close-up)
const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const atmosphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const innerRadius = 1.5;
const outerRadius = 3;
const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
const ringPosition = ringGeometry.attributes.position;
const uvs = ringGeometry.attributes.uv;
const vertex = new THREE.Vector3();

// Custom UV mapping: radial (v) + angular (u) so the ring texture wraps correctly
for (let i = 0; i < ringPosition.count; i++) {
  vertex.fromBufferAttribute(ringPosition, i);
  const dist = vertex.length();
  const v = (dist - innerRadius) / (outerRadius - innerRadius);
  const angle = Math.atan2(vertex.y, vertex.x);
  const u = (angle + Math.PI) / (Math.PI * 2);
  uvs.setXY(i, v, u);
}
ringGeometry.attributes.uv.needsUpdate = true;

// ─── Orbit Paths ───
// Thin semi-transparent circles drawn once at startup (zero per-frame cost).
const orbitLineMaterial = new THREE.LineBasicMaterial({
  color: 0x6666aa,
  transparent: true,
  opacity: 0.20,
});
function createOrbitPath(radius, inclination = 0) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    // Match the exact same formula used in the render loop for planet position
    pts.push(new THREE.Vector3(
      Math.sin(a) * radius,
      Math.cos(a) * radius * Math.sin(inclination),
      Math.cos(a) * radius * Math.cos(inclination)
    ));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    orbitLineMaterial
  );
}

// ─── Star Particle Field ───
// 6 000 stars on a large sphere shell – parallax as camera moves, unlike flat cubemap.
const starCount = 6000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 700 + Math.random() * 150;
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i * 3 + 2] = r * Math.cos(phi);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.6,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.85,
})));

// ─── Sun ───
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture })
const sun = new THREE.Mesh(sphereGeometry, sunMaterial)
sun.scale.setScalar(20)
scene.add(sun)

// Sun corona glow
const coronaMaterial = new THREE.MeshBasicMaterial({
  color: 0xffaa33, transparent: true, opacity: 0.08,
  side: THREE.FrontSide, blending: THREE.AdditiveBlending, depthWrite: false,
})
const corona = new THREE.Mesh(atmosphereGeometry, coronaMaterial)
corona.scale.setScalar(22.5)
scene.add(corona)

// Outer halo
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6600, transparent: true, opacity: 0.04,
  side: THREE.FrontSide, blending: THREE.AdditiveBlending, depthWrite: false,
})
const halo = new THREE.Mesh(atmosphereGeometry, haloMaterial)
halo.scale.setScalar(26)
scene.add(halo)

// ─── Planet Data ───
// Orbital speed    → proportional to real period (Earth = 0.005 rad/frame)
// selfRotationSpeed → proportional to real sidereal day (Earth 1 day = 0.01 rad/frame)
//                    Negative = retrograde rotation (Venus, Uranus)
// tilt             → axial tilt in radians
// inclination      → orbital inclination vs ecliptic plane, in radians
// Moon distances   → in planet LOCAL space (world dist = distance × planet.radius)
const planets = [
  {
    name: "Mercury",
    radius: 0.38,
    distance: 25,
    speed: 0.0207,
    selfRotationSpeed: 0.00017,  // Real: 58.6 Earth-day sidereal day (was 10× too fast)
    tilt: 0.0006,
    inclination: 0.122,          // 7.0° – steepest of all 8 planets
    orbitAngle: 0,
    material: mercuryMaterial,
    atmosphere: null,
    moons: [],
    ring: [],
  },
  {
    name: "Venus",
    radius: 0.95,
    distance: 31,
    speed: 0.0081,
    selfRotationSpeed: -0.000041, // Real: 243 Earth-day retrograde (was 10× too fast)
    tilt: 3.096,
    inclination: 0.059,           // 3.4°
    orbitAngle: 0,
    material: venusMaterial,
    atmosphere: {
      color: 0xffcc66,
      opacity: 0.25,
      size: 1.08,
    },
    moons: [],
    ring: [],
  },
  {
    name: 'Earth',
    radius: 1.0,
    distance: 42,
    speed: 0.005,
    selfRotationSpeed: 0.01,
    tilt: 0.4091,
    inclination: 0,               // Reference plane (ecliptic)
    orbitAngle: 0,
    material: earthMaterial,
    atmosphere: {
      color: 0x4488ff,
      opacity: 0.12,
      size: 1.06,
    },
    moons: [
      { name: 'Moon', radius: 0.27, distance: 4, speed: 0.015, orbitAngle: 0 }
    ],
    ring: [],
  },
  {
    name: 'Mars',
    radius: 0.53,
    distance: 55,
    speed: 0.00266,
    selfRotationSpeed: 0.0097,
    tilt: 0.4398,
    inclination: 0.032,           // 1.85°
    orbitAngle: 0,
    material: marsMaterial,
    atmosphere: {
      color: 0xff6633,
      opacity: 0.06,
      size: 1.04,
    },
    moons: [
      {
        name: 'Phobos',
        radius: 0.008,  // Real: 11 km – was 45× too big; set to min-visible floor
        distance: 3,
        speed: 0.05,
        orbitAngle: 0,
      },
      {
        name: 'Deimos',
        radius: 0.006,  // Real: 6.2 km – was 55× too big; set to min-visible floor
        distance: 5,
        speed: 0.035,
        orbitAngle: 0,
      },
    ],
    ring: [],
  },
  {
    name: "Jupiter",
    radius: 10.97,
    distance: 96,
    speed: 0.000422,
    selfRotationSpeed: 0.0241,
    tilt: 0.0546,
    inclination: 0.023,           // 1.3°
    orbitAngle: 0,
    material: jupiterMaterial,
    atmosphere: {
      color: 0xffaa77,
      opacity: 0.07,
      size: 1.02,
    },
    moons: [
      { name: 'Io', radius: 0.026, distance: 1.5, speed: 0.04, orbitAngle: 0 },
      { name: 'Europa', radius: 0.022, distance: 1.8, speed: 0.028, orbitAngle: 0 },
      { name: 'Ganymede', radius: 0.037, distance: 1.9, speed: 0.018, orbitAngle: 0 }, // reduced: 2.2→1.9 (world: 20.8)
      { name: 'Callisto', radius: 0.034, distance: 2.2, speed: 0.012, orbitAngle: 0 }, // reduced: 2.9→2.2 (world: 24.1) – was reaching Saturn
    ],
    ring: [],
  },
  {
    name: "Saturn",
    radius: 9.14,
    distance: 163,
    speed: 0.000170,
    selfRotationSpeed: 0.0225,
    tilt: 0.4665,
    inclination: 0.043,           // 2.49°
    orbitAngle: 0,
    material: saturnMaterial,
    atmosphere: {
      color: 0xffeeaa,
      opacity: 0.08,
      size: 1.02,
    },
    moons: [
      { name: 'Dione', radius: 0.01, distance: 3.2, speed: 0.022, orbitAngle: 0 }, // reduced 3.5→3.2 (world: 29.2)
      { name: 'Rhea', radius: 0.014, distance: 3.6, speed: 0.017, orbitAngle: 0 }, // reduced 4.2→3.6 (world: 32.9)
      { name: 'Titan', radius: 0.044, distance: 4.2, speed: 0.012, orbitAngle: 0 }, // reduced 5.5→4.2 (world: 38.4) – was reaching Uranus
      { name: 'Iapetus', radius: 0.013, distance: 5.0, speed: 0.008, orbitAngle: 0 }, // reduced 7.5→5.0 (world: 45.7) – was going past Uranus
    ],
    ring: [
      {
        name: 'sring',
        distance: 0,
        rx: 1.5708,   // 90° – lays the ring flat in Saturn's equatorial plane
        ry: 0,
        speed: 0.030,
      }
    ],
  },
  {
    name: "Uranus",
    radius: 3.98,
    distance: 240,      // pushed out from 213 → gives Saturn's moons room (Iapetus reaches 208.7)
    speed: 0.0000595,
    selfRotationSpeed: -0.0139,
    tilt: 1.7064,
    inclination: 0.013,           // 0.77°
    orbitAngle: 0,
    material: uranusMaterial,
    atmosphere: {
      color: 0x99ffee,
      opacity: 0.10,
      size: 1.04,
    },
    moons: [
      { name: 'Miranda', radius: 0.009, distance: 1.6, speed: 0.025, orbitAngle: 0 }, // was 2× too big
      { name: 'Ariel', radius: 0.022, distance: 2.1, speed: 0.018, orbitAngle: 0 },
      { name: 'Umbriel', radius: 0.022, distance: 2.6, speed: 0.014, orbitAngle: 0 },
      { name: 'Titania', radius: 0.031, distance: 3.2, speed: 0.010, orbitAngle: 0 },
      { name: 'Oberon', radius: 0.028, distance: 3.8, speed: 0.008, orbitAngle: 0 },
    ],
    ring: [],
  },
  {
    name: "Neptune",
    radius: 3.86,
    distance: 290,      // pushed out from 246 → gives Uranus moons room (Oberon reaches 255)
    speed: 0.0000304,
    selfRotationSpeed: 0.0149,
    tilt: 0.4944,
    inclination: 0.031,           // 1.77°
    orbitAngle: 0,
    material: neptuneMaterial,
    atmosphere: {
      color: 0x3366ff,
      opacity: 0.12,
      size: 1.04,
    },
    moons: [
      { name: 'Triton', radius: 0.055, distance: 1.7, speed: -0.013, orbitAngle: 0 }, // was 27% too small
      { name: 'Proteus', radius: 0.008, distance: 2.2, speed: 0.02, orbitAngle: 0 }, // was 2× too big
      { name: 'Nereid', radius: 0.007, distance: 3.0, speed: 0.009, orbitAngle: 0 }, // was 44% too big
    ],
    ring: [],
  },
]

// ─── Scene Object Factories ───
const createPlanet = (planet) => {
  const planetMesh = new THREE.Mesh(sphereGeometry, planet.material)
  planetMesh.scale.setScalar(planet.radius)
  planetMesh.position.x = planet.distance
  if (planet.tilt) planetMesh.rotation.z = planet.tilt

  // Atmosphere glow layer
  if (planet.atmosphere) {
    const atmMat = new THREE.MeshBasicMaterial({
      color: planet.atmosphere.color,
      transparent: true,
      opacity: planet.atmosphere.opacity,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const atmMesh = new THREE.Mesh(atmosphereGeometry, atmMat)
    atmMesh.scale.setScalar(planet.atmosphere.size)
    planetMesh.add(atmMesh)  // child index 0 (if atmosphere exists)
  }

  // CSS2D name label – always faces the camera, floats above the planet
  const labelDiv = document.createElement('div');
  labelDiv.className = 'planet-label';
  labelDiv.textContent = planet.name;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 1.5, 0); // 1.5× planet radius above centre in local space
  planetMesh.add(label); // child index 0 (no atm) or 1 (with atm)

  return planetMesh
}

const MIN_MOON_WORLD_RADIUS = 0.08; // Minimum visible size in world units for any moon

const createMoon = (moon, planetRadius) => {
  // Convert minimum world-size to local space, then take whichever is larger.
  // This guarantees every moon is visible while preserving real proportions
  // between moons of the same planet.
  const minLocal = MIN_MOON_WORLD_RADIUS / planetRadius;
  const displayRadius = Math.max(moon.radius, minLocal);
  const moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial)
  moonMesh.scale.setScalar(displayRadius)
  moonMesh.position.x = moon.distance
  return moonMesh
}

const createRing = (ring) => {
  const ringMesh = new THREE.Mesh(ringGeometry, saturnringMaterial)
  ringMesh.position.x = ring.distance
  ringMesh.rotation.x = ring.rx
  ringMesh.rotation.y = ring.ry
  ringMesh.renderOrder = 1  // Draw after opaque objects to avoid depth-sort glitches
  return ringMesh
}

const planetMeshes = planets.map((planet) => {
  const planetMesh = createPlanet(planet)
  scene.add(planetMesh)

  planet.moons.forEach((moon) => {
    planetMesh.add(createMoon(moon, planet.radius))
  })

  planet.ring.forEach((ring) => {
    planetMesh.add(createRing(ring))
  })

  return planetMesh
})

// Orbit path circles for all planets — tilted to match each planet's real inclination
planets.forEach(planet => scene.add(createOrbitPath(planet.distance, planet.inclination || 0)));

// ─── Lighting ───
// Faint ambient = very subtle starlight on night-sides (was 0.00 – completely off)
const ambientLight = new THREE.AmbientLight(0x111133, 0.04)
scene.add(ambientLight)

// Sun = sole light source, warm white. intensity 2.5 (was 1 – too dim for outer planets)
const poinLight = new THREE.PointLight(0xfff5e0, 2.5, 0, 0)
scene.add(poinLight)

// ─── Camera ───
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1200  // Far plane – Neptune is at distance 246
);
camera.position.z = 270;
camera.position.y = 80;

// ─── Renderer ───
const canvas = document.querySelector("canvas.threejs");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.80;  // Was 0.50 – too dark for outer planets

// ─── CSS2D Label Renderer ───
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// ─── Orbit Controls ───
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxDistance = 800;
controls.minDistance = 5;

// ─── Speed / Pause Controls ───
let speedMultiplier = 1;
let isPaused = false;
const btnPause = document.getElementById('btn-pause');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');

btnPause?.addEventListener('click', () => {
  isPaused = !isPaused;
  btnPause.textContent = isPaused ? '▶' : '⏸';
});
speedSlider?.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value);
  if (speedLabel) speedLabel.textContent = speedMultiplier.toFixed(1) + '×';
});

// ─── Resize ───
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render Loop ───
const renderloop = () => {
  planetMeshes.forEach((planet, planetIndex) => {
    const planetData = planets[planetIndex];

    if (!isPaused) {
      // Orbit with real inclination:
      // x = r·sin(θ),  z = r·cos(θ)·cos(i),  y = r·cos(θ)·sin(i)
      planetData.orbitAngle += planetData.speed * speedMultiplier;
      const incl = planetData.inclination || 0;
      planet.position.x = Math.sin(planetData.orbitAngle) * planetData.distance;
      planet.position.z = Math.cos(planetData.orbitAngle) * planetData.distance * Math.cos(incl);
      planet.position.y = Math.cos(planetData.orbitAngle) * planetData.distance * Math.sin(incl);

      planet.rotation.y += planetData.selfRotationSpeed * speedMultiplier;
    }

    // startIdx: children added by createPlanet before moons
    //   with atmosphere → [atm(0), label(1)] → startIdx = 2
    //   without          → [label(0)]         → startIdx = 1
    const startIdx = planetData.atmosphere ? 2 : 1;

    // Animate moons
    const moonMeshes = planet.children.slice(startIdx, startIdx + planetData.moons.length);
    moonMeshes.forEach((moon, moonIndex) => {
      const moonData = planetData.moons[moonIndex];
      if (!isPaused) {
        moonData.orbitAngle += moonData.speed * speedMultiplier;
        moon.position.x = Math.sin(moonData.orbitAngle) * moonData.distance;
        moon.position.z = Math.cos(moonData.orbitAngle) * moonData.distance;
      }
    });

    // Animate rings
    if (planetData.ring.length > 0) {
      const ringMeshes = planet.children.slice(
        startIdx + planetData.moons.length,
        startIdx + planetData.moons.length + planetData.ring.length
      );
      ringMeshes.forEach((ringMesh, i) => {
        if (!isPaused && planetData.ring[i].speed !== 0) {
          ringMesh.rotation.z += planetData.ring[i].speed * speedMultiplier;
        }
      });
    }
  });

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  window.requestAnimationFrame(renderloop);
};

renderloop();

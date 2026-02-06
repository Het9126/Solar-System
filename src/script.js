import * as THREE from "three";
import { plane } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { color, distance } from "three/tsl";
import { RingGeometry } from "three/webgpu";
import { Pane } from "tweakpane";

// initialize pane
const pane = new Pane();

// initialize the scene
const scene = new THREE.Scene();

const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

cubeTextureLoader.setPath('/textures/cubeMap/')
const sunTexture = textureLoader.load('/textures/2k_sun.jpg')
const mercuryTexture = textureLoader.load('/textures/2k_mercury.jpg')
const venusTexture = textureLoader.load('/textures/2k_venus_surface.jpg')
const earthTexture = textureLoader.load('/textures/2k_earth_daymap.jpg')
const marsTexture = textureLoader.load('/textures/2k_mars.jpg')
const jupiterTexture = textureLoader.load('/textures/2k_jupiter.jpg')
const saturnTexture = textureLoader.load('/textures/2k_saturn.jpg')
const saturnringTexture = textureLoader.load('/textures/2k_saturn_ring_alpha.png')
saturnringTexture.wrapS = THREE.RepeatWrapping
saturnringTexture.wrapT = THREE.RepeatWrapping
saturnringTexture.repeat.set(1, 8);
const uranusTexture = textureLoader.load('/textures/2k_uranus.jpg')
const neptuneTexture = textureLoader.load('/textures/2k_neptune.jpg')
const moonTexture = textureLoader.load('/textures/2k_moon.jpg')
// const backgroundCubemap = textureLoader.load('/textures/neon-sumer-K8eWS_abimM-unsplash.jpg')
const backgroundCubemap = cubeTextureLoader.load([
  'px.png',
  'nx.png',
  'py.png',
  'ny.png',
  'pz.png',
  'nz.png'
])

scene.background = backgroundCubemap

const mercuryMaterial = new THREE.MeshStandardMaterial(
  {
    map: mercuryTexture
  }
)
const venusMaterial = new THREE.MeshStandardMaterial(
  {
    map: venusTexture
  }
)
const earthMaterial = new THREE.MeshStandardMaterial(
  {
    map: earthTexture
  }
)
const marsMaterial = new THREE.MeshStandardMaterial(
  {
    map: marsTexture
  }
)
const jupiterMaterial = new THREE.MeshStandardMaterial(
  {
    map: jupiterTexture
  }
)
const saturnMaterial = new THREE.MeshStandardMaterial(
  {
    map: saturnTexture
  }
)
const saturnringMaterial = new THREE.MeshBasicMaterial(
  {
    map: saturnringTexture,
    transparent: true,
    alphaMap: saturnringTexture,
    // alphaTest: 0.1,
    side: THREE.DoubleSide,
    // opacity: 0.8
    depthWrite: false
  }
)
const uranusMaterial = new THREE.MeshStandardMaterial(
  {
    map: uranusTexture
  }
)
const neptuneMaterial = new THREE.MeshStandardMaterial(
  {
    map: neptuneTexture
  }
)
const moonMaterial = new THREE.MeshStandardMaterial(
  {
    map: moonTexture
  }
)

// add stuff here
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const innerRadius = 1.5;
const outerRadius = 3;
const thetaSegments = 64; // Higher value for smoother ring
const phiSegments = 1;
const ringGeometry = new THREE.RingGeometry(1.5, 3, 64);
const position = ringGeometry.attributes.position;
const uvs = ringGeometry.attributes.uv;
const vertex = new THREE.Vector3();

for (let i = 0; i < position.count; i++) {

  vertex.fromBufferAttribute(position, i);

  // distance from center
  const dist = vertex.length();

  // ⭐ radial mapping
  const v = (dist - innerRadius) / (outerRadius - innerRadius);

  // ⭐ repeat texture around ring
  const angle = Math.atan2(vertex.y, vertex.x);
  const u = (angle + Math.PI) / (Math.PI * 2);

  uvs.setXY(i, v, u); // 👈 notice SWAPPED (v,u)
}

ringGeometry.attributes.uv.needsUpdate = true;

const sunMaterial = new THREE.MeshBasicMaterial({
  map: sunTexture
})
const sun = new THREE.Mesh(sphereGeometry, sunMaterial)
sun.scale.setScalar(8)
scene.add(sun)

const planets = [
  {
    name: "Mercury",
    radius: 0.5,
    distance: 10,
    speed: 0.01,
    material: mercuryMaterial,
    moons: [],
    ring: [],
  },
  {
    name: "Venus",
    radius: 0.9,
    distance: 15,
    speed: 0.008,
    material: venusMaterial,
    moons: [],
    ring: [],
  },
  {
    name: 'Earth',
    radius: 1,
    distance: 20,
    speed: 0.005,
    material: earthMaterial,
    moons: [
      {
        name: 'Moon',
        radius: 0.3,
        distance: 3,
        speed: 0.015,
      }
    ],
    ring: [],
  },
  {
    name: 'Mars',
    radius: 0.4,
    distance: 25,
    speed: 0.003,
    material: marsMaterial,
    moons: [
      {
        name: 'Phobos',
        radius: 0.2,
        distance: 2,
        speed: 0.02,
      },
      {
        name: 'Deimos',
        radius: 0.1,
        distance: 3,
        speed: 0.015,
        color: 0xffffff,
      }
    ],
    ring: [],
  },
  {
    name: "Jupiter",
    radius: 3.1,
    distance: 41,
    speed: 0.002,
    material: jupiterMaterial,
    moons: [
      {
        name: 'Io',
        radius: 0.1,
        distance: 3.5,
        speed: 0.02,
      },
      {
        name: 'Europa',
        radius: 0.07,
        distance: 4.5,
        speed: 0.017,
        color: 0xffffff,
      },
      {
        name: 'Ganymede',
        radius: 0.2,
        distance: 1.5,
        speed: 0.015,
      },
      {
        name: 'Callisto',
        radius: 0.18,
        distance: 2.5,
        speed: 0.013,
        color: 0xffffff,
      }
    ],
    ring: [],
  },
  {
    name: "Saturn",
    radius: 2.3,
    distance: 68,
    speed: 0.0016,
    material: saturnMaterial,
    moons: [
      {
        name: 'Dione',
        radius: 0.07,
        distance: 1.5,
        speed: 0.018,
      },
      {
        name: 'Rhea',
        radius: 0.18,
        distance: 2.5,
        speed: 0.015,
        color: 0xffffff,
      },
      {
        name: 'Titan',
        radius: 0.2,
        distance: 3.5,
        speed: 0.012,
      },
      {
        name: 'Iapetus',
        radius: 0.1,
        distance: 4.5,
        speed: 0.010,
        color: 0xffffff,
      }
    ],
    ring: [
      {
        name: 'sring',
        distance: 0,
        rx: 1.5708,
        ry: 0.51,
        speed: 0
      }
    ],
  },
  {
    name: "Uranus",
    radius: 1.6,
    distance: 91,
    speed: 0.0011,
    material: uranusMaterial,
    moons: [
      {
        name: 'Miranda',
        radius: 0.07,
        distance: 1.5,
        speed: 0.02,
      },
      {
        name: 'Ariel',
        radius: 0.1,
        distance: 2.5,
        speed: 0.017,
        color: 0xffffff,
      },
      {
        name: 'Umbriel',
        radius: 0.1,
        distance: 3.5,
        speed: 0.014,
      },
      {
        name: 'Titania',
        radius: 0.2,
        distance: 4.5,
        speed: 0.011,
        color: 0xffffff,
      },
      {
        name: 'Oberon',
        radius: 0.18,
        distance: 5.5,
        speed: 0.009,
        color: 0xffffff,
      },
    ],
    ring: [],
  },
  {
    name: "Neptune",
    radius: 1.6,
    distance: 107,
    speed: 0.0009,
    material: neptuneMaterial,
    moons: [
      {
        name: 'Triton',
        radius: 0.2,
        distance: 1.5,
        speed: 0.011,
      },
      {
        name: 'Proteus',
        radius: 0.1,
        distance: 2.5,
        speed: 0.016,
        color: 0xffffff,
      },
      {
        name: 'Nereid',
        radius: 0.07,
        distance: 3.5,
        speed: 0.008,
      },
    ],
    ring: [],
  },
]

const createPlanet = (planet) => {
  const planetMesh = new THREE.Mesh(
    sphereGeometry,
    planet.material
  )
  planetMesh.scale.setScalar(planet.radius)
  planetMesh.position.x = planet.distance
  return planetMesh
}

const createMoon = (moon) => {
  const moonMesh = new THREE.Mesh(
    sphereGeometry,
    moonMaterial
  )
  moonMesh.scale.setScalar(moon.radius)
  moonMesh.position.x = moon.distance
  return moonMesh
}

const createRing = (ring) => {
  const ringMesh = new THREE.Mesh(
    ringGeometry,
    saturnringMaterial
  )
  ringMesh.position.x = ring.distance
  ringMesh.rotation.x = ring.rx
  ringMesh.rotation.y = ring.ry
  return ringMesh
}

const planetMeshes = planets.map((planet) => {
  const planetMesh = createPlanet(planet)
  scene.add(planetMesh)

  planet.moons.forEach((moon) => {
    const moonMesh = createMoon(moon)
    planetMesh.add(moonMesh)
  })
  // return planetMesh

  planet.ring.forEach((ring) => {
    const ringMesh = createRing(ring)
    planetMesh.add(ringMesh)
  })
  return planetMesh
})

const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.06
)
scene.add(ambientLight)

const poinLight = new THREE.PointLight(
  0xffffff,
  400
)
scene.add(poinLight)

// initialize the camera
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.z = 100;
camera.position.y = 5;

// initialize the renderer
const canvas = document.querySelector("canvas.threejs");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// add controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxDistance = 200;
controls.minDistance = 20

// add resize listener
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// render loop
const renderloop = () => {
  planetMeshes.forEach((planet, planetIndex) => {
    planet.rotation.y += planets[planetIndex].speed
    planet.position.x = Math.sin(planet.rotation.y) * planets[planetIndex].distance
    planet.position.z = Math.cos(planet.rotation.y) * planets[planetIndex].distance
    const moonMeshes = planet.children.slice(0, planets[planetIndex].moons.length)
    moonMeshes.forEach((moon, moonIndex) => {
      moon.rotation.y += planets[planetIndex].moons[moonIndex].speed
      moon.position.x = Math.sin(moon.rotation.y) * planets[planetIndex].moons[moonIndex].distance
      moon.position.z = Math.cos(moon.rotation.y) * planets[planetIndex].moons[moonIndex].distance
    })
  })
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(renderloop);
};


renderloop();

// version 0.0.8

let scene, camera, renderer;
let yaw = 0, pitch = 0;
let outline = null;
let outlinedBlock = null;


const clock = new THREE.Clock();

const keys = {};
const blocks = [];
const meshes = [];

const raycaster = new THREE.Raycaster();
const mouseCenter = new THREE.Vector2(0, 0);

const GRAVITY = -20;
const JUMP_FORCE = 7.1;
const WALK_SPEED = 4.317;
const REACH = 4;

//textures
const textureLoader = new THREE.TextureLoader();

const TEX_DIRT = textureLoader.load(
  "https://raw.githubusercontent.com/guimaraesbernardo2021-afk/texture/0de9f9db20cf96c02c9a865bbe5593094e3994a4/Dirt_10-128x128.png"
);

const TEX_GRASS = textureLoader.load(
  "https://raw.githubusercontent.com/guimaraesbernardo2021-afk/texture/0de9f9db20cf96c02c9a865bbe5593094e3994a4/Dirt_20-128x128.png"
);

const TEX_STONE = textureLoader.load(
  "https://raw.githubusercontent.com/guimaraesbernardo2021-afk/texture/0de9f9db20cf96c02c9a865bbe5593094e3994a4/Stone_13-128x128.png"
);

const TEX_PLAYER_BLOCK = textureLoader.load(
  "https://raw.githubusercontent.com/guimaraesbernardo2021-afk/texture/0de9f9db20cf96c02c9a865bbe5593094e3994a4/Metal_18-128x128.png"
);


const player = {
  width: 0.6,
  height: 1.8,
  velocityY: 0,
  onGround: false
};

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 0, 120);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x87CEEB);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(100, 200, 100);
  scene.add(sun);

  generateWorld();
  camera.position.set(16, 28, 26);

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", e => keys[e.code] = true);
  document.addEventListener("keyup", e => keys[e.code] = false);

  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    document.body.classList.toggle(
      "locked",
      document.pointerLockElement === document.body
    );
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("contextmenu", e => e.preventDefault());
}

function onMouseMove(e) {
  if (document.pointerLockElement !== document.body) return;

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
}

function onMouseDown(e) {
  if (document.pointerLockElement !== document.body) return;
  if (e.button === 0) breakBlock();
  if (e.button === 2) placeBlock();
}

function generateWorld() {
  const SIZE = 28;
  const HEIGHT = 16;

  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      for (let y = 0; y < HEIGHT; y++) {

        let tex =
    y === HEIGHT - 1 ? TEX_GRASS :
    y > HEIGHT - 4 ? TEX_DIRT :
    TEX_STONE;

  addBlock(x, y, z, tex);
}
    }
  }
}

function addBlock(x, y, z, texture) {
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    material
  );

  mesh.position.set(x, y, z);
  scene.add(mesh);

  meshes.push(mesh);
  blocks.push({
    mesh,
    minX: x - 0.5, maxX: x + 0.5,
    minY: y - 0.5, maxY: y + 0.5,
    minZ: z - 0.5, maxZ: z + 0.5
  });
}

function hasBlockBelow(x, y, z) {
  for (const b of blocks) {
    if (b.x === x && b.y === y - 1 && b.z === z) {
      return true;
    }
  }
  return false;
}


function breakBlock() {
  raycaster.setFromCamera(mouseCenter, camera);
  raycaster.far = REACH;

  const hits = raycaster.intersectObjects(meshes);
  if (!hits.length) return;

  const i = meshes.indexOf(hits[0].object);
  scene.remove(meshes[i]);
  meshes.splice(i, 1);
  blocks.splice(i, 1);
}

function placeBlock() {
  raycaster.setFromCamera(mouseCenter, camera);
  raycaster.far = REACH;

  const hits = raycaster.intersectObjects(meshes);
  if (!hits.length) return;

  const hit = hits[0];
  const n = hit.face.normal;
  const p = hit.object.position;

  addBlock(
  p.x + n.x,
  p.y + n.y,
  p.z + n.z,
  TEX_PLAYER_BLOCK
);
}

function updateOutline() {
  raycaster.setFromCamera(mouseCenter, camera);
  raycaster.far = REACH;

  const hits = raycaster.intersectObjects(meshes);

  if (!hits.length) {
    if (outline) {
      scene.remove(outline);
      outline = null;
      outlinedBlock = null;
    }
    return;
  }

  const target = hits[0].object;

  if (outlinedBlock === target) return;

  // remove outline antigo
  if (outline) {
    scene.remove(outline);
  }

  const edges = new THREE.EdgesGeometry(target.geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1
  });

  outline = new THREE.LineSegments(edges, material);
  outline.position.copy(target.position);

  scene.add(outline);
  outlinedBlock = target;
}


function checkCollision(box) {
  for (const b of blocks) {
    if (
      box.maxX > b.minX && box.minX < b.maxX &&
      box.maxY > b.minY && box.minY < b.maxY &&
      box.maxZ > b.minZ && box.minZ < b.maxZ
    ) return b;
  }
  return null;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const safeDelta = Math.min(delta, 0.05);

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const forward = {
    x: -Math.sin(yaw),
    z: -Math.cos(yaw)
  };

  const right = {
    x: Math.cos(yaw),
    z: -Math.sin(yaw)
  };

  let moveX = 0;
  let moveZ = 0;

  if (keys["KeyW"]) { moveX += forward.x; moveZ += forward.z; }
  if (keys["KeyS"]) { moveX -= forward.x; moveZ -= forward.z; }
  if (keys["KeyA"]) { moveX -= right.x;   moveZ -= right.z; }
  if (keys["KeyD"]) { moveX += right.x;   moveZ += right.z; }

  // ⬇️ GRAVIDADE PRIMEIRO
  player.onGround = false;
  player.velocityY += GRAVITY * safeDelta;
  moveAxis("y", player.velocityY * safeDelta);

  // ⬇️ DEPOIS MOVIMENTO HORIZONTAL
  moveAxis("x", moveX * WALK_SPEED * safeDelta);
  moveAxis("z", moveZ * WALK_SPEED * safeDelta);

  if (keys["Space"] && player.onGround) {
    player.velocityY = JUMP_FORCE;
    player.onGround = false;
  }

  if (camera.position.y < -30) {
    camera.position.set(16, 28, 26);
    player.velocityY = 0;
  }
updateOutline();
  renderer.render(scene, camera);
}

function moveAxis(axis, amount) {
  camera.position[axis] += amount;

  const box = {
    minX: camera.position.x - player.width / 2,
    maxX: camera.position.x + player.width / 2,
    minY: camera.position.y - player.height,
    maxY: camera.position.y,
    minZ: camera.position.z - player.width / 2,
    maxZ: camera.position.z + player.width / 2
  };

  const hit = checkCollision(box);
  if (!hit) return;

  if (axis === "y" && amount < 0) {
    camera.position.y = hit.maxY + player.height;
    player.velocityY = 0;
    player.onGround = true;
  } else {
    camera.position[axis] -= amount;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TextureLoader } from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 3, 7);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fpsDisplay = document.createElement("div");
fpsDisplay.style.position = "absolute";
fpsDisplay.style.top = "10px";
fpsDisplay.style.right = "10px";
fpsDisplay.style.fontSize = "16px";
fpsDisplay.style.color = "#ffffff";
document.body.appendChild(fpsDisplay);

// Set the background color to a sky blue color
scene.background = new THREE.Color(0x0099ff);

// Create a directional light to simulate sunlight
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(20, 20, -20);
sun.castShadow = true;
sun.shadow.mapSize.width = 4096 * 2;
sun.shadow.mapSize.height = 4096 * 2;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 500;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.radius = 1;
scene.add(sun);

// const cameraHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(cameraHelper);

// Create an ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 2); // color and intensity
scene.add(ambientLight);

// Enable shadows for the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add player, ground, and obstacles
const groundGeometry = new THREE.BoxGeometry(120, 0.2, 10);
// const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });

// Load the texture
const textureLoader = new TextureLoader();
const groundTexture = textureLoader.load("r_road01.png");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(1, 30);
groundTexture.rotation = Math.PI / 2;

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = 0;
scene.add(ground);

const cloudTexture = textureLoader.load("cloud.png");

function spawnCloud() {
  const cloudMaterial = new THREE.SpriteMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.8,
  });

  const cloud = new THREE.Sprite(cloudMaterial);
  cloud.position.set(
    Math.random() * 200 - 100,
    Math.random() * 60 - 30,
    Math.random() * 200 - 100
  );
  cloud.scale.set(10, 5, 1);
  scene.add(cloud);
}

for (let i = 0; i < 200; i++) {
  spawnCloud();
}

const marbleDiffuseTexture = new THREE.TextureLoader().load(
  "White_Marble_003_COLOR.jpg"
);
const marbleDisplacementTexture = new THREE.TextureLoader().load(
  "White_Marble_003_DISP.jpg"
);
const marbleNormalTexture = new THREE.TextureLoader().load(
  "White_Marble_003_NRM.jpg"
);
const marbleOcclusionTexture = new THREE.TextureLoader().load(
  "White_Marble_003_OCC.jpg"
);
const marbleSpecularTexture = new THREE.TextureLoader().load(
  "White_Marble_003_SPEC.jpg"
);
marbleDiffuseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
marbleDisplacementTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
marbleNormalTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
marbleOcclusionTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
marbleSpecularTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const playerSize = 1;
const playerGeometry = new THREE.SphereGeometry(playerSize / 2, 32, 32);
const playerMaterial = new THREE.MeshStandardMaterial({
  map: marbleDiffuseTexture,
  displacementMap: marbleDisplacementTexture,
  displacementScale: 0.05,
  normalMap: marbleNormalTexture,
  aoMap: marbleOcclusionTexture,
  aoMapIntensity: 1.0,
  specularMap: marbleSpecularTexture,
  roughness: 0.3,
  metalness: 0.1,
});

const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = playerSize / 2 + groundGeometry.parameters.height / 2;
scene.add(player);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, player.position.y, 0);
controls.enablePan = false;
controls.enableZoom = false;

// Enable shadows for the player and ground meshes
player.castShadow = true;
player.receiveShadow = true;
ground.castShadow = false;
ground.receiveShadow = true;

// Add basic game logic
let playerSpeed = 0;
let initialJumpSpeed = 0.25;
let gravity = -0.008;
let obstacleSpeed = 0.08;
let jumping = false;
let gameOver = false;
const obstacles = [];
let spawnInterval = null;
let score = 0;
let groundSpeed = 0.02;
let playerRotationSpeed = 1.5;

// Create a new HTML element to display the score
const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "absolute";
scoreDisplay.style.top = "10px";
scoreDisplay.style.left = "10px";
scoreDisplay.style.fontSize = "24px";
scoreDisplay.style.color = "#ffffff";
document.body.appendChild(scoreDisplay);

const brickWallTextureTopBottom = textureLoader.load("brick_wall.png");
brickWallTextureTopBottom.wrapS = THREE.RepeatWrapping;
brickWallTextureTopBottom.wrapT = THREE.RepeatWrapping;

const brickWallTextureSides = textureLoader.load("brick_wall.png");
brickWallTextureSides.wrapS = THREE.RepeatWrapping;
brickWallTextureSides.wrapT = THREE.RepeatWrapping;

const brickWallTextureFrontBack = textureLoader.load("brick_wall.png");
brickWallTextureFrontBack.wrapS = THREE.RepeatWrapping;
brickWallTextureFrontBack.wrapT = THREE.RepeatWrapping;

const obstacleMaterialTopBottom = new THREE.MeshStandardMaterial({
  map: brickWallTextureTopBottom,
});
const obstacleMaterialSides = new THREE.MeshStandardMaterial({
  map: brickWallTextureSides,
});
const obstacleMaterialFrontBack = new THREE.MeshStandardMaterial({
  map: brickWallTextureFrontBack,
});

// Adjust the repeat values as needed
obstacleMaterialTopBottom.map.repeat.set(1, groundGeometry.parameters.depth);
obstacleMaterialFrontBack.map.repeat.set(groundGeometry.parameters.depth, 1);
obstacleMaterialSides.map.repeat.set(1, 1);

// Function to spawn a new obstacle
function spawnObstacle() {
  const groundLength = groundGeometry.parameters.depth;
  const obstacleGeometry = new THREE.BoxGeometry(1, 1, groundLength);

  // Create an array of materials for each side of the obstacle
  const materials = [
    obstacleMaterialFrontBack,
    obstacleMaterialFrontBack,
    obstacleMaterialTopBottom,
    obstacleMaterialTopBottom,
    obstacleMaterialSides,
    obstacleMaterialSides,
  ];

  const obstacle = new THREE.Mesh(obstacleGeometry, materials);

  // Enable shadows for the obstacle
  obstacle.castShadow = true;
  obstacle.receiveShadow = true;

  obstacle.position.set(60, 0.5 + groundGeometry.parameters.height / 2, 0);
  scene.add(obstacle);
  obstacles.push(obstacle);
}

function startSpawningObstacles() {
  // Clear any existing interval
  if (spawnInterval) {
    clearInterval(spawnInterval);
  }
  // Use setInterval to call spawnObstacle
  spawnInterval = setInterval(() => {
    if (!gameOver) {
      // Check if the game is not over before spawning an obstacle
      spawnObstacle();
    }
    // Update the interval duration for the next obstacle
    clearInterval(spawnInterval);
    startSpawningObstacles();
  }, 1000 + Math.random() * 2000);
}

startSpawningObstacles();

function checkCollision(obstacle) {
  const sphereCenter = player.position.clone();
  const sphereRadius = playerSize / 2;

  const obstacleBox = new THREE.Box3().setFromObject(obstacle);

  // Find the point on the obstacle box that is closest to the sphere center
  const closestPoint = new THREE.Vector3();
  obstacleBox.clampPoint(sphereCenter, closestPoint);

  // Calculate the distance between the closest point and the sphere center
  const distanceSquared = closestPoint.distanceToSquared(sphereCenter);

  // Check if the distance is less than or equal to the square of the sphere radius
  return distanceSquared <= sphereRadius * sphereRadius;
}

let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function gameLoop() {
  if (!gameOver) {
    groundTexture.offset.y -= groundSpeed;
    if (jumping) {
      playerSpeed += gravity;
      player.position.y += playerSpeed;

      if (
        player.position.y <=
        playerSize / 2 + groundGeometry.parameters.height / 2
      ) {
        player.position.y =
          playerSize / 2 + groundGeometry.parameters.height / 2;
        playerSpeed = 0;
        jumping = false;
      }
    }

    for (const obstacle of obstacles) {
      obstacle.position.x -= obstacleSpeed;

      // Check if the player has successfully jumped over the obstacle
      if (
        obstacle.position.x < player.position.x - playerSize / 2 &&
        !obstacle.jumpedOver
      ) {
        obstacle.jumpedOver = true;
        score++;
      }

      if (obstacle.position.x < -60) {
        scene.remove(obstacle);
        obstacles.shift();
      }
      if (checkCollision(obstacle)) {
        gameOver = true;
        console.log("Game Over");
      }
    }

    // Update the score display
    scoreDisplay.innerHTML = `Score: ${score}`;
  } else {
    // Only update OrbitControls when the game is over
    controls.update();

    // Display the final score and the option to restart the game
    scoreDisplay.innerHTML = `Final Score: ${score}<br>Press R to restart`;
  }
  // Calculate and display FPS
  frameCount++;
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;

  if (deltaTime >= 1000) {
    // Update FPS display every second
    fps = frameCount / (deltaTime / 1000);
    fpsDisplay.innerHTML = `FPS: ${fps.toFixed(2)}`;
    frameCount = 0;
    lastTime = currentTime;
  }

  if (!gameOver) {
    // Calculate the rotation amount based on the distance traveled
    let distanceTraveled = obstacleSpeed * playerRotationSpeed;
    player.rotation.z -= distanceTraveled;
  }

  requestAnimationFrame(gameLoop);
  renderer.render(scene, camera);
}

function resetGame() {
  gameOver = false;
  player.position.y = playerSize / 2 + groundGeometry.parameters.height / 2;
  playerSpeed = 0;
  obstacles.forEach((obstacle) => {
    scene.remove(obstacle);
  });
  obstacles.length = 0;
  score = 0;
  // Restart the spawnInterval with startSpawningObstacles
  startSpawningObstacles();
}

function onKeyDown(event) {
  if (event.code === "Space" && !jumping) {
    jumping = true;
    playerSpeed = initialJumpSpeed;
  }
  if (event.code === "KeyR" && gameOver) {
    resetGame();
  }
}

window.addEventListener("keydown", onKeyDown, false);

gameLoop();

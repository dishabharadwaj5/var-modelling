import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
scene.add(camera);

//lighting 
scene.add(new THREE.AmbientLight(0xffd4a3, 1.0)); // Warm ambient light
const sun = new THREE.DirectionalLight(0xfff5e6, 3.5); // Warm sunlight
sun.position.set(15, 25, 10);
sun.castShadow = true;

// shadow settings 
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 50;
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
sun.shadow.bias = -0.001;

scene.add(sun);

// this adds subtle fill light in opposite direction 
const fillLight = new THREE.DirectionalLight(0xa3c1ff, 0.6); // Cool fill
fillLight.position.set(-10, 10, -10);
scene.add(fillLight);

// keyboard controls
const keys = { w: false, a: false, s: false, d: false, e: false, c: false };

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false;
});

// mouse orbiting 
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) isDragging = true;
});
window.addEventListener("mouseup", () => (isDragging = false));

canvas.addEventListener("mousemove", e => {
  if (isFirstPerson) {
    // first person: don't need click it orbits based on mouse movement 
    const dx = e.movementX || e.clientX - prevMouse.x;
    const dy = e.movementY || e.clientY - prevMouse.y;

    rotation.y -= dx * 0.003;
    rotation.x -= dy * 0.003;

    rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotation.x));
  } else if (isDragging) {
    // third-person: click and drag orbit
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;

    rotation.y -= dx * 0.003;
    rotation.x -= dy * 0.003;

    rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotation.x));
  }
  prevMouse = { x: e.clientX, y: e.clientY };
});

// vars 
const moveSpeed = 4;
let prevTime = performance.now();
let roomBox = null;
let floorY = 0;

let student = null;
let studentBaseY = 0;

let isFirstPerson = false;
let isSitting = false;

// camera's position
let targetCameraPosition = new THREE.Vector3();
let targetCameraRotation = new THREE.Euler();
const cameraSmoothness = 0.15;

// loads the room_final.glb 
const loader = new GLTFLoader();
let brownSeating = null;
let seatingBox = null;
let redBoard = null;
let boardBox = null;
let isNearBoard = false;
let isTypingOnBoard = false;
let boardText = "";

loader.load("./room_final.glb", gltf => {
  const model = gltf.scene;
  scene.add(model);

  // Enable shadows on all meshes
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y -= 8;

  roomBox = new THREE.Box3().setFromObject(model);
  floorY = roomBox.min.y;
  
  // this identifies objects by color in the room and does the collision 
  model.traverse(child => {
    if (child.isMesh) {
      console.log("Mesh name:", child.name, "Material:", child.material?.name);
      
      // Target the laminate material (brown seating) and makes sure user can not pass through it
      if (child.material && child.material.name === "Laminate") {
        console.log("Found brown seating:", child.name);
        brownSeating = child;
        seatingBox = new THREE.Box3().setFromObject(child);
        console.log("Seating bounds:", seatingBox);
        
        // Apply wood texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3);
            
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              color: 0x6b4423,
              roughness: 0.85,
              metalness: 0.0
            });
            console.log("Wood texture applied to brown seating");
          }
        );
      }
      
      //  this identifies the red pin board 
      if (child.material && child.material.color) {
        const color = child.material.color;
        // Check if reddish (high red, low green/blue)
        if (color.r > 0.5 && color.g < 0.3 && color.b < 0.3) {
          console.log("Found red board:", child.name);
          redBoard = child;
          boardBox = new THREE.Box3().setFromObject(child);
          console.log("Board bounds:", boardBox);
        }
        
        // Check for brown padding/base (brownish color detection)
        if (color.r > 0.2 && color.r < 0.5 && 
            color.g > 0.15 && color.g < 0.4 && 
            color.b > 0.05 && color.b < 0.25) {
          console.log("Found brown padding:", child.name);
        
        }
      }
    }
  });
});

// loads the charecter lowpolyperson
loader.load("./models/low_poly_person/scene.gltf", gltf => {
  student = gltf.scene;
  student.scale.set(0.001, 0.001, 0.001);
  
  // makes the charecter have shadows 
  student.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  scene.add(student);

  const wait = setInterval(() => {
    if (!roomBox) return;
    clearInterval(wait);

    const spawnX = (roomBox.min.x + roomBox.max.x) / 2;
    const spawnZ = (roomBox.min.z + roomBox.max.z) / 2;
    const realFloorY = -8;

    student.position.set(spawnX, realFloorY - 1.1, spawnZ);
    studentBaseY = student.position.y;
  }, 20);
});

// first & third person camera offset 
const thirdPersonOffset = new THREE.Vector3(0, 0.5, -1.2);
const firstPersonOffset = new THREE.Vector3(0, 0.45, 0.2);

// stand toggle 
function toggleSit() {
  if (!student) return;

  if (!isSitting) {
    // SIT
    student.rotation.x = -Math.PI / 2.4;
    student.position.y = studentBaseY + 0.3;
    isSitting = true;
  } else {
    // STAND
    student.rotation.x = 0;
    student.position.y = studentBaseY;
    isSitting = false;
  }
}

// ===== Camera Follow (Handles FP + TP) =====
function updateCamera() {
  if (!student) return;

  if (isFirstPerson) {
    // FIRST-PERSON CAMERA with smoothing
    const head = student.position.clone().add(firstPersonOffset);
    
    // Smooth position interpolation
    targetCameraPosition.copy(head);
    camera.position.lerp(targetCameraPosition, cameraSmoothness);
    
    // Smooth rotation interpolation
    targetCameraRotation.set(rotation.x, rotation.y, 0);
    camera.rotation.x += (targetCameraRotation.x - camera.rotation.x) * cameraSmoothness;
    camera.rotation.y += (targetCameraRotation.y - camera.rotation.y) * cameraSmoothness;
    camera.rotation.z = 0;

  } else {
    // THIRD-PERSON CAMERA
    const offset = thirdPersonOffset.clone();

    const sinY = Math.sin(rotation.y);
    const cosY = Math.cos(rotation.y);
    const sinX = Math.sin(rotation.x);

    const rotated = new THREE.Vector3(
      offset.z * sinY + offset.x * cosY,
      offset.y + offset.z * sinX,
      offset.z * cosY - offset.x * sinY
    );

    camera.position.copy(student.position.clone().add(rotated));
    camera.lookAt(student.position.x, student.position.y + 0.25, student.position.z);
  }
}

// ===== Animate Loop =====
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = (now - prevTime) / 1000;
  prevTime = now;

  // POV Toggle
  if (keys.c) {
    isFirstPerson = !isFirstPerson;
    keys.c = false;
  }

  if (student) {
    const move = new THREE.Vector3();

    if (!isSitting) {
      if (keys.w) move.z += 1;
      if (keys.s) move.z -= 1;
      if (keys.a) move.x -= 1;
      if (keys.d) move.x += 1;
    }

    if (move.lengthSq() > 0 && !isSitting) {
      move.normalize().multiplyScalar(moveSpeed * delta);

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // Store old position for collision check
      const oldPosition = student.position.clone();

      student.position.addScaledVector(forward, move.z);
      student.position.addScaledVector(right, move.x);

      // Collision detection: keep character inside room bounds
      if (roomBox) {
        const margin = 0.1; // Distance from wall
        
        // Clamp X position
        if (student.position.x < roomBox.min.x + margin) {
          student.position.x = roomBox.min.x + margin;
        }
        if (student.position.x > roomBox.max.x - margin) {
          student.position.x = roomBox.max.x - margin;
        }
        
        // Clamp Z position
        if (student.position.z < roomBox.min.z + margin) {
          student.position.z = roomBox.min.z + margin;
        }
        if (student.position.z > roomBox.max.z - margin) {
          student.position.z = roomBox.max.z - margin;
        }
      }

      // Brown seating collision - can't walk through it
      if (seatingBox) {
        const seatMargin = 0.05;
        
        // Check if character is colliding with seating from any side
        if (student.position.x + seatMargin > seatingBox.min.x &&
            student.position.x - seatMargin < seatingBox.max.x &&
            student.position.z + seatMargin > seatingBox.min.z &&
            student.position.z - seatMargin < seatingBox.max.z) {
          
          // Push character back based on which side they came from
          const fromLeft = oldPosition.x < seatingBox.min.x;
          const fromRight = oldPosition.x > seatingBox.max.x;
          const fromFront = oldPosition.z < seatingBox.min.z;
          const fromBack = oldPosition.z > seatingBox.max.z;
          
          if (fromLeft) student.position.x = seatingBox.min.x - seatMargin;
          else if (fromRight) student.position.x = seatingBox.max.x + seatMargin;
          
          if (fromFront) student.position.z = seatingBox.min.z - seatMargin;
          else if (fromBack) student.position.z = seatingBox.max.z + seatMargin;
        }
      }

      // Rotate character to face movement direction
      const movementDirection = new THREE.Vector3();
      movementDirection.addScaledVector(forward, move.z);
      movementDirection.addScaledVector(right, move.x);
      
      if (movementDirection.lengthSq() > 0) {
        const targetAngle = Math.atan2(movementDirection.x, movementDirection.z);
        student.rotation.y = targetAngle;
      }
    }

    // Check proximity to red board
    if (boardBox && !isSitting) {
      const distToBoard = student.position.distanceTo(
        new THREE.Vector3(
          (boardBox.min.x + boardBox.max.x) / 2,
          student.position.y,
          (boardBox.min.z + boardBox.max.z) / 2
        )
      );
      isNearBoard = distToBoard < 2.0;
    } else {
      isNearBoard = false;
    }

    // Board interaction
    if (keys.e && isNearBoard && !isSitting) {
      isTypingOnBoard = !isTypingOnBoard;
      if (isTypingOnBoard) {
        document.getElementById('boardUI').style.display = 'flex';
        document.getElementById('boardInput').focus();
      } else {
        document.getElementById('boardUI').style.display = 'none';
      }
      keys.e = false;
    }
    // Sit / Stand (only if not near board)
    else if (keys.e && !isNearBoard) {
      toggleSit();
      keys.e = false;
    }

    // Update prompt visibility
    if (isNearBoard && !isTypingOnBoard && !isSitting) {
      document.getElementById('boardPrompt').style.display = 'block';
    } else {
      document.getElementById('boardPrompt').style.display = 'none';
    }

    // Keep student on floor
    if (!isSitting) {
      student.position.y = studentBaseY;
    }

    updateCamera();
  }

  renderer.render(scene, camera);
}

animate();

// ===== Board UI Handlers =====
document.getElementById('boardClose').addEventListener('click', () => {
  isTypingOnBoard = false;
  document.getElementById('boardUI').style.display = 'none';
});

document.getElementById('boardInput').addEventListener('input', (e) => {
  boardText = e.target.value;
});

// Prevent WASD keys from typing in the textarea
document.getElementById('boardInput').addEventListener('keydown', (e) => {
  e.stopPropagation();
});

// ===== Resize =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
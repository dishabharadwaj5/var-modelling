# Interactive 3D Virtual Room

An immersive 3D virtual environment built with Three.js featuring a navigable classroom (the design room of PES UNVIERSITY) with character controls, interactive objects, and realistic lighting. 

## Features

- **Dual Camera Modes**: Seamlessly switch between first-person and third-person views
- **Character Controls**: WASD movement with camera-relative direction and character body rotation
- **Collision Detection**: Realistic wall and object collision using bounding boxes
- **Interactive Board**: Walk up to the red board and write text that appears in the scene using E key 
- **Realistic Lighting**: Warm sunlight with shadows, ambient lighting, and cinematic tone mapping
- **Wood Textures**: Dynamic texture loading for furniture with material detection

## Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move character (forward/left/backward/right) |
| **Mouse** | First-person: Free look / Third-person: Click + drag to orbit |
| **E** | interact with board |
| **C** | Toggle between first-person and third-person camera |

## Project Structure

```
arvr_proj/
├── index.html           # Main HTML file
├── main.js              # Three.js application logic
├── room_final.glb       # 3D room model
├── models/
│   └── low_poly_person/ # Character model
│       └── scene.gltf
└── three/               # Three.js library (not included in repo)
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/dishabharadwaj5/var-modelling.git
cd var-modelling
```

### 2. Download Three.js

Since the `three/` folder is not included in the repository, download it separately:

**Option A: Download from Three.js website**
1. Go to [threejs.org](https://threejs.org/)
2. Download the latest release
3. Extract and place the `three/` folder in the project root

**Option B: Use CDN (Recommended)**

Update your `index.html` import map to use CDN:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/examples/jsm/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
```

### 3. Run a Local Server

Three.js requires a local server to load models. Use one of these methods:

**Python:**
```bash
python -m http.server 8001
```

**Node.js (http-server):**
```bash
npx http-server -p 8001
```

**VS Code Live Server Extension:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 4. Open in Browser

Navigate to `http://localhost:8001` in your web browser.

## Technical Details

### Technologies Used
- **Three.js** - 3D graphics library
- **WebGL** - Browser-based 3D rendering
- **GLTFLoader** - Loading 3D models
- **JavaScript ES6** - Modern JavaScript features

### Key Features Implementation

**Lighting System:**
- Warm ambient light (0xffd4a3, intensity 1.0)
- Directional sunlight with shadows (2048x2048 shadow maps)
- Cool fill light for depth and contrast
- ACES Filmic tone mapping for cinematic look

**Collision Detection:**
- Room boundary detection with 0.1 unit margin
- Object-specific collision for brown seating using material name detection
- Bounding box calculations for precise collision

**Material Detection:**
- Identifies objects by material name ("Laminate" for seating)
- RGB color analysis for red board detection (r > 0.5, g < 0.3, b < 0.3)
- Dynamic texture loading for wood surfaces

**Camera System:**
- First-person: Smooth interpolation (lerp) at 15% smoothness
- Third-person: 1.2 units behind, 0.5 units above character
- Mouse sensitivity: 0.003 for comfortable control
- Vertical rotation clamped to ±45° to prevent disorientation

## Troubleshooting

**Models not loading:**
- Ensure you're running a local server (not opening HTML directly)
- Check browser console for errors
- Verify `room_final.glb` and model files exist in correct directories

**Three.js errors:**
- Download Three.js library or switch to CDN
- Check import paths in `index.html`

**Character falls through floor:**
- Check console for "Seating bounds" and "Board bounds" logs
- Verify room model loaded successfully

## Future Enhancements

- Walking/idle animations for character
- Multiple interactive objects
- Multiplayer support
- VR/AR compatibility
- Sound effects and ambient audio

## Credits

- Three.js library: [threejs.org](https://threejs.org/)
- Character model: Low poly person model
- Room design: Custom 3D classroom model

## License

This project is open source and available under the MIT License.

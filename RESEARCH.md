# Fish Tank VR Research

## Found Projects and Solutions

### 1. Technical Implementations

#### WebGL Aquarium (meghprkh/webgl-aquarium)
- **Technologies**: WebGL, Three.js
- **Features**:
  - Realistic lighting
  - Reflections on glass and metal
  - Bubbles and water effects
  - Various fish species
- **What to take**: Lighting and reflection techniques for more realistic appearance

#### Fishtank by mrd (Haskell/OpenGL)
- **Technologies**: Haskell, OpenGL
- **Features**:
  - Fish behavior based on "Boids" model
  - Flocking behavior
  - Predator/prey relationships
  - Interactivity (feeding, viewing angle changes)
- **What to take**: Fish behavior algorithms for more realistic animation

### 2. Scientific Approaches

#### Fish Tank VR
- **Concept**: Screen as "aquarium glass" through which user views virtual objects
- **Key Principles**:
  - Perspective changes according to head position
  - High-quality graphics
  - Integration of virtual environment with workspace

### 3. Recommendations for Improving Realism

#### A. Visual Improvements

1. **Lighting and Reflections**
   - Add reflections on screen "glass" (screen-space reflections)
   - Realistic scene lighting (ambient, directional, point lights)
   - Refractions for "water" effect

2. **Water Effects**
   - Caustics - light effects on bottom
   - Air bubbles
   - Waves and currents (if applicable)

3. **Scene Detail**
   - More detailed textures
   - Particles (dust, particles in air)
   - Post-processing (bloom, color grading)

#### B. Object Behavior

1. **Boids Algorithm for Animation**
   - Flocking behavior
   - Obstacle avoidance
   - Reaction to user

2. **Physics**
   - Realistic object movement
   - Gravity and inertia
   - Collisions

#### C. Technical Improvements

1. **Rendering Optimization**
   - Level of Detail (LOD) for objects
   - Frustum culling
   - Occlusion culling
   - Instancing for repeating objects

2. **Calibration and Tracking**
   - More accurate head tracking (improve MediaPipe)
   - Automatic distance calibration
   - Latency compensation

3. **Performance**
   - Web Workers for heavy computations
   - Geometry optimization (fewer polygons where possible)
   - Efficient texture usage

#### D. Interactivity

1. **User Interaction**
   - Object reaction to head movement
   - Ability to "look behind" objects
   - Parallax effects

2. **Settings**
   - Effect depth adjustment
   - Tracking sensitivity settings
   - Various display modes

## Specific Improvements for Our Project

### Priority 1: Visual Improvements

1. **Add Lighting**
   ```typescript
   // In scene.ts add:
   - AmbientLight for base lighting
   - DirectionalLight for main source
   - PointLight for accents
   ```

2. **Improve Materials**
   - Add emissive for lines (glow)
   - Configure opacity for depth effect
   - Add fog for atmosphere

3. **Post-Processing**
   - Bloom effect for bright lines
   - Color correction
   - Vignette for focus

### Priority 2: Tracking Optimization

1. **Improve MediaPipe Tracking**
   - More accurate distance (Z) determination
   - Noise filtering
   - Movement prediction

2. **Calibration**
   - Automatic screen size detection
   - Marker-based calibration (if possible)
   - Save calibration to localStorage

### Priority 3: Effects

1. **Particles**
   - Dust in air
   - Light particles
   - Depth effects

2. **Atmosphere**
   - Fog for creating depth
   - Color correction
   - Background gradients

## Useful Resources

1. **WebGL Aquarium**: https://github.com/meghprkh/webgl-aquarium
   - Study lighting and reflection techniques

2. **Three.js Examples**: 
   - Post-processing effects
   - Lighting techniques
   - Particle systems

3. **Boids Algorithm**:
   - For realistic object behavior
   - Flocking movement

4. **Research Papers**:
   - "Fish Tank VR" research
   - Off-axis projection techniques
   - Look-through display implementations

## Next Steps

1. Study webgl-aquarium code for lighting techniques
2. Implement basic lighting in our scene
3. Add fog for atmosphere
4. Improve head tracking (more accurate Z)
5. Add post-processing (bloom, color correction)

import * as THREE from './three.module.js';

// ==========================================
// STATE MANAGEMENT & GLOBALS
// ==========================================
let scene, camera, renderer;
let gauntletGroup, resonatorGroup, particlesGroup;
let arcCore, pedestalGroup;
let currentState = 'gauntlet'; // 'gauntlet' | 'resonator'
let isTransitioning = false;

// Advanced Gauntlet Components & Systems
let shellLeft, shellRight;
let arcHalo = null, innerHaloReticle = null, innerTurbineMesh = null;
let palmLight = null, dorsalMissileHatch = null, dorsalMissileRack = null;
let dorsalLaserLens = null, laserHousing = null;
let forearmPistons = [];
let energyConduits = [];
let gauntletFingers = [];
let thumbGroup = null;
let knuckleNodes = [];

// Telemetry & FPS
let lastFpsTime = performance.now();
let frameCount = 0;

// Camera selection
let currentDeviceId = null;

// Optical Resonator Fabry-Pérot Laboratory State
let resonatorState = {
    cavityLength: 4.826,    // µm (L)
    wavelength: 743.6,      // nm (λ)
    reflectivity: 0.37,     // R (37%)
    refractiveIndex: 1.0,   // n
    isPaused: false,
    showFieldOverlay: false,
    wavePhaseTime: 0.0,
    // Calculated values
    m: 12.980,
    transmission: 0.986,
    fsrTHz: 31.06,
    fsrDeltaLambdaNm: 57.3,
    spectralColorHex: 0xef233c,
    spectralColorCSS: '#ef233c'
};

// 3D Optical Resonator Object References
let resMirrorLeft = null, resMirrorRight = null;
let resMountL = null, resMountR = null;
let resMirrorMatLeft = null, resMirrorMatRight = null;
let resStandingWaveLine = null, resStandingWaveCrossLine = null;
let resWaveEnvelopeTop = null, resWaveEnvelopeBottom = null;
let resLaserCoreBeam = null, resInputBeam = null, resOutputBeam = null;
let resNodeMarkerGroup = null;
let resEmitterHousing = null, resDetectorHousing = null;
let resBenchRail = null;

// Resonator components
let atomMeshes = [];
let activePhotons = [];
let sharedPhotonGeo = null;
let sharedPhotonMat = null;
let blastEffectGroup = null;
let shockwaves = [];

// Gain Medium & Stimulated Emission Physics System
let gainMediumGroup = null;
let gainCrystalMesh = null;
let gainCrystalCore = null;
let gainMediumAtoms = [];
let pumpParticles = [];
let pumpParticlesGroup = null;
let cavityPhotons = [];
let cavityPhotonsGroup = null;
let stimulatedEmissionFlashes = [];
let emissionFlashesGroup = null;
let pumpEmittersTop = [];
let pumpEmittersBottom = [];

let laserDynamics = {
    mode: 'auto',              // 'auto' | 'manual' | 'demo'
    stage: 'pumping',          // 'pumping' -> 'seed' -> 'amplifying' -> 'lasing'
    stageTimer: 0.0,
    autoCycle: true,
    timeScale: 1.0,            // 1.0 normal, slowed down during demo
    isPumpingActive: true,
    stimulatedEvents: 0,
    intracavityPhotonCount: 0,
    outputLaserPower: 0.0,     // 0.0 to 1.0
    demoSubStep: 0,
    demoTimer: 0.0,
    demoTargetAtom: null
};

// Optical Laser Energy Accumulation, Moving Charges & Blast State
let laserCavityCharge = {
    level: 0.0,              // 0.0 to 1.0 (0% to 100%)
    isCharging: true,
    chargeSpeed: 0.125,      // fills up in ~8 seconds
    isFullyCharged: false,
    hasPrompted: false,
    postBlastCooldown: 0.0
};
let resChargesGroup = null;
let activeLaserCharges = [];
let MAX_CHARGES = 60;
let opticalBlastGroup = null;
let opticalBlastLife = 0.0;
let opticalBlastRings = [];
let opticalBlastCore = null;
let opticalBlastAura = null;

// Audio Synthesizer
let audioCtx = null;
let soundEnabled = true;
let humOsc = null;
let humGain = null;

// Camera & In-Browser Vision
let isCameraActive = false;
let videoStream = null;
let handsDetector = null;
let cameraVideoEl = null;
let arCursorEl = null;
let cameraLoopRafId = null;

// Mode-Linked Single-Hand Tracking State
// Default Mapping:
// GAUNTLET MODE: Left Hand Only (Left Index Finger = Pointer / Selector). Right Hand Removed. Lasers Disabled.
// IRON MAN MODE: Right Hand Only (Right Hand = Pointer & Controller). Left Hand Removed. Lasers Armed.
let isHandsSwapped = false; // When true, swaps gauntlet and pointer roles
let gauntletHand = 'RIGHT'; // 'RIGHT' | 'LEFT' (Default: Right Hand wears gauntlet)
let ironManHand = 'RIGHT'; // 'RIGHT' | 'LEFT' (Default: Right Hand Controller in Iron Man Mode)
let isRightHandPresent = false;
let isLeftHandPresent = false;
let lastHandSeenTime = 0;
let lastRightHandSeenTime = 0;
let lastLeftHandSeenTime = 0;

let currentExplodedHandType = null;
let lastExplodedHandSwitchTime = 0;

let activeCursorPos = { x: -100, y: -100 };
let leftCursorPos = activeCursorPos; // Compatibility alias
let isPinching = false;
let isLeftPinching = false; // Compatibility alias
let lastHoveredElement = null;
let pinchCooldown = 0;
let leftPinchCooldown = 0; // Compatibility alias
let dwellTarget = null;
let dwellStartTime = 0;
const DWELL_OPTIONS = [1500, 2000, 2500, 3000];
let savedDwell = parseInt(localStorage.getItem('repulsor_dwell_duration'), 10);
let DWELL_DURATION = DWELL_OPTIONS.includes(savedDwell) ? savedDwell : 2000; // ms to auto-select on hover (deliberate 2.0s dwell delay)
let lastDwellClickTime = 0;
let activeDraggingSlider = null;
let blastCooldown = 0;

// Exploded Schematic View State (Full 5-stage horizontal separation matching technical reference)
let isExplodedView = false;
let explodedProgress = 0.0; // 0.0 (assembled) to 1.0 (exploded schematic)

// Internal 5-Stage Resonator Schematic Meshes
let schematicPowerSourceGroup = null;
let schematicCoreChamberGroup = null;
let schematicRearEmitterGroup = null;
let schematicPalmApertureGroup = null;
let schematicCoherentBeamGroup = null;
let schematicLaserBeamMesh = null;
let schematicCoreAtoms = [];
let schematicContainmentRings = [];
let schematicWavefrontRings = [];
let arcReactorCorePulse = null;

// References to primary anatomical gauntlet segments for clean schematic separation
let elbowCuffMesh = null;
let elbowThrusterMeshes = [];
let chassisMeshRef = null;
let innerArmPlateRef = null;
let wristCollarRef = null;
let wristFlexGroupRef = null;
let palmPlateRef = null;
let palmBedRef = null;
let thenarPadRef = null;
let thenarTrimRef = null;
let hypoPadRef = null;
let hypoTrimRef = null;
let repulsorBezelRef = null;
let innerRimRef = null;
let emitterCoreRef = null;
let dorsalGroupRef = null;
let dorsalKnuckleGuardRef = null;
let knuckleBridgeRef = null;

let pumpSteps = [0.0, 0.35, 0.65, 0.90, 1.0];
let pumpIndex = 0;

// Mechanical servo sound for exploding/assembling armor
function playExplodeServoSound(isExploding) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        
        if (isExploding) {
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(420, now + 0.35);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        } else {
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        }
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.40);
    } catch (e) {}
}

// Einstein Laser Rate Equations
const physics = {
    B12: 0.05,
    B21: 0.05,
    A21: 0.01,
    rho_nu: 0.0,
    N_total: 100000.0,
    N1: 100000.0,
    N2: 0.0,
    photons: 0.0,
    temperature: 0.0,
    lastTime: performance.now(),
    startTime: performance.now(),
    update: function(tempInput, triggerSeed) {
        const now = performance.now();
        let dt = (now - this.lastTime) / 1000.0;
        if (dt <= 0 || dt > 0.1) dt = 0.016;
        this.lastTime = now;
        
        this.temperature = Math.max(0.0, Math.min(1.0, tempInput));
        const W = this.temperature * 3.5;
        
        if (triggerSeed) {
            this.photons += 15.0;
        }
        
        this.rho_nu = this.photons * 0.005;
        const stimRate = (this.B21 * this.N2 - this.B12 * this.N1) * this.rho_nu;
        const sponRate = this.A21 * this.N2;
        
        const dN2_dt = (W * this.N1) - stimRate - sponRate;
        this.N2 += dN2_dt * dt;
        this.N2 = Math.max(0.0, Math.min(this.N_total, this.N2));
        this.N1 = this.N_total - this.N2;
        
        const lossRate = 0.8;
        const dphotons_dt = stimRate + (0.1 * sponRate) - (lossRate * this.photons);
        this.photons += dphotons_dt * dt;
        this.photons = Math.max(0.0, this.photons);
        
        return {
            N1: this.N1,
            N2: this.N2,
            N_total: this.N_total,
            rho_nu: this.rho_nu,
            dN2_dt: dN2_dt,
            photons: this.photons,
            time_ms: now - this.startTime,
            temperature: this.temperature,
            population_inverted: this.N2 > this.N1
        };
    }
};

const simInput = {
    explode_ratio: 0.0,
    temperature: 0.0,
    trigger_photon: false,
    blast: false
};


// ==========================================
// 3D SCENE & GAUNTLET / RESONATOR
// ==========================================
function init3D() {
    const container = document.getElementById('canvas-container');
    arCursorEl = document.getElementById('ar-cursor');
    
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 11.5);
    
    // Transparent WebGL Renderer layered over full-screen camera
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);
    
    // Photorealistic IBL Environment Map (Transforms flat shaders into gleamy Mark 85 metallic clearcoat)
    createProceduralEnvironment(renderer, scene);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(-10, -4, 8);
    scene.add(fillLight);
    
    const warmLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    warmLight.position.set(0, 8, -8);
    scene.add(warmLight);
    
    // Dedicated Dorsal Light for rich metallic highlights when turning hand to back
    const dorsalLight = new THREE.DirectionalLight(0xffeedd, 2.6);
    dorsalLight.position.set(0, 6, -14);
    scene.add(dorsalLight);
    
    buildGauntletModel();
    buildOpticalResonator();
    buildHolographicPedestal();
    
    window.addEventListener('resize', onWindowResize);
}

function buildHolographicPedestal() {
    pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);
    
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.35 });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 64), ringMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = -3.4;
    pedestalGroup.add(ring1);
}

// ==========================================
// PROCEDURAL STARK INDUSTRIES TEXTURES
// ==========================================
// ==========================================
// HIGH-FIDELITY PROCEDURAL ENVIRONMENT & TEXTURES
// ==========================================
function createProceduralEnvironment(renderer, scene) {
    if (typeof document === 'undefined') return;
    try {
        const envCanvas = document.createElement('canvas');
        envCanvas.width = 1024;
        envCanvas.height = 512;
        const ctx = envCanvas.getContext('2d');
        if (!ctx) return;

        // Dark sci-fi hangar / Stark lab panoramic backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#040812');     // Ceiling
        bgGrad.addColorStop(0.35, '#0a1628');   // Upper walls
        bgGrad.addColorStop(0.5, '#102238');    // Horizon line
        bgGrad.addColorStop(0.65, '#060f1c');   // Floor horizon
        bgGrad.addColorStop(1, '#020408');      // Floor directly below
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1024, 512);

        // Overhead high-intensity studio softboxes (Clean white specular reflection on carmine clearcoat)
        const softboxGrad = ctx.createRadialGradient(512, 110, 15, 512, 110, 240);
        softboxGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        softboxGrad.addColorStop(0.25, 'rgba(240, 250, 255, 0.90)');
        softboxGrad.addColorStop(0.65, 'rgba(180, 220, 255, 0.35)');
        softboxGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = softboxGrad;
        ctx.fillRect(180, 0, 664, 260);

        // Secondary rim softboxes (Warm amber for titanium-gold highlights)
        const amberSoftbox = ctx.createRadialGradient(160, 180, 10, 160, 180, 160);
        amberSoftbox.addColorStop(0, 'rgba(255, 210, 130, 0.95)');
        amberSoftbox.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
        amberSoftbox.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = amberSoftbox;
        ctx.fillRect(0, 40, 340, 280);

        // Tertiary rim softbox (Vivid cyan for stark repulsor reflection)
        const cyanSoftbox = ctx.createRadialGradient(864, 180, 10, 864, 180, 160);
        cyanSoftbox.addColorStop(0, 'rgba(140, 245, 255, 0.95)');
        cyanSoftbox.addColorStop(0.5, 'rgba(14, 165, 233, 0.45)');
        cyanSoftbox.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cyanSoftbox;
        ctx.fillRect(684, 40, 340, 280);

        // Glowing floor grid reflection lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1.5;
        for (let x = 64; x < 1024; x += 128) {
            ctx.beginPath();
            ctx.moveTo(x, 260);
            ctx.lineTo(x + (x - 512) * 0.8, 512);
            ctx.stroke();
        }

        const envTexture = new THREE.CanvasTexture(envCanvas);
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envRenderTarget = pmrem.fromEquirectangular(envTexture);
        scene.environment = envRenderTarget.texture;
        envTexture.dispose();
        pmrem.dispose();
    } catch (e) {
        console.warn('Environment generation fallback:', e);
    }
}

function createArmorPanelTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Deep metallic Stark candy crimson multi-stop gradient base
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#4e0008');
    grad.addColorStop(0.20, '#780718');
    grad.addColorStop(0.50, '#aa0d25');
    grad.addColorStop(0.80, '#d21534');
    grad.addColorStop(1, '#420006');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Nano-carbon weave micro-pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let x = 0; x < 1024; x += 8) {
        for (let y = 0; y < 1024; y += 8) {
            if ((x + y) % 16 === 0) {
                ctx.fillRect(x, y, 4, 4);
            }
        }
    }
    
    // Procedural metallic specular flecks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let i = 0; i < 3200; i++) {
        const nx = (Math.sin(i * 997) * 0.5 + 0.5) * 1024;
        const ny = (Math.cos(i * 643) * 0.5 + 0.5) * 1024;
        ctx.fillRect(nx, ny, 1.5, 1.5);
    }
    
    // Precision CNC micro-seam panel channels (Outer border)
    ctx.strokeStyle = 'rgba(10, 0, 2, 0.80)';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(32, 32, 960, 960);
    
    // Subtle titanium gold inlay chamfer line
    ctx.strokeStyle = 'rgba(230, 168, 54, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 38, 948, 948);
    
    // Subtle repeating nano-hex tech traces (seamless)
    ctx.strokeStyle = 'rgba(230, 168, 54, 0.22)';
    ctx.lineWidth = 1.0;
    for (let gy = 64; gy < 1024; gy += 128) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(256, gy);
        ctx.lineTo(320, gy + 32);
        ctx.lineTo(576, gy + 32);
        ctx.lineTo(640, gy);
        ctx.lineTo(1024, gy);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

function createArmorBumpTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Neutral gray baseline
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 1024, 1024);

    // Deep recessed CNC panel gaps
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 5.0;
    ctx.strokeRect(32, 32, 960, 960);

    // Raised outer chamfer edge highlight
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(28, 28, 968, 968);

    // Hexagonal nano-mesh relief
    ctx.strokeStyle = '#686868';
    ctx.lineWidth = 1.0;
    const r = 24;
    for (let y = 0; y < 1024; y += r * 1.5) {
        for (let x = 0; x < 1024; x += r * Math.sqrt(3)) {
            const cx = x + ((Math.floor(y / (r * 1.5)) % 2) * (r * Math.sqrt(3) / 2));
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const angle = a * Math.PI / 3;
                const px = cx + Math.cos(angle) * (r * 0.45);
                const py = y + Math.sin(angle) * (r * 0.45);
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
}

function createGoldTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rich brushed titanium-gold gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#b87710');
    grad.addColorStop(0.3, '#d89824');
    grad.addColorStop(0.6, '#f3b845');
    grad.addColorStop(0.85, '#ffd166');
    grad.addColorStop(1, '#a66a08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine brushed metal horizontal grain
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let y = 0; y < 1024; y += 2) {
        ctx.fillRect(0, y, 1024, 1);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let y = 1; y < 1024; y += 3) {
        ctx.fillRect(0, y, 1024, 1);
    }

    // Micro-chamfer perimeter border
    ctx.strokeStyle = 'rgba(80, 48, 4, 0.7)';
    ctx.lineWidth = 3.0;
    ctx.strokeRect(20, 20, 984, 984);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createRepulsorTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const cx = 512, cy = 512;
    
    // Deep dark titanium chassis backing
    ctx.fillStyle = '#020610';
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Outer stator ring with dark brushed gradient
    const outerGrad = ctx.createRadialGradient(cx, cy, 320, cx, cy, 512);
    outerGrad.addColorStop(0, '#051020');
    outerGrad.addColorStop(0.7, '#0b1c38');
    outerGrad.addColorStop(1, '#020610');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 510, 0, Math.PI * 2);
    ctx.fill();

    // Concentric silver/cyan stator tracks
    for (let r of [480, 440, 400, 340, 270, 200, 140]) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 12 Radial Stator Alignment Ticks
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 350, cy + Math.sin(a) * 350);
        ctx.lineTo(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470);
        ctx.stroke();
    }

    // 24 Micro Precision Ticks in titanium-gold
    ctx.strokeStyle = 'rgba(230, 168, 54, 0.65)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 280, cy + Math.sin(a) * 280);
        ctx.lineTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320);
        ctx.stroke();
    }

    // Glowing Unibeam Core Gradient (White Hot Center -> Vivid Cyan -> Soft Ambient Glow)
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.20, 'rgba(225, 250, 255, 0.98)');
    coreGrad.addColorStop(0.45, 'rgba(0, 240, 255, 0.92)');
    coreGrad.addColorStop(0.75, 'rgba(0, 160, 255, 0.55)');
    coreGrad.addColorStop(1, 'rgba(0, 50, 120, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 260, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}

function createHoloReticleTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const cx = 256, cy = 256;
    ctx.clearRect(0, 0, 512, 512);
    
    // Fine tactical HUD targeting arcs in cyan
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.90)';
    ctx.lineWidth = 2.5;
    
    for (let s = 0; s < 4; s++) {
        const startA = (s * Math.PI) / 2 + 0.15;
        const endA = startA + Math.PI / 2 - 0.30;
        ctx.beginPath();
        ctx.arc(cx, cy, 230, startA, endA);
        ctx.stroke();
    }
    
    // Inner fine dotted track
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.70)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Cardinal targeting crosshairs
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.lineWidth = 2.0;
    for (let a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190);
        ctx.lineTo(cx + Math.cos(a) * 245, cy + Math.sin(a) * 245);
        ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
}

function createInnerReticleTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const cx = 256, cy = 256;
    ctx.clearRect(0, 0, 512, 512);
    
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.90)';
    ctx.lineWidth = 2.0;
    
    // Counter-rotating aperture turbine reticle
    for (let b = 0; b < 6; b++) {
        const a = (b * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 190, a + 0.1, a + Math.PI / 3 - 0.1);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
        ctx.lineTo(cx + Math.cos(a) * 185, cy + Math.sin(a) * 185);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// ==========================================
// SCULPTED MARK 85 GAUNTLET MODEL ASSEMBLY
// ==========================================
function buildGauntletModel() {
    gauntletGroup = new THREE.Group();
    gauntletGroup.position.set(0, -0.2, 0);
    scene.add(gauntletGroup);

    // 1. AUTHENTIC MARK 85 MATERIALS (High-Gloss Clearcoat Candy Crimson & Titanium Gold)
    const armorTex = createArmorPanelTexture();
    const armorBumpTex = createArmorBumpTexture();
    const goldTex = createGoldTexture();
    const repulsorTex = createRepulsorTexture();
    const holoTex = createHoloReticleTexture();
    const innerReticleTex = createInnerReticleTexture();

    const ironCrimson = new THREE.MeshPhysicalMaterial({
        color: 0x9c0a1e,
        emissive: 0x140003,
        emissiveIntensity: 0.14,
        metalness: 0.94,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        reflectivity: 0.94,
        map: armorTex || null,
        bumpMap: armorBumpTex || null,
        bumpScale: 0.012,
        side: THREE.DoubleSide
    });

    const ironCrimsonSmooth = new THREE.MeshPhysicalMaterial({
        color: 0x9c0a1e,
        emissive: 0x140003,
        emissiveIntensity: 0.14,
        metalness: 0.94,
        roughness: 0.10,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        reflectivity: 0.94,
        side: THREE.DoubleSide
    });

    const titaniumGold = new THREE.MeshPhysicalMaterial({
        color: 0xe8a428,
        emissive: 0x221300,
        emissiveIntensity: 0.20,
        metalness: 0.96,
        roughness: 0.14,
        clearcoat: 0.92,
        clearcoatRoughness: 0.04,
        map: goldTex || null,
        reflectivity: 0.96
    });

    const chromeSilver = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.98,
        roughness: 0.04
    });

    const darkGunmetal = new THREE.MeshStandardMaterial({
        color: 0x121720,
        emissive: 0x030508,
        metalness: 0.88,
        roughness: 0.28
    });

    const cyanConduit = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.8,
        metalness: 0.1,
        roughness: 0.12
    });

    const rubyLaserMat = new THREE.MeshStandardMaterial({
        color: 0xff0033,
        emissive: 0xff0033,
        emissiveIntensity: 4.5
    });

    // 2. FOREARM BRACER
    const chassisGeo = new THREE.CylinderGeometry(0.70, 0.92, 1.95, 32);
    const chassisMesh = new THREE.Mesh(chassisGeo, darkGunmetal);
    chassisMesh.position.set(0, -1.60, -0.04);
    chassisMesh.userData = { baseY: -1.60 };
    gauntletGroup.add(chassisMesh);
    chassisMeshRef = chassisMesh;

    const elbowCuffGeo = new THREE.CylinderGeometry(0.92, 1.00, 0.22, 32);
    const elbowCuff = new THREE.Mesh(elbowCuffGeo, titaniumGold);
    elbowCuff.position.set(0, -2.55, -0.04);
    elbowCuff.userData = { baseY: -2.55 };
    gauntletGroup.add(elbowCuff);
    elbowCuffMesh = elbowCuff;

    const innerArmPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.92, 1.82, 32, 1, false, -Math.PI * 0.12, Math.PI * 0.24),
        titaniumGold
    );
    innerArmPlate.position.set(0, -1.60, -0.04);
    innerArmPlate.rotation.y = Math.PI / 2;
    innerArmPlate.userData = { baseY: -1.60 };
    gauntletGroup.add(innerArmPlate);
    innerArmPlateRef = innerArmPlate;

    elbowThrusterMeshes = [];
    for (const side of [-1, 1]) {
        const thrusterGeo = new THREE.CylinderGeometry(0.10, 0.14, 0.20, 16);
        const thrusterMesh = new THREE.Mesh(thrusterGeo, darkGunmetal);
        thrusterMesh.position.set(side * 0.44, -2.60, -0.62);
        thrusterMesh.rotation.x = Math.PI / 6;
        thrusterMesh.userData = { baseY: -2.60 };
        gauntletGroup.add(thrusterMesh);

        const flameNode = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 12), cyanConduit);
        flameNode.position.set(side * 0.44, -2.67, -0.65);
        flameNode.rotation.x = Math.PI / 6;
        flameNode.userData = { baseY: -2.67 };
        gauntletGroup.add(flameNode);
        elbowThrusterMeshes.push({ thruster: thrusterMesh, flame: flameNode });
    }

    forearmPistons = [];
    const pistonCoords = [
        { x: -0.60, z: 0.10, side: -1 },
        { x: 0.60, z: 0.10, side: 1 },
        { x: -0.52, z: -0.34, side: -1 },
        { x: 0.52, z: -0.34, side: 1 }
    ];
    pistonCoords.forEach(pos => {
        const cylMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 1.75, 16), darkGunmetal);
        cylMesh.position.set(pos.x, -1.60, pos.z);
        gauntletGroup.add(cylMesh);

        const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 1.90, 16), chromeSilver);
        rodMesh.position.set(pos.x, -1.60, pos.z);
        gauntletGroup.add(rodMesh);

        forearmPistons.push({ cyl: cylMesh, rod: rodMesh, basePos: pos });
    });

    energyConduits = [];
    const conduitLines = [
        { x: -0.54, z: -0.24 },
        { x: 0.54, z: -0.24 },
        { x: -0.38, z: 0.28 },
        { x: 0.38, z: 0.28 }
    ];
    conduitLines.forEach(c => {
        const lineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.95, 12), cyanConduit);
        lineMesh.position.set(c.x, -1.60, c.z);
        gauntletGroup.add(lineMesh);
        energyConduits.push(lineMesh);
    });

    const spineGeo = new THREE.BoxGeometry(0.36, 1.90, 0.16);
    const spineMesh = new THREE.Mesh(spineGeo, titaniumGold);
    spineMesh.position.set(0, -1.60, -0.66);
    gauntletGroup.add(spineMesh);

    dorsalMissileHatch = new THREE.Group();
    dorsalMissileHatch.position.set(0, -1.55, -0.73);
    const hatchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.40, 1.05, 0.06), ironCrimson);
    dorsalMissileHatch.add(hatchPlate);
    const hatchTrim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.08), titaniumGold);
    hatchTrim.position.set(0, 0.48, 0.01);
    dorsalMissileHatch.add(hatchTrim);
    gauntletGroup.add(dorsalMissileHatch);

    dorsalMissileRack = new THREE.Group();
    dorsalMissileRack.position.set(0, -1.55, -0.66);
    for (let row = 0; row < 4; row++) {
        for (let col of [-0.09, 0.09]) {
            const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.08, 12), titaniumGold);
            warhead.rotation.x = -Math.PI / 2;
            warhead.position.set(col, (row - 1.5) * 0.20 + 0.04, 0.03);
            dorsalMissileRack.add(warhead);

            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.14, 12), darkGunmetal);
            tube.rotation.x = Math.PI / 2;
            tube.position.set(col, (row - 1.5) * 0.20, 0.0);
            dorsalMissileRack.add(tube);
        }
    }
    gauntletGroup.add(dorsalMissileRack);

    shellLeft = new THREE.Group();
    shellRight = new THREE.Group();

    const wingGeo1 = new THREE.CylinderGeometry(0.71, 0.91, 1.85, 28, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
    const wingMesh1 = new THREE.Mesh(wingGeo1, ironCrimson);
    wingMesh1.position.set(0, -1.60, 0);
    shellLeft.add(wingMesh1);

    const ribGeo1 = new THREE.CylinderGeometry(0.72, 0.92, 1.82, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.08);
    const ribMesh1 = new THREE.Mesh(ribGeo1, titaniumGold);
    ribMesh1.position.set(0, -1.60, 0);
    shellLeft.add(ribMesh1);

    const wingGeo2 = new THREE.CylinderGeometry(0.71, 0.91, 1.85, 28, 1, true, Math.PI * 0.58, Math.PI * 0.84);
    const wingMesh2 = new THREE.Mesh(wingGeo2, ironCrimson);
    wingMesh2.position.set(0, -1.60, 0);
    shellRight.add(wingMesh2);

    const ribGeo2 = new THREE.CylinderGeometry(0.72, 0.92, 1.82, 16, 1, false, Math.PI * 0.62, Math.PI * 0.08);
    const ribMesh2 = new THREE.Mesh(ribGeo2, titaniumGold);
    ribMesh2.position.set(0, -1.60, 0);
    shellRight.add(ribMesh2);

    gauntletGroup.add(shellLeft);
    gauntletGroup.add(shellRight);

    // 3. WRIST ACCORDION
    const wristCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.28, 32), darkGunmetal);
    wristCollar.position.set(0, -0.60, -0.04);
    wristCollar.userData = { baseY: -0.60 };
    gauntletGroup.add(wristCollar);
    wristCollarRef = wristCollar;

    const wristCollarGold = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.024, 16, 36), titaniumGold);
    wristCollarGold.rotation.x = Math.PI / 2;
    wristCollarGold.position.set(0, -0.58, -0.04);
    gauntletGroup.add(wristCollarGold);

    const wristFlexGroup = new THREE.Group();
    wristFlexGroup.position.set(0, -0.52, -0.48);
    wristFlexGroup.userData = { baseY: -0.52 };
    for (let r = 0; r < 4; r++) {
        const ridgeY = r * 0.075;
        const ridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68 - r * 0.03, 0.050, 0.10), ironCrimsonSmooth);
        ridgeMesh.position.set(0, ridgeY, -r * 0.02);
        wristFlexGroup.add(ridgeMesh);

        const seamMesh = new THREE.Mesh(new THREE.BoxGeometry(0.64 - r * 0.03, 0.018, 0.07), chromeSilver);
        seamMesh.position.set(0, ridgeY - 0.034, -r * 0.02);
        wristFlexGroup.add(seamMesh);
    }
    gauntletGroup.add(wristFlexGroup);
    wristFlexGroupRef = wristFlexGroup;

    // 4. PALM CHASSIS
    const palmPlate = new THREE.Mesh(new THREE.BoxGeometry(1.64, 1.28, 0.26), ironCrimson);
    palmPlate.position.set(0, 0, -0.02);
    palmPlate.userData = { baseY: 0.0 };
    gauntletGroup.add(palmPlate);
    palmPlateRef = palmPlate;

    const palmBed = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.08, 32), darkGunmetal);
    palmBed.rotation.x = Math.PI / 2;
    palmBed.position.set(0, 0, 0.10);
    palmBed.userData = { baseY: 0.0 };
    gauntletGroup.add(palmBed);
    palmBedRef = palmBed;

    const thenarPad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.32), ironCrimsonSmooth);
    thenarPad.position.set(-0.74, -0.04, 0.02);
    thenarPad.rotation.z = 0.12;
    thenarPad.userData = { baseY: -0.04 };
    gauntletGroup.add(thenarPad);
    thenarPadRef = thenarPad;

    const thenarTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.34), titaniumGold);
    thenarTrim.position.set(-0.60, -0.04, 0.03);
    thenarTrim.rotation.z = 0.12;
    thenarTrim.userData = { baseY: -0.04 };
    gauntletGroup.add(thenarTrim);
    thenarTrimRef = thenarTrim;

    const hypoPad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.32), ironCrimsonSmooth);
    hypoPad.position.set(0.74, -0.04, 0.02);
    hypoPad.rotation.z = -0.12;
    hypoPad.userData = { baseY: -0.04 };
    gauntletGroup.add(hypoPad);
    hypoPadRef = hypoPad;

    const hypoTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.34), titaniumGold);
    hypoTrim.position.set(0.60, -0.04, 0.03);
    hypoTrim.rotation.z = -0.12;
    hypoTrim.userData = { baseY: -0.04 };
    gauntletGroup.add(hypoTrim);
    hypoTrimRef = hypoTrim;

    // 5. PALM REPULSOR
    const repulsorBezelGeo = new THREE.TorusGeometry(0.38, 0.032, 16, 48);
    const repulsorBezel = new THREE.Mesh(repulsorBezelGeo, chromeSilver);
    repulsorBezel.position.set(0, 0, 0.13);
    repulsorBezel.userData = { baseY: 0.0 };
    gauntletGroup.add(repulsorBezel);
    repulsorBezelRef = repulsorBezel;

    const innerRimGeo = new THREE.TorusGeometry(0.32, 0.024, 16, 48);
    const innerRim = new THREE.Mesh(innerRimGeo, darkGunmetal);
    innerRim.position.set(0, 0, 0.12);
    innerRim.userData = { baseY: 0.0 };
    gauntletGroup.add(innerRim);
    innerRimRef = innerRim;

    innerTurbineMesh = new THREE.Group();
    innerTurbineMesh.position.set(0, 0, 0.11);
    for (let b = 0; b < 12; b++) {
        const bAng = (b * Math.PI * 2) / 12;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.012), titaniumGold);
        blade.position.set(Math.cos(bAng) * 0.14, Math.sin(bAng) * 0.14, 0);
        blade.rotation.z = bAng + 0.40;
        innerTurbineMesh.add(blade);
    }
    gauntletGroup.add(innerTurbineMesh);

    const coreGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.03, 36);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.8,
        metalness: 0.12,
        roughness: 0.08,
        map: repulsorTex || null
    });
    arcCore = new THREE.Mesh(coreGeo, coreMat);
    arcCore.rotation.x = Math.PI / 2;
    arcCore.position.set(0, 0, 0.12);
    gauntletGroup.add(arcCore);

    const haloGeo = new THREE.RingGeometry(0.20, 0.30, 36);
    const haloMat = new THREE.MeshBasicMaterial({
        map: holoTex || null,
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending
    });
    arcHalo = new THREE.Mesh(haloGeo, haloMat);
    arcHalo.position.set(0, 0, 0.142);
    gauntletGroup.add(arcHalo);

    const innerHaloGeo = new THREE.RingGeometry(0.10, 0.18, 36);
    const innerHaloMat = new THREE.MeshBasicMaterial({
        map: innerReticleTex || null,
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    });
    innerHaloReticle = new THREE.Mesh(innerHaloGeo, innerHaloMat);
    innerHaloReticle.position.set(0, 0, 0.144);
    gauntletGroup.add(innerHaloReticle);

    const emitterCore = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    emitterCore.position.set(0, 0, 0.14);
    emitterCore.userData = { baseY: 0.0 };
    gauntletGroup.add(emitterCore);
    emitterCoreRef = emitterCore;

    palmLight = new THREE.PointLight(0x00f0ff, 4.2, 9.0);
    palmLight.position.set(0, 0, 0.45);
    gauntletGroup.add(palmLight);

    // 6. HIGH-DETAIL SCULPTED DORSAL ARMOR (BACK OF GAUNTLET)
    const dorsalGroup = new THREE.Group();
    dorsalGroup.position.set(0, 0, -0.20);
    dorsalGroup.userData = { baseZ: -0.20 };

    const dorsalSpinePlate = new THREE.Mesh(new THREE.BoxGeometry(0.70, 1.24, 0.16), ironCrimson);
    dorsalSpinePlate.position.set(0, 0, 0);
    dorsalGroup.add(dorsalSpinePlate);

    for (const side of [-1, 1]) {
        const wingPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.14, 0.13), ironCrimson);
        wingPlate.position.set(side * 0.50, -0.02, 0.02);
        wingPlate.rotation.y = -side * 0.14;
        dorsalGroup.add(wingPlate);

        const goldAccent = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.08, 0.15), titaniumGold);
        goldAccent.position.set(side * 0.30, -0.02, 0.03);
        dorsalGroup.add(goldAccent);

        const outerStrake = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.88, 0.12), titaniumGold);
        outerStrake.position.set(side * 0.72, -0.04, 0.04);
        outerStrake.rotation.z = side * 0.10;
        dorsalGroup.add(outerStrake);
    }

    const dorsalChevron = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.20), titaniumGold);
    dorsalChevron.position.set(0, 0.26, -0.03);
    dorsalGroup.add(dorsalChevron);

    const lowerChevron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.18), titaniumGold);
    lowerChevron.position.set(0, -0.34, -0.03);
    dorsalGroup.add(lowerChevron);

    laserHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.13, 8), darkGunmetal);
    laserHousing.rotation.x = Math.PI / 2;
    laserHousing.position.set(0, -0.06, -0.11);
    dorsalGroup.add(laserHousing);

    const laserBezel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 12, 32), titaniumGold);
    laserBezel.position.set(0, -0.06, -0.175);
    dorsalGroup.add(laserBezel);

    dorsalLaserLens = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), rubyLaserMat);
    dorsalLaserLens.position.set(0, -0.06, -0.15);
    dorsalGroup.add(dorsalLaserLens);

    for (const side of [-1, 1]) {
        const sensorNode = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 12), cyanConduit);
        sensorNode.rotation.x = Math.PI / 2;
        sensorNode.position.set(side * 0.22, -0.06, -0.11);
        dorsalGroup.add(sensorNode);
    }

    for (let f = 0; f < 4; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.024, 0.08), darkGunmetal);
        fin.position.set(0, -0.46 - f * 0.05, -0.02);
        dorsalGroup.add(fin);
    }

    gauntletGroup.add(dorsalGroup);
    dorsalGroupRef = dorsalGroup;

    const dorsalKnuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.18, 0.16), titaniumGold);
    dorsalKnuckleGuard.position.set(0, 0.74, -0.18);
    dorsalKnuckleGuard.userData = { baseY: 0.74 };
    gauntletGroup.add(dorsalKnuckleGuard);
    dorsalKnuckleGuardRef = dorsalKnuckleGuard;

    // 7. ARTICULATED KNUCKLES & FINGERS
    const knuckleBridge = new THREE.Group();
    knuckleBridge.position.set(0, 0.68, -0.02);
    knuckleBridge.userData = { basePos: new THREE.Vector3(0, 0.68, -0.02), baseY: 0.68 };

    const bridgeSpine = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.18, 0.22), titaniumGold);
    knuckleBridge.add(bridgeSpine);

    const bridgeChannel = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 0.24), darkGunmetal);
    bridgeChannel.position.set(0, -0.02, 0.01);
    knuckleBridge.add(bridgeChannel);

    gauntletGroup.add(knuckleBridge);
    knuckleBridgeRef = knuckleBridge;

    knuckleNodes = [];
    const knuckleSpecs = [
        { x: -0.52, y: 0.68, z: 0.06, w: 0.40 },
        { x: -0.17, y: 0.74, z: 0.08, w: 0.42 },
        { x: 0.17, y: 0.70, z: 0.07, w: 0.40 },
        { x: 0.52, y: 0.60, z: 0.05, w: 0.36 }
    ];

    knuckleSpecs.forEach(ks => {
        const kGroup = new THREE.Group();
        kGroup.position.set(ks.x, ks.y, ks.z);
        kGroup.userData = { basePos: new THREE.Vector3(ks.x, ks.y, ks.z) };

        const cowl = new THREE.Mesh(new THREE.BoxGeometry(ks.w * 0.86, 0.22, 0.16), ironCrimsonSmooth);
        cowl.position.set(0, 0, 0.08);
        kGroup.add(cowl);

        const crest = new THREE.Mesh(new THREE.BoxGeometry(ks.w * 0.90, 0.08, 0.18), titaniumGold);
        crest.position.set(0, 0.08, 0.08);
        kGroup.add(crest);

        const pocket = new THREE.Mesh(new THREE.BoxGeometry(ks.w * 0.72, 0.14, 0.06), darkGunmetal);
        pocket.position.set(0, -0.02, 0.14);
        kGroup.add(pocket);

        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, ks.w * 0.70, 16), chromeSilver);
        hinge.rotation.z = Math.PI / 2;
        hinge.position.set(0, -0.02, 0.14);
        kGroup.add(hinge);

        const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), cyanConduit);
        led.position.set(0, 0.04, 0.16);
        kGroup.add(led);

        const dorsalShield = new THREE.Mesh(new THREE.BoxGeometry(ks.w * 0.82, 0.18, 0.10), titaniumGold);
        dorsalShield.position.set(0, 0.02, -0.15);
        kGroup.add(dorsalShield);

        gauntletGroup.add(kGroup);
        knuckleNodes.push(kGroup);
    });

    gauntletFingers = [];
    const fingerSpecs = [
        { x: -0.52, baseY: 0.68, totalLen: 1.48, w: 0.40, name: 'Index' },
        { x: -0.17, baseY: 0.74, totalLen: 1.64, w: 0.42, name: 'Middle' },
        { x: 0.17, baseY: 0.70, totalLen: 1.50, w: 0.40, name: 'Ring' },
        { x: 0.52, baseY: 0.60, totalLen: 1.32, w: 0.36, name: 'Pinky' }
    ];

    fingerSpecs.forEach(f => {
        const fingerGroup = new THREE.Group();
        fingerGroup.position.set(f.x, f.baseY, 0.02);
        fingerGroup.userData = {
            basePos: new THREE.Vector3(f.x, f.baseY, 0.02),
            baseTotalLen: f.totalLen
        };

        const sleeveMesh = new THREE.Mesh(new THREE.CylinderGeometry(f.w * 0.36, f.w * 0.40, 0.12, 16), darkGunmetal);
        sleeveMesh.position.set(0, 0.04, 0.06);
        fingerGroup.add(sleeveMesh);

        const proxGroup = new THREE.Group();
        proxGroup.position.set(0, 0.10, 0);
        fingerGroup.add(proxGroup);

        const pLen = f.totalLen * 0.42;
        const proxCowl = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.86, pLen * 0.94, 0.30), ironCrimson);
        proxCowl.position.set(0, pLen / 2, 0.06);
        proxGroup.add(proxCowl);

        const proxDorsalGuard = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.76, pLen * 0.84, 0.08), ironCrimsonSmooth);
        proxDorsalGuard.position.set(0, pLen / 2, -0.13);
        proxGroup.add(proxDorsalGuard);

        const proxUnder = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.70, pLen * 0.88, 0.06), chromeSilver);
        proxUnder.position.set(0, pLen / 2, -0.09);
        proxGroup.add(proxUnder);

        const proxTrim = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.90, 0.06, 0.26), titaniumGold);
        proxTrim.position.set(0, pLen - 0.04, 0.08);
        proxGroup.add(proxTrim);

        const pipHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, f.w * 0.88, 16), chromeSilver);
        pipHinge.rotation.z = Math.PI / 2;
        pipHinge.position.set(0, pLen, 0.06);
        proxGroup.add(pipHinge);

        for (let r of [-0.08, 0.08]) {
            const flexRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.020, 12, 24), darkGunmetal);
            flexRing.rotation.y = Math.PI / 2;
            flexRing.position.set(r, pLen, 0.06);
            proxGroup.add(flexRing);
        }

        const interGroup = new THREE.Group();
        interGroup.position.set(0, pLen, 0);
        proxGroup.add(interGroup);

        const iLen = f.totalLen * 0.32;
        const interCowl = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.80, iLen * 0.92, 0.26), ironCrimson);
        interCowl.position.set(0, iLen / 2, 0.06);
        interGroup.add(interCowl);

        const interDorsal = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.70, iLen * 0.82, 0.07), ironCrimsonSmooth);
        interDorsal.position.set(0, iLen / 2, -0.11);
        interGroup.add(interDorsal);

        const interTrim = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.84, 0.05, 0.22), titaniumGold);
        interTrim.position.set(0, iLen - 0.03, 0.07);
        interGroup.add(interTrim);

        const dipHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, f.w * 0.82, 16), chromeSilver);
        dipHinge.rotation.z = Math.PI / 2;
        dipHinge.position.set(0, iLen, 0.05);
        interGroup.add(dipHinge);

        const distGroup = new THREE.Group();
        distGroup.position.set(0, iLen, 0);
        interGroup.add(distGroup);

        const dLen = f.totalLen * 0.26;
        const tipShell = new THREE.Mesh(
            new THREE.CylinderGeometry(f.w * 0.18, f.w * 0.32, dLen * 0.88, 16),
            ironCrimsonSmooth
        );
        tipShell.position.set(0, dLen * 0.44, 0.04);
        distGroup.add(tipShell);

        const tipPad = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.62, dLen * 0.50, 0.08), titaniumGold);
        tipPad.position.set(0, dLen * 0.60, 0.08);
        distGroup.add(tipPad);

        const tipBack = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.58, dLen * 0.65, 0.07), titaniumGold);
        tipBack.position.set(0, dLen * 0.48, -0.06);
        distGroup.add(tipBack);

        const fingerLed = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 10), cyanConduit);
        fingerLed.position.set(0, dLen * 0.90, 0.04);
        distGroup.add(fingerLed);

        gauntletGroup.add(fingerGroup);
        gauntletFingers.push({
            group: fingerGroup,
            prox: proxGroup,
            inter: interGroup,
            dist: distGroup,
            spec: f
        });
    });

    // 8. ARTICULATED MARK 85 THUMB EXOSKELETON (NO FLOATING SPHERE!)
    thumbGroup = new THREE.Group();
    thumbGroup.position.set(-0.72, -0.02, 0.02);
    thumbGroup.rotation.z = 0.38;

    const thumbSocketCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.22, 0.18, 16),
        darkGunmetal
    );
    thumbSocketCup.rotation.x = Math.PI / 2;
    thumbGroup.add(thumbSocketCup);

    const thumbJointBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), chromeSilver);
    thumbGroup.add(thumbJointBall);

    const thumbSocketRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 12, 32), titaniumGold);
    thumbSocketRim.rotation.x = Math.PI / 2;
    thumbGroup.add(thumbSocketRim);

    const thumbBase = new THREE.Group();
    thumbGroup.add(thumbBase);

    const thumbLen = 0.68;
    const thumbProx = new THREE.Mesh(new THREE.BoxGeometry(0.38, thumbLen, 0.30), ironCrimson);
    thumbProx.position.set(0, thumbLen / 2, 0.03);
    thumbBase.add(thumbProx);

    const thumbProxBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, thumbLen * 0.90, 0.07), titaniumGold);
    thumbProxBack.position.set(0, thumbLen / 2, -0.13);
    thumbBase.add(thumbProxBack);

    const thumbTrim = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.07, 0.32), titaniumGold);
    thumbTrim.position.set(0, thumbLen - 0.04, 0.04);
    thumbBase.add(thumbTrim);

    const thumbIpHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 14), chromeSilver);
    thumbIpHinge.rotation.z = Math.PI / 2;
    thumbIpHinge.position.set(0, thumbLen, 0.05);
    thumbBase.add(thumbIpHinge);

    const thumbDistGroup = new THREE.Group();
    thumbDistGroup.position.set(0, thumbLen, 0.05);
    thumbBase.add(thumbDistGroup);

    const thumbTipShell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.48, 16), ironCrimsonSmooth);
    thumbTipShell.position.set(0, 0.24, 0.03);
    thumbDistGroup.add(thumbTipShell);

    const thumbTipPad = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.20, 0.08), titaniumGold);
    thumbTipPad.position.set(0, 0.36, 0.07);
    thumbDistGroup.add(thumbTipPad);

    const thumbTipBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.07), titaniumGold);
    thumbTipBack.position.set(0, 0.32, -0.05);
    thumbDistGroup.add(thumbTipBack);

    thumbGroup.userData = {
        basePos: new THREE.Vector3(-0.72, -0.02, 0.02),
        baseRotZ: 0.38,
        thumbBase: thumbBase,
        thumbDistGroup: thumbDistGroup
    };
    gauntletGroup.add(thumbGroup);

    // STAGE 1: POWER SOURCE (PUMPING MECHANISM)
    schematicPowerSourceGroup = new THREE.Group();
    schematicPowerSourceGroup.position.set(0, -2.60, 0);
    schematicPowerSourceGroup.userData = { baseY: -2.60 };

    // Arc Reactor Core Housing & Rim
    const arcHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.38, 32), darkGunmetal);
    arcHousing.position.set(0, 0, 0);
    schematicPowerSourceGroup.add(arcHousing);

    const arcGoldRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 16, 36), titaniumGold);
    arcGoldRim.position.set(0, 0.16, 0);
    arcGoldRim.rotation.x = Math.PI / 2;
    schematicPowerSourceGroup.add(arcGoldRim);

    // Glowing Cyan Arc Reactor Plasma Disc Core
    const arcPlasma = new THREE.Mesh(
        new THREE.CircleGeometry(0.36, 32),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
    );
    arcPlasma.rotation.x = Math.PI / 2;
    arcPlasma.position.set(0, 0.19, 0);
    schematicPowerSourceGroup.add(arcPlasma);

    const arcPupil = new THREE.Mesh(
        new THREE.CircleGeometry(0.16, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    arcPupil.rotation.x = Math.PI / 2;
    arcPupil.position.set(0, 0.195, 0);
    schematicPowerSourceGroup.add(arcPupil);
    arcReactorCorePulse = arcPupil;

    // 10 Radial Magnetic Induction Coils around core
    for (let c = 0; c < 10; c++) {
        const theta = (c * Math.PI * 2) / 10;
        const coilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.14), titaniumGold);
        coilMesh.position.set(Math.cos(theta) * 0.40, 0.05, Math.sin(theta) * 0.40);
        coilMesh.rotation.y = theta;
        schematicPowerSourceGroup.add(coilMesh);
    }

    // 3 Segmented Magnetic Containment Stator Rings
    schematicContainmentRings = [];
    for (let cr = 0; cr < 3; cr++) {
        const ringGroup = new THREE.Group();
        ringGroup.position.set(0, 0.28 + cr * 0.32, 0);
        const ringTorus = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.038, 16, 36), chromeSilver);
        ringTorus.rotation.x = Math.PI / 2;
        ringGroup.add(ringTorus);

        // Segment notches on ring
        for (let s = 0; s < 6; s++) {
            const sAngle = (s * Math.PI * 2) / 6;
            const notch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), darkGunmetal);
            notch.position.set(Math.cos(sAngle) * 0.58, 0, Math.sin(sAngle) * 0.58);
            notch.rotation.y = sAngle;
            ringGroup.add(notch);
        }

        const arcLine = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.015, 8, 24), cyanConduit);
        arcLine.rotation.x = Math.PI / 2;
        ringGroup.add(arcLine);

        ringGroup.userData = { baseRelY: 0.28 + cr * 0.32, ringIdx: cr };
        schematicPowerSourceGroup.add(ringGroup);
        schematicContainmentRings.push(ringGroup);
    }
    schematicPowerSourceGroup.visible = false;
    gauntletGroup.add(schematicPowerSourceGroup);

    // --------------------------------------------------------
    // STAGE 2: THE CORE CHAMBER (ACTIVE MEDIUM)
    // --------------------------------------------------------
    schematicCoreChamberGroup = new THREE.Group();
    schematicCoreChamberGroup.position.set(0, -1.60, 0);
    schematicCoreChamberGroup.userData = { baseY: -1.60 };

    // Transparent Quartz Laser Cavity Tube
    const quartzMat = new THREE.MeshPhysicalMaterial({
        color: 0x88e8ff,
        transmission: 0.88,
        opacity: 0.38,
        transparent: true,
        roughness: 0.04,
        clearcoat: 1.0,
        side: THREE.DoubleSide
    });
    const quartzTube = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.82, 32, 1, true), quartzMat);
    schematicCoreChamberGroup.add(quartzTube);

    // End Collars / Flanges for Quartz Tube
    for (let side of [-1, 1]) {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.08, 32), titaniumGold);
        flange.position.set(0, side * 0.88, 0);
        schematicCoreChamberGroup.add(flange);
    }

    // 4 Longitudinal Chrome Optical Rails
    const railAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    railAngles.forEach(ang => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.86, 12), chromeSilver);
        rail.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);
        schematicCoreChamberGroup.add(rail);
    });

    // Central Optical Axis Stimulated Emission Beam Line
    const centralAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.82, 12), cyanConduit);
    schematicCoreChamberGroup.add(centralAxis);

    // Floating Gain Medium Atoms (N1 Ground Cyan & N2 Excited Magenta)
    schematicCoreAtoms = [];
    const n1Geo = new THREE.SphereGeometry(0.044, 12, 12);
    const n1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const n2Geo = new THREE.SphereGeometry(0.056, 14, 14);
    const n2Mat = new THREE.MeshBasicMaterial({ color: 0xff2a85 });

    for (let a = 0; a < 26; a++) {
        const isExcited = (a % 3 === 0);
        const atomMesh = new THREE.Mesh(isExcited ? n2Geo : n1Geo, isExcited ? n2Mat : n1Mat);
        const r = 0.12 + Math.random() * 0.30;
        const theta = Math.random() * Math.PI * 2;
        const baseY = (Math.random() - 0.5) * 1.50;
        atomMesh.position.set(Math.cos(theta) * r, baseY, Math.sin(theta) * r);
        schematicCoreChamberGroup.add(atomMesh);

        schematicCoreAtoms.push({
            mesh: atomMesh,
            r: r,
            theta: theta,
            baseY: baseY,
            vTheta: (0.015 + Math.random() * 0.025) * (Math.random() > 0.5 ? 1 : -1),
            phase: Math.random() * Math.PI * 2,
            isExcited: isExcited
        });
    }
    schematicCoreChamberGroup.visible = false;
    gauntletGroup.add(schematicCoreChamberGroup);

    // --------------------------------------------------------
    // STAGE 3: REAR EMITTER (FULLY REFLECTIVE MIRROR)
    // --------------------------------------------------------
    schematicRearEmitterGroup = new THREE.Group();
    schematicRearEmitterGroup.position.set(0, -0.55, 0);
    schematicRearEmitterGroup.userData = { baseY: -0.55 };

    // 100% Reflective Mirror Disc (Gold, Facing Upwards along +Y toward Palm)
    const mirror100Geo = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 32);
    const mirror100Mat = new THREE.MeshPhysicalMaterial({
        color: 0xf5c542,
        metalness: 0.98,
        roughness: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02
    });
    const mirror100 = new THREE.Mesh(mirror100Geo, mirror100Mat);
    schematicRearEmitterGroup.add(mirror100);

    const mirrorBezel = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.035, 16, 36), chromeSilver);
    mirrorBezel.rotation.x = Math.PI / 2;
    schematicRearEmitterGroup.add(mirrorBezel);

    // Internal Reflection Ray Cone (Ping back into cavity)
    const rayCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.44, 0.90, 16, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        })
    );
    rayCone.position.set(0, -0.45, 0);
    schematicRearEmitterGroup.add(rayCone);

    schematicRearEmitterGroup.visible = false;
    gauntletGroup.add(schematicRearEmitterGroup);

    // --------------------------------------------------------
    // STAGE 4: PALM APERTURE (PARTIALLY REFLECTIVE MIRROR)
    // --------------------------------------------------------
    schematicPalmApertureGroup = new THREE.Group();
    schematicPalmApertureGroup.position.set(0, 0.00, 0);
    schematicPalmApertureGroup.userData = { baseY: 0.00 };

    // Partially Reflective Output Coupler Mirror Disc (R = 0.90)
    const couplerGeo = new THREE.CircleGeometry(0.40, 32);
    const couplerMat = new THREE.MeshPhysicalMaterial({
        color: 0x80d8ff,
        transparent: true,
        opacity: 0.65,
        metalness: 0.92,
        roughness: 0.08,
        side: THREE.DoubleSide
    });
    const couplerDisc = new THREE.Mesh(couplerGeo, couplerMat);
    couplerDisc.rotation.x = Math.PI / 2;
    couplerDisc.position.set(0, 0.135, 0);
    schematicPalmApertureGroup.add(couplerDisc);

    // 4 Flared Crimson Casing Petals around the Aperture (Matches reference diagram)
    for (let p = 0; p < 4; p++) {
        const pAng = (p * Math.PI) / 2 + Math.PI / 4;
        const petal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.38), ironCrimsonSmooth);
        petal.position.set(Math.cos(pAng) * 0.54, 0.08, Math.sin(pAng) * 0.54);
        petal.rotation.y = pAng;
        petal.rotation.z = 0.25;
        schematicPalmApertureGroup.add(petal);

        const pTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.36), titaniumGold);
        pTrim.position.set(Math.cos(pAng) * 0.62, 0.09, Math.sin(pAng) * 0.62);
        pTrim.rotation.y = pAng;
        pTrim.rotation.z = 0.25;
        schematicPalmApertureGroup.add(pTrim);
    }
    schematicPalmApertureGroup.visible = false;
    gauntletGroup.add(schematicPalmApertureGroup);

    // --------------------------------------------------------
    // STAGE 5: COHERENT OUTPUT (THE BLAST & WAVEFRONTS)
    // --------------------------------------------------------
    schematicCoherentBeamGroup = new THREE.Group();
    schematicCoherentBeamGroup.position.set(0, 0.70, 0);
    schematicCoherentBeamGroup.userData = { baseY: 0.70 };

    // Intense Coherent Blue Laser Beam Sheath (Escaping through fingers to the right)
    const beamSheathGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.2, 24);
    const beamSheathMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.80,
        blending: THREE.AdditiveBlending
    });
    schematicLaserBeamMesh = new THREE.Mesh(beamSheathGeo, beamSheathMat);
    schematicLaserBeamMesh.position.set(0, 2.60, 0.12);
    schematicCoherentBeamGroup.add(schematicLaserBeamMesh);

    // Inner White Plasma Laser Core
    const beamCoreGeo = new THREE.CylinderGeometry(0.045, 0.055, 5.4, 16);
    const beamCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
    });
    const beamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat);
    beamCore.position.set(0, 2.70, 0.12);
    schematicCoherentBeamGroup.add(beamCore);

    // 4 Traveling Wavefront Photonic Pulse Rings (Escaping coherent radiation)
    schematicWavefrontRings = [];
    for (let w = 0; w < 4; w++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.20, 0.024, 12, 32),
            new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.88,
                blending: THREE.AdditiveBlending
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 0.8 + w * 1.2, 0.12);
        schematicCoherentBeamGroup.add(ring);
        schematicWavefrontRings.push(ring);
    }

    // Muzzle Flash Burst Star at Aperture Exit
    const flashStar = new THREE.Mesh(
        new THREE.SphereGeometry(0.20, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending })
    );
    flashStar.position.set(0, 0.05, 0.12);
    schematicCoherentBeamGroup.add(flashStar);

    schematicCoherentBeamGroup.visible = false;
    gauntletGroup.add(schematicCoherentBeamGroup);
}

function buildOpticalResonator() {
    resonatorGroup = new THREE.Group();
    resonatorGroup.visible = false;
    scene.add(resonatorGroup);
    
    const cavityLength = 16.0;
    const cavityRadius = 3.6;
    // Compact, Centered Heavy Optical Bench Rail
    const railMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.25
    });
    resBenchRail = new THREE.Mesh(new THREE.BoxGeometry(44, 0.45, 3.6), railMat);
    resBenchRail.position.set(0, -3.0, 0);
    resonatorGroup.add(resBenchRail);
    
    // Chrome Dual Guide Rods
    const rodGeo = new THREE.CylinderGeometry(0.12, 0.12, 44, 24);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
    const rod1 = new THREE.Mesh(rodGeo, rodMat);
    rod1.rotation.z = Math.PI / 2;
    rod1.position.set(0, -2.75, 1.2);
    resonatorGroup.add(rod1);
    const rod2 = new THREE.Mesh(rodGeo, rodMat);
    rod2.rotation.z = Math.PI / 2;
    rod2.position.set(0, -2.75, -1.2);
    resonatorGroup.add(rod2);
    
    // Left Laser Diode Collimator Housing (-20)
    const emitterGroup = new THREE.Group();
    emitterGroup.position.set(-20, 0, 0);
    const emitterBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.0, 3.2), new THREE.MeshStandardMaterial({ color: 0x0b1329, metalness: 0.7, roughness: 0.3 }));
    const emitterLens = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.6, 24), new THREE.MeshBasicMaterial({ color: resonatorState.spectralColorHex }));
    emitterLens.rotation.z = Math.PI / 2;
    emitterLens.position.x = 1.6;
    const emitterBase = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 3.0, 16), railMat);
    emitterBase.position.y = -1.5;
    emitterGroup.add(emitterBody);
    emitterGroup.add(emitterLens);
    emitterGroup.add(emitterBase);
    resEmitterHousing = emitterGroup;
    resonatorGroup.add(emitterGroup);
    
    // Right Photodetector / Power Meter Housing (+20)
    const detectorGroup = new THREE.Group();
    detectorGroup.position.set(20, 0, 0);
    const detectorBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.0, 3.2), new THREE.MeshStandardMaterial({ color: 0x0b1329, metalness: 0.7, roughness: 0.3 }));
    const detectorSensor = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.45, 24), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 }));
    detectorSensor.rotation.z = Math.PI / 2;
    detectorSensor.position.x = -1.6;
    const detectorBase = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 3.0, 16), railMat);
    detectorBase.position.y = -1.5;
    detectorGroup.add(detectorBody);
    detectorGroup.add(detectorSensor);
    detectorGroup.add(detectorBase);
    resDetectorHousing = detectorGroup;
    resonatorGroup.add(detectorGroup);
    
    // High Reflector Gold Mirror Assembly (-8.0)
    const mirrorGeo = new THREE.CylinderGeometry(cavityRadius, cavityRadius, 0.45, 48);
    resMirrorMatLeft = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x553300,
        metalness: 0.85,
        roughness: 0.12
    });
    const mirrorLeft = new THREE.Mesh(mirrorGeo, resMirrorMatLeft);
    mirrorLeft.rotation.z = Math.PI / 2;
    mirrorLeft.position.x = -cavityLength / 2;
    resonatorGroup.add(mirrorLeft);
    resMirrorLeft = mirrorLeft;
    
    // Output Coupler Mirror Assembly (+8.0)
    resMirrorMatRight = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        metalness: 0.25,
        roughness: 0.05,
        transmission: 0.63,
        transparent: true,
        opacity: 0.65
    });
    const mirrorRight = new THREE.Mesh(mirrorGeo, resMirrorMatRight);
    mirrorRight.rotation.z = Math.PI / 2;
    mirrorRight.position.x = cavityLength / 2;
    resonatorGroup.add(mirrorRight);
    resMirrorRight = mirrorRight;
    
    // Mounting Rings and Pedestal Clamps
    const mountGeo = new THREE.TorusGeometry(cavityRadius + 0.15, 0.18, 16, 64);
    const mountMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    
    const mountL = new THREE.Mesh(mountGeo, mountMat);
    mountL.rotation.y = Math.PI / 2;
    mountL.position.x = -cavityLength / 2;
    const postGeo = new THREE.CylinderGeometry(0.28, 0.28, 3.0, 16);
    const postL = new THREE.Mesh(postGeo, railMat);
    postL.position.y = -1.5;
    mountL.add(postL);
    resonatorGroup.add(mountL);
    resMountL = mountL;
    
    const mountR = new THREE.Mesh(mountGeo, mountMat);
    mountR.rotation.y = Math.PI / 2;
    mountR.position.x = cavityLength / 2;
    const postR = new THREE.Mesh(postGeo, railMat);
    postR.position.y = -1.5;
    mountR.add(postR);
    resonatorGroup.add(mountR);
    resMountR = mountR;

    // Laser Beams: Input, Intracavity Core, and Transmitted Output
    const beamGeoBase = new THREE.CylinderGeometry(0.18, 0.18, 16, 24);
    
    resInputBeam = new THREE.Mesh(beamGeoBase, new THREE.MeshBasicMaterial({
        color: resonatorState.spectralColorHex,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    }));
    resInputBeam.rotation.z = Math.PI / 2;
    resInputBeam.position.x = (-24 - cavityLength / 2) / 2;
    resonatorGroup.add(resInputBeam);
    
    resLaserCoreBeam = new THREE.Mesh(beamGeoBase, new THREE.MeshBasicMaterial({
        color: resonatorState.spectralColorHex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    }));
    resLaserCoreBeam.rotation.z = Math.PI / 2;
    resLaserCoreBeam.position.x = 0;
    resonatorGroup.add(resLaserCoreBeam);
    
    resOutputBeam = new THREE.Mesh(beamGeoBase, new THREE.MeshBasicMaterial({
        color: resonatorState.spectralColorHex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    }));
    resOutputBeam.rotation.z = Math.PI / 2;
    resOutputBeam.position.x = (cavityLength / 2 + 24) / 2;
    resonatorGroup.add(resOutputBeam);

    // 3D Standing Wave Visual Mesh (Primary Oscillating Ey Curve)
    const waveCount = 300;
    const wavePos = new Float32Array(waveCount * 3);
    const waveGeo = new THREE.BufferGeometry();
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3));
    resStandingWaveLine = new THREE.Line(waveGeo, new THREE.LineBasicMaterial({
        color: resonatorState.spectralColorHex,
        linewidth: 3,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
    }));
    resonatorGroup.add(resStandingWaveLine);

    // 3D Orthogonal Cross Standing Wave (Ez Curve)
    const wavePosCross = new Float32Array(waveCount * 3);
    const waveGeoCross = new THREE.BufferGeometry();
    waveGeoCross.setAttribute('position', new THREE.BufferAttribute(wavePosCross, 3));
    resStandingWaveCrossLine = new THREE.Line(waveGeoCross, new THREE.LineBasicMaterial({
        color: resonatorState.spectralColorHex,
        linewidth: 1.5,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
    }));
    resonatorGroup.add(resStandingWaveCrossLine);

    // Standing Wave Envelope Guide Lines (Top & Bottom ±Envelope)
    const envTopPos = new Float32Array(waveCount * 3);
    const envTopGeo = new THREE.BufferGeometry();
    envTopGeo.setAttribute('position', new THREE.BufferAttribute(envTopPos, 3));
    resWaveEnvelopeTop = new THREE.Line(envTopGeo, new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    }));
    resonatorGroup.add(resWaveEnvelopeTop);

    const envBotPos = new Float32Array(waveCount * 3);
    const envBotGeo = new THREE.BufferGeometry();
    envBotGeo.setAttribute('position', new THREE.BufferAttribute(envBotPos, 3));
    resWaveEnvelopeBottom = new THREE.Line(envBotGeo, new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    }));
    resonatorGroup.add(resWaveEnvelopeBottom);

    // Node Marker Ring Group
    resNodeMarkerGroup = new THREE.Group();
    resonatorGroup.add(resNodeMarkerGroup);

    // =========================================================================
    // OPTICAL RESONATOR GAIN MEDIUM & QUANTUM ATOMS (STIMULATED EMISSION CORE)
    // =========================================================================
    gainMediumGroup = new THREE.Group();
    gainMediumGroup.name = "gainMediumGroup";
    resonatorGroup.add(gainMediumGroup);

    // 1. Sleek Laser Crystal Rod (Nd:YAG Active Gain Medium)
    const crystalGeo = new THREE.CylinderGeometry(0.82, 0.82, 9.6, 32, 1, false);
    const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x083344,
        emissiveIntensity: 0.25,
        metalness: 0.1,
        roughness: 0.08,
        transmission: 0.78,
        transparent: true,
        opacity: 0.42,
        ior: 1.55
    });
    gainCrystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    gainCrystalMesh.rotation.z = Math.PI / 2;
    gainCrystalMesh.position.set(0, 0, 0);
    gainMediumGroup.add(gainCrystalMesh);

    // Inner Active Core Fluorescence Glow (Intensifies with amplification)
    const coreGlowGeo = new THREE.CylinderGeometry(0.72, 0.72, 9.4, 24);
    const coreGlowMat = new THREE.MeshBasicMaterial({
        color: resonatorState.spectralColorHex,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending
    });
    gainCrystalCore = new THREE.Mesh(coreGlowGeo, coreGlowMat);
    gainCrystalCore.rotation.z = Math.PI / 2;
    gainCrystalCore.position.set(0, 0, 0);
    gainMediumGroup.add(gainCrystalCore);

    // Mounting Collars & Optical Bench Stanchions for Gain Medium (-4.8 and +4.8)
    const collarGeo = new THREE.TorusGeometry(0.88, 0.12, 16, 48);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 });
    const stanchionGeo = new THREE.CylinderGeometry(0.22, 0.22, 3.0, 16);
    
    [-4.8, 4.8].forEach(xPos => {
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.rotation.y = Math.PI / 2;
        collar.position.set(xPos, 0, 0);
        const stanchion = new THREE.Mesh(stanchionGeo, railMat);
        stanchion.position.set(0, -1.5, 0);
        collar.add(stanchion);
        gainMediumGroup.add(collar);
    });

    // 2. Optical Flashlamp & Diode Pump Assemblies (Mounted Above and Below)
    pumpEmittersTop = [];
    pumpEmittersBottom = [];
    const pumpHousingGeo = new THREE.BoxGeometry(9.6, 0.35, 0.8);
    const pumpHousingMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
    
    // Top Pump Bar (y = +1.65)
    const pumpBarTop = new THREE.Mesh(pumpHousingGeo, pumpHousingMat);
    pumpBarTop.position.set(0, 1.65, 0);
    gainMediumGroup.add(pumpBarTop);
    
    // Bottom Pump Bar (y = -1.65)
    const pumpBarBottom = new THREE.Mesh(pumpHousingGeo, pumpHousingMat);
    pumpBarBottom.position.set(0, -1.65, 0);
    gainMediumGroup.add(pumpBarBottom);

    // 6 High-Power Emitter Diodes on each bar
    const diodeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.15, 16);
    for (let i = 0; i < 6; i++) {
        const xPos = -4.0 + (i / 5) * 8.0;
        // Top diode
        const diodeMatTop = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
        const diodeTop = new THREE.Mesh(diodeGeo, diodeMatTop);
        diodeTop.position.set(xPos, -0.18, 0);
        pumpBarTop.add(diodeTop);
        pumpEmittersTop.push(diodeTop);

        // Bottom diode
        const diodeMatBot = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
        const diodeBot = new THREE.Mesh(diodeGeo, diodeMatBot);
        diodeBot.position.set(xPos, 0.18, 0);
        pumpBarBottom.add(diodeBot);
        pumpEmittersBottom.push(diodeBot);
    }

    // 3. 36 Quantum Atoms Structured Inside the Gain Medium
    gainMediumAtoms = [];
    atomMeshes = []; // Keep compatibility with existing references
    const numAtoms = 36;
    const atomCoreGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const orbitalRingGeo = new THREE.TorusGeometry(0.20, 0.012, 8, 32);
    const electronGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const haloGeo = new THREE.SphereGeometry(0.26, 12, 12);
    const flashRingGeo = new THREE.RingGeometry(0.06, 0.16, 24);

    for (let i = 0; i < numAtoms; i++) {
        const atomGroup = new THREE.Group();
        
        // Distribution inside gain medium cylinder: 4 longitudinal bands of 9 atoms
        const bandIndex = Math.floor(i / 9);
        const inBand = i % 9;
        const xBand = -3.8 + (bandIndex / 3.0) * 7.6 + (Math.random() - 0.5) * 0.45;
        const angle = (inBand / 9.0) * Math.PI * 2 + (bandIndex * 0.4);
        const radius = 0.15 + (Math.random() * 0.42);
        const yPos = Math.sin(angle) * radius;
        const zPos = Math.cos(angle) * radius;

        atomGroup.position.set(xBand, yPos, zPos);
        gainMediumGroup.add(atomGroup);

        // Nucleus / Core Sphere
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            emissive: 0x0369a1,
            emissiveIntensity: 0.5,
            roughness: 0.25,
            metalness: 0.2
        });
        const coreMesh = new THREE.Mesh(atomCoreGeo, coreMat);
        atomGroup.add(coreMesh);
        atomMeshes.push(coreMesh);

        // Valence Electron Orbital Ring
        const orbitalMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });
        const orbitalMesh = new THREE.Mesh(orbitalRingGeo, orbitalMat);
        orbitalMesh.rotation.x = Math.random() * Math.PI;
        orbitalMesh.rotation.y = Math.random() * Math.PI;
        atomGroup.add(orbitalMesh);

        // Revolving Electron Bead
        const electronMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const electronMesh = new THREE.Mesh(electronGeo, electronMat);
        orbitalMesh.add(electronMesh);

        // Excitation Halo
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        atomGroup.add(haloMesh);

        // Quantum Transition Shockwave Flash Ring
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending
        });
        const flashRing = new THREE.Mesh(flashRingGeo, flashMat);
        atomGroup.add(flashRing);

        const atomData = {
            group: atomGroup,
            coreMesh,
            coreMat,
            orbitalMesh,
            orbitalMat,
            electronMesh,
            haloMesh,
            haloMat,
            flashRing,
            flashMat,
            baseX: xBand,
            baseY: yPos,
            baseZ: zPos,
            phase: Math.random() * Math.PI * 2,
            electronAngle: Math.random() * Math.PI * 2,
            flashLife: 0.0,
            state: 'E1', // 'E1' (Ground) or 'E2' (Excited)
            isExcited: false,
            
            // State Transition: Pumping (E1 -> E2) or Stimulated Emission (E2 -> E1)
            setExcited: function(excited, triggerFlash = true) {
                this.state = excited ? 'E2' : 'E1';
                this.isExcited = excited;
                coreMesh.userData.isExcited = excited;
                
                if (excited) {
                    // Transition to Excited State E2 (Vibrant neon ruby-gold)
                    this.coreMat.color.setHex(0xf43f5e);
                    this.coreMat.emissive.setHex(0xfb7185);
                    this.coreMat.emissiveIntensity = 2.4;
                    this.orbitalMat.color.setHex(0xfbbf24);
                    this.orbitalMat.opacity = 0.85;
                    this.haloMat.color.setHex(0xf43f5e);
                    this.haloMat.opacity = 0.65;
                    this.orbitalMesh.scale.set(1.5, 1.5, 1.5); // Expanded quantum orbital
                    if (triggerFlash) {
                        this.flashLife = 1.0;
                        this.flashMat.color.setHex(0xfef08a);
                    }
                } else {
                    // Transition to Ground State E1 (Cool cyan-sapphire)
                    this.coreMat.color.setHex(0x0284c7);
                    this.coreMat.emissive.setHex(0x0369a1);
                    this.coreMat.emissiveIntensity = 0.5;
                    this.orbitalMat.color.setHex(0x38bdf8);
                    this.orbitalMat.opacity = 0.45;
                    this.haloMat.color.setHex(0x38bdf8);
                    this.haloMat.opacity = 0.15;
                    this.orbitalMesh.scale.set(1.0, 1.0, 1.0);
                    if (triggerFlash) {
                        this.flashLife = 1.0;
                        this.flashMat.color.setHex(0x38bdf8);
                    }
                }
            }
        };

        coreMesh.userData = atomData;
        gainMediumAtoms.push(atomData);
    }

    // 4. Pump Energy Particles System (Flashlamps -> Gain Medium)
    pumpParticlesGroup = new THREE.Group();
    resonatorGroup.add(pumpParticlesGroup);
    pumpParticles = [];
    const pumpPartGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const pumpGlowGeo = new THREE.SphereGeometry(0.18, 8, 8);
    
    for (let i = 0; i < 40; i++) {
        const pMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
        const gMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        const pMesh = new THREE.Mesh(pumpPartGeo, pMat);
        const gMesh = new THREE.Mesh(pumpGlowGeo, gMat);
        pMesh.add(gMesh);
        pMesh.visible = false;
        pumpParticlesGroup.add(pMesh);

        pumpParticles.push({
            mesh: pMesh,
            active: false,
            x: 0, y: 0, z: 0,
            targetAtom: null,
            speed: 0.28
        });
    }

    // 5. Coherent Intracavity Laser Photons (Travel between mirrors, undergo Stimulated Emission)
    cavityPhotonsGroup = new THREE.Group();
    resonatorGroup.add(cavityPhotonsGroup);
    cavityPhotons = [];
    const MAX_CAVITY_PHOTONS = 90;
    
    const photonCoreGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const photonAuraGeo = new THREE.SphereGeometry(0.24, 8, 8);

    // Mini sine wave tail geometry (shows optical wavelength & phase)
    const waveletPts = 12;
    const photonWaveletGeo = new THREE.BufferGeometry();
    const photonWaveletPoss = new Float32Array(waveletPts * 3);
    photonWaveletGeo.setAttribute('position', new THREE.BufferAttribute(photonWaveletPoss, 3));

    for (let i = 0; i < MAX_CAVITY_PHOTONS; i++) {
        const phMat = new THREE.MeshBasicMaterial({ color: resonatorState.spectralColorHex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
        const auMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
        const phMesh = new THREE.Mesh(photonCoreGeo, phMat);
        const auMesh = new THREE.Mesh(photonAuraGeo, auMat);
        phMesh.add(auMesh);

        // Coherent wave packet tail
        const tailGeo = photonWaveletGeo.clone();
        const tailLine = new THREE.Line(tailGeo, new THREE.LineBasicMaterial({
            color: resonatorState.spectralColorHex,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        }));
        phMesh.add(tailLine);

        phMesh.visible = false;
        cavityPhotonsGroup.add(phMesh);

        cavityPhotons.push({
            mesh: phMesh,
            coreMat: phMat,
            auraMat: auMat,
            tailLine,
            active: false,
            x: 0, y: 0, z: 0,
            vx: 0.38,
            phase: 0,
            cooldown: 0, // Prevents immediate re-trigger on the same atom
            isTwin: false
        });
    }

    // Maintain resChargesGroup for any backward compatibility
    resChargesGroup = cavityPhotonsGroup;
    activeLaserCharges = [];

    // High-Energy Optical Laser Blast Assembly (Shoots along +X when triggered)
    opticalBlastGroup = new THREE.Group();
    resonatorGroup.add(opticalBlastGroup);

    const blastCoreGeo = new THREE.CylinderGeometry(0.48, 0.48, 38, 24);
    opticalBlastCore = new THREE.Mesh(blastCoreGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
    }));
    opticalBlastCore.rotation.z = Math.PI / 2;
    opticalBlastCore.position.x = 19;
    opticalBlastGroup.add(opticalBlastCore);

    const blastAuraGeo = new THREE.CylinderGeometry(1.6, 2.4, 38, 24);
    opticalBlastAura = new THREE.Mesh(blastAuraGeo, new THREE.MeshBasicMaterial({
        color: resonatorState.spectralColorHex,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
    }));
    opticalBlastAura.rotation.z = Math.PI / 2;
    opticalBlastAura.position.x = 19;
    opticalBlastGroup.add(opticalBlastAura);

    opticalBlastRings = [];
    for (let i = 0; i < 4; i++) {
        const ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.8, 3.2, 32),
            new THREE.MeshBasicMaterial({
                color: resonatorState.spectralColorHex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending
            })
        );
        ringMesh.rotation.y = Math.PI / 2;
        ringMesh.position.x = 8.0 + i * 4.5;
        ringMesh.userData = { initialX: ringMesh.position.x };
        opticalBlastGroup.add(ringMesh);
        opticalBlastRings.push(ringMesh);
    }
    opticalBlastGroup.visible = false;
}

// ==========================================
// OPTICAL RESONATOR FABRY-PÉROT PHYSICS & VISUALIZATION
// ==========================================
function nmToRGB(wavelength) {
    let r = 0, g = 0, b = 0;
    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        g = 0.0;
        b = 1.0;
    } else if (wavelength >= 440 && wavelength < 490) {
        r = 0.0;
        g = (wavelength - 440) / (490 - 440);
        b = 1.0;
    } else if (wavelength >= 490 && wavelength < 510) {
        r = 0.0;
        g = 1.0;
        b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1.0;
        b = 0.0;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1.0;
        g = -(wavelength - 645) / (645 - 580);
        b = 0.0;
    } else if (wavelength >= 645 && wavelength <= 800) {
        r = 1.0;
        g = 0.0;
        b = 0.0;
    }
    let factor = 0.0;
    if (wavelength >= 380 && wavelength < 420) {
        factor = 0.4 + 0.6 * (wavelength - 380) / (420 - 380);
    } else if (wavelength >= 420 && wavelength <= 700) {
        factor = 1.0;
    } else if (wavelength > 700 && wavelength <= 800) {
        factor = 0.45 + 0.55 * (800 - wavelength) / (800 - 700);
    } else {
        factor = 0.0;
    }
    const R = Math.round(255 * Math.pow(r * factor, 0.8));
    const G = Math.round(255 * Math.pow(g * factor, 0.8));
    const B = Math.round(255 * Math.pow(b * factor, 0.8));
    const hex = (R << 16) | (G << 8) | B;
    const css = `rgb(${R}, ${G}, ${B})`;
    return { r: R / 255, g: G / 255, b: B / 255, hex, css };
}

function updateResonatorPhysics() {
    const L_um = resonatorState.cavityLength;
    const lambda_nm = resonatorState.wavelength;
    const R = resonatorState.reflectivity;
    const n = resonatorState.refractiveIndex;
    
    const L_m = L_um * 1e-6;
    const lambda_m = lambda_nm * 1e-9;
    const c = 299792458; // m/s
    
    // Mode number: m = 2nL / λ
    const m = (2 * n * L_m) / lambda_m;
    resonatorState.m = m;
    
    // Free spectral range: FSR = c / (2nL)
    const fsrHz = c / (2 * n * L_m);
    const fsrTHz = fsrHz / 1e12;
    resonatorState.fsrTHz = fsrTHz;
    
    // FSR in wavelength: Δλ_FSR = λ² / (2nL)
    const deltaLambdaNm = (lambda_nm * lambda_nm) / (2 * n * L_um * 1000);
    resonatorState.fsrDeltaLambdaNm = deltaLambdaNm;
    
    // Coefficient of Finesse: F = 4R / (1 - R)²
    const F = (4 * R) / Math.pow(1 - R, 2);
    
    // Transmitted intensity: T = 1 / (1 + F * sin²(m * π))
    const sinTerm = Math.sin(m * Math.PI);
    const transmission = 1.0 / (1.0 + F * Math.pow(sinTerm, 2));
    resonatorState.transmission = transmission;
    
    // Spectral color from wavelength
    const col = nmToRGB(lambda_nm);
    resonatorState.spectralColorHex = col.hex;
    resonatorState.spectralColorCSS = col.css;
    
    // Sync 3D materials
    if (resStandingWaveLine) resStandingWaveLine.material.color.setHex(col.hex);
    if (resStandingWaveCrossLine) resStandingWaveCrossLine.material.color.setHex(col.hex);
    if (resLaserCoreBeam) {
        resLaserCoreBeam.material.color.setHex(col.hex);
    }
    if (resInputBeam) resInputBeam.material.color.setHex(col.hex);
    if (resOutputBeam) resOutputBeam.material.color.setHex(col.hex);
    if (resMirrorMatRight) {
        resMirrorMatRight.transmission = Math.max(0.04, 1.0 - R);
        resMirrorMatRight.opacity = 0.35 + 0.6 * R;
    }
    if (resMirrorMatLeft) {
        resMirrorMatLeft.metalness = 0.65 + 0.3 * R;
    }
    
    // Update DOM indicators
    const elLength = document.getElementById('res-val-length');
    if (elLength) elLength.innerText = `${L_um.toFixed(3)} µm`;
    
    const elWavelength = document.getElementById('res-val-wavelength');
    if (elWavelength) {
        elWavelength.innerText = `${lambda_nm.toFixed(1)} nm`;
        elWavelength.style.color = col.css;
    }
    
    const elReflectivity = document.getElementById('res-val-reflectivity');
    if (elReflectivity) elReflectivity.innerText = `${Math.round(R * 100)}%`;
    
    const elTransmission = document.getElementById('res-val-transmission');
    if (elTransmission) elTransmission.innerText = `${(transmission * 100).toFixed(1)}%`;
    
    const elBarTrans = document.getElementById('bar-res-transmission');
    if (elBarTrans) {
        elBarTrans.style.width = `${Math.min(100, Math.max(0, transmission * 100))}%`;
        elBarTrans.style.backgroundColor = col.css;
    }
    
    const elMode = document.getElementById('res-val-modenumber');
    if (elMode) elMode.innerText = m.toFixed(3);
    
    const isResonant = Math.abs(m - Math.round(m)) < 0.025;
    const elTag = document.getElementById('res-tag-resonance');
    if (elTag) {
        if (isResonant) {
            elTag.innerText = `RESONANCE (m=${Math.round(m)}) ✨`;
            elTag.className = "text-[10px] font-mono-hud font-bold text-emerald-300 mt-1 truncate animate-pulse";
        } else {
            const dev = Math.abs(m - Math.round(m));
            if (dev > 0.4) {
                elTag.innerText = "ANTI-RESONANCE ⚠️";
                elTag.className = "text-[10px] font-mono-hud font-bold text-rose-400 mt-1 truncate";
            } else {
                elTag.innerText = "OFF-RESONANCE";
                elTag.className = "text-[10px] font-mono-hud font-semibold text-amber-300 mt-1 truncate";
            }
        }
    }
    
    const elFsr = document.getElementById('res-val-fsr');
    if (elFsr) elFsr.innerText = `${fsrTHz.toFixed(2)} THz`;
    
    const elFsrLambda = document.getElementById('res-val-fsr-lambda');
    if (elFsrLambda) elFsrLambda.innerText = `${deltaLambdaNm.toFixed(1)} nm`;
    
    const txtM = document.getElementById('res-txt-m');
    if (txtM) txtM.innerText = m.toFixed(3);
    
    const pedaEl = document.getElementById('res-pedagogy-text');
    if (pedaEl) {
        let msg = `The cavity contains <span class="text-teal-300 font-bold">${m.toFixed(3)}</span> half-wavelengths. Integer values give constructive round-trip interference. Lossless, equal mirrors can transmit 100% at exact resonance even when each mirror is highly reflective.`;
        if (isResonant) {
            msg += `<br><span class="text-emerald-400 font-semibold">✨ Exact integer mode (m = ${Math.round(m)}):</span> Waves reflect in constructive phase, creating a standing wave with ${(transmission * 100).toFixed(1)}% transmission.`;
        } else {
            msg += `<br><span class="text-slate-400">Phase mismatch causes destructive interference, dropping transmission to ${(transmission * 100).toFixed(1)}%.</span>`;
        }
        pedaEl.innerHTML = msg;
    }
    
    // Redraw canvas spectrum
    drawTransmissionSpectrum();
    if (resonatorState.showFieldOverlay) {
        drawFieldOverlay();
    }
}

function drawTransmissionSpectrum() {
    const canvas = document.getElementById('spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width > 20 ? rect.width : (canvas.clientWidth > 20 ? canvas.clientWidth : 420));
    const h = Math.round(rect.height > 20 ? rect.height : (canvas.clientHeight > 20 ? canvas.clientHeight : 175));
    
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
    }
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    
    // Generous padding ensuring no axis numbers, mode labels, or tooltips are ever clipped!
    const padL = 46;
    const padR = 36;
    const padT = 24;
    const padB = 26;
    const plotW = Math.max(10, w - padL - padR);
    const plotH = Math.max(10, h - padT - padB);
    
    // Background - Deep space navy with subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#040914');
    bgGrad.addColorStop(1, '#071022');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Header telemetry bar inside graph
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('AIRY TRANSMISSION T(λ)', padL, 4);
    
    const isResonant = Math.abs(resonatorState.m - Math.round(resonatorState.m)) < 0.035;
    ctx.textAlign = 'right';
    if (isResonant) {
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('★ RESONANCE LOCK (100% TRANSMISSION)', padL + plotW, 4);
    } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`T = ${(resonatorState.transmission * 100).toFixed(1)}% · m = ${resonatorState.m.toFixed(2)}`, padL + plotW, 4);
    }
    
    // Y Grid lines (100%, 50%, 0%)
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    [
        { val: 1.0, label: '100%' },
        { val: 0.5, label: '50%' },
        { val: 0.0, label: '0%' }
    ].forEach(item => {
        const y = padT + plotH * (1.0 - item.val);
        ctx.strokeStyle = item.val === 0 ? 'rgba(71, 85, 105, 0.45)' : 'rgba(51, 65, 85, 0.35)';
        ctx.setLineDash(item.val === 0 ? [] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillStyle = item.val === 1.0 ? '#2dd4bf' : '#64748b';
        ctx.fillText(item.label, padL - 5, y);
    });
    ctx.setLineDash([]);
    
    // X Grid ticks & labels: 400, 500, 600, 700, 800
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    const xTicks = [400, 500, 600, 700, 800];
    xTicks.forEach(tick => {
        const x = padL + ((tick - 400) / 400) * plotW;
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        ctx.fillText(tick === 800 ? '800nm' : `${tick}`, x, padT + plotH + 5);
    });
    
    // Laser cavity physical parameters
    const L_um = resonatorState.cavityLength;
    const R = Math.max(0.01, Math.min(0.99, resonatorState.reflectivity));
    const n = resonatorState.refractiveIndex;
    const F = (4 * R) / Math.pow(1 - R, 2);
    
    // High-precision adaptive point generator guaranteeing 100% height at all resonant peaks
    const optCavity2nL = 2 * n * L_um * 1000; // in nm
    const mMin = Math.ceil(optCavity2nL / 800);
    const mMax = Math.floor(optCavity2nL / 400);
    
    // Collect peak wavelengths
    const peakLambdas = [];
    for (let mVal = mMin; mVal <= mMax; mVal++) {
        const pLambda = optCavity2nL / mVal;
        if (pLambda >= 400 && pLambda <= 800) {
            peakLambdas.push(pLambda);
        }
    }
    
    // Dense sample point list
    const sampleLambdas = new Set();
    const numBaseSamples = Math.max(700, Math.floor(plotW * 2.5));
    for (let i = 0; i <= numBaseSamples; i++) {
        sampleLambdas.add(400 + (i / numBaseSamples) * 400);
    }
    
    // Add micro-samples around each resonance peak to guarantee smooth, unclipped peak rendering
    peakLambdas.forEach(pl => {
        sampleLambdas.add(pl);
        const fwhm = (pl / (optCavity2nL / pl)) / (Math.PI * Math.sqrt(F) / 2);
        const delta = Math.max(0.08, Math.min(2.5, fwhm * 0.25));
        for (let step = -4; step <= 4; step++) {
            const extra = pl + step * delta;
            if (extra >= 400 && extra <= 800) sampleLambdas.add(extra);
        }
    });
    
    const sortedLambdas = Array.from(sampleLambdas).sort((a, b) => a - b);
    
    // Compute points
    const points = [];
    sortedLambdas.forEach(lam => {
        const x = padL + ((lam - 400) / 400) * plotW;
        const m = optCavity2nL / lam;
        const sinVal = Math.sin(m * Math.PI);
        const T = 1.0 / (1.0 + F * sinVal * sinVal);
        const y = padT + plotH * (1.0 - T);
        points.push({ x, y, T, lam });
    });
    
    if (points.length > 0) {
        // Draw glow stroke
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 9;
        ctx.stroke();
        
        // Gradient fill under Airy transmission curve
        ctx.shadowBlur = 0;
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.lineTo(padL, padT + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, 'rgba(45, 212, 191, 0.26)');
        grad.addColorStop(1, 'rgba(45, 212, 191, 0.01)');
        ctx.fillStyle = grad;
        ctx.fill();
    }
    
    // Mode tags above each resonance peak (e.g. m=12, m=13)
    peakLambdas.forEach(pl => {
        const px = padL + ((pl - 400) / 400) * plotW;
        const mVal = Math.round(optCavity2nL / pl);
        ctx.save();
        ctx.font = '8.5px "Share Tech Mono", monospace';
        ctx.fillStyle = '#2dd4bf';
        ctx.textAlign = 'center';
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
        ctx.beginPath();
        ctx.moveTo(px, padT);
        ctx.lineTo(px, padT + plotH);
        ctx.stroke();
        ctx.fillText(`m=${mVal}`, px, padT - 4);
        ctx.restore();
    });
    
    // Current Wavelength marker (with laser-matched spectral color aura!)
    const currLambda = resonatorState.wavelength;
    const currX = padL + ((currLambda - 400) / 400) * plotW;
    const currM = optCavity2nL / currLambda;
    const currSin = Math.sin(currM * Math.PI);
    const currT = 1.0 / (1.0 + F * currSin * currSin);
    const currY = padT + plotH * (1.0 - currT);
    const spectralColor = resonatorState.spectralColorCSS || '#2dd4bf';
    
    // Vertical dashed marker line
    ctx.strokeStyle = spectralColor;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currX, padT + plotH);
    ctx.lineTo(currX, padT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Laser marker dot with pulse aura
    ctx.shadowColor = spectralColor;
    ctx.shadowBlur = 14;
    ctx.fillStyle = spectralColor;
    ctx.beginPath();
    ctx.arc(currX, currY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Tooltip chip right next to active marker (clamped to never overflow left or right!)
    const tagText = `${currLambda.toFixed(1)}nm · ${(currT * 100).toFixed(0)}%`;
    ctx.font = '10px "Share Tech Mono", monospace';
    const tagWidth = ctx.measureText(tagText).width + 10;
    let tagX = currX + 8;
    if (tagX + tagWidth > padL + plotW) tagX = currX - tagWidth - 8;
    if (tagX < padL + 2) tagX = padL + 2;
    const tagY = Math.max(padT + 2, Math.min(padT + plotH - 18, currY - 9));
    
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.strokeStyle = isResonant ? '#2dd4bf' : 'rgba(71, 85, 105, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagWidth, 16, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isResonant ? '#2dd4bf' : '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, tagX + 5, tagY + 8);
    
    ctx.restore();
}

let rateEquationHistory = [];
function drawRateEquationGraph(phys) {
    const canvas = document.getElementById('rate-graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width > 20 ? rect.width : (canvas.clientWidth > 20 ? canvas.clientWidth : 310));
    const h = Math.round(rect.height > 10 ? rect.height : (canvas.clientHeight > 10 ? canvas.clientHeight : 56));
    
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
    }
    
    // Store rolling history
    const normN2 = Math.max(0, Math.min(1.0, phys.N2 / (phys.N_total || 100000)));
    const normRate = Math.max(-1.0, Math.min(1.0, phys.dN2_dt / 35000));
    rateEquationHistory.push({ n2: normN2, rate: normRate, inverted: phys.population_inverted });
    if (rateEquationHistory.length > 70) rateEquationHistory.shift();
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);
    
    // Grid baseline
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    
    if (rateEquationHistory.length > 1) {
        const stepX = w / (70 - 1);
        const startIdx = 70 - rateEquationHistory.length;
        
        // 1. Draw N2 Population Area Fill (Pink/Rose to Violet)
        ctx.beginPath();
        ctx.moveTo(startIdx * stepX, h);
        rateEquationHistory.forEach((pt, i) => {
            const x = (startIdx + i) * stepX;
            const y = h - (pt.n2 * (h - 4)) - 2;
            ctx.lineTo(x, y);
        });
        ctx.lineTo(w, h);
        ctx.closePath();
        const n2Grad = ctx.createLinearGradient(0, 0, 0, h);
        n2Grad.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
        n2Grad.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
        ctx.fillStyle = n2Grad;
        ctx.fill();
        
        // N2 Outline
        ctx.beginPath();
        rateEquationHistory.forEach((pt, i) => {
            const x = (startIdx + i) * stepX;
            const y = h - (pt.n2 * (h - 4)) - 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // 2. Draw dN2/dt Rate Oscilloscope Curve (Cyan)
        ctx.beginPath();
        rateEquationHistory.forEach((pt, i) => {
            const x = (startIdx + i) * stepX;
            const y = (h * 0.5) - (pt.rate * (h * 0.42));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
}

function drawFieldOverlay() {
    const canvas = document.getElementById('field-overlay-canvas');
    if (!canvas || !resonatorState.showFieldOverlay) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width > 20 ? rect.width : (canvas.clientWidth > 20 ? canvas.clientWidth : 368));
    const h = Math.round(rect.height > 20 ? rect.height : (canvas.clientHeight > 20 ? canvas.clientHeight : 90));
    
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
    }
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#050b18';
    ctx.fillRect(0, 0, w, h);
    
    const padL = 36;
    const padR = 36;
    const plotW = w - padL - padR;
    const midY = h / 2;
    const ampMax = h * 0.36;
    
    const m = resonatorState.m;
    const t = resonatorState.wavePhaseTime;
    const R = resonatorState.reflectivity;
    const T = resonatorState.transmission;
    
    // Draw mirror boundaries (Left and Right)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(padL, 10);
    ctx.lineTo(padL, h - 10);
    ctx.stroke();
    
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(padL + plotW, 10);
    ctx.lineTo(padL + plotW, h - 10);
    ctx.stroke();
    
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText('M1 (High Refl)', padL, h - 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('M2 (Output)', padL + plotW, h - 2);
    
    // Center reference line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(padL + plotW, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const steps = 250;
    const kL = m * Math.PI; // Phase across cavity
    const delta = 2 * kL;   // Round-trip phase
    
    // 1. Forward Wave (Cyan): E_fwd = E0 * cos(k*x - omega*t)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = padL + u * plotW;
        const phase = u * kL - t;
        const y = midY - (ampMax * 0.45) * Math.cos(phase);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 2. Reflected Wave (Rose): E_refl = sqrt(R) * E0 * cos(-k*x - omega*t - delta)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = padL + u * plotW;
        const phase = -u * kL - t - delta;
        const y = midY - (ampMax * 0.45 * Math.sqrt(R)) * Math.cos(phase);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 3. Net Superposition Standing Wave (Teal / Spectral Color)
    const standingAmp = ampMax * Math.sqrt(Math.max(0.04, T));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = padL + u * plotW;
        const efwd = Math.cos(u * kL - t);
        const erefl = Math.sqrt(R) * Math.cos(-u * kL - t - delta);
        const etot = (efwd + erefl) / (1 + Math.sqrt(R));
        const y = midY - standingAmp * etot;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = resonatorState.spectralColorCSS || '#2dd4bf';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Stationary node markers (E = 0)
    const numNodes = Math.floor(m);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k <= numNodes; k++) {
        const uNode = k / m;
        if (uNode <= 1.0) {
            const xNode = padL + uNode * plotW;
            ctx.beginPath();
            ctx.arc(xNode, midY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Update status badge
    const isRes = Math.abs(m - Math.round(m)) < 0.025;
    const statusEl = document.getElementById('field-overlay-status');
    if (statusEl) {
        if (isRes) {
            statusEl.innerText = "CONSTRUCTIVE INTERFERENCE (RESONANT)";
            statusEl.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50";
        } else {
            statusEl.innerText = "DESTRUCTIVE INTERFERENCE (OFF-RESONANCE)";
            statusEl.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/50";
        }
    }
    
    ctx.restore();
}

// ==========================================
// FULL-SCREEN CAMERA & DUAL-HAND TRACKING
// ==========================================
function populateCameraSelector(devices) {
    const camSelect = document.getElementById('cam-select');
    if (!camSelect || !devices || devices.length === 0) return;
    
    camSelect.innerHTML = '';
    devices.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.text = dev.label || `Camera ${idx + 1}`;
        if (dev.deviceId === currentDeviceId) {
            opt.selected = true;
        }
        camSelect.appendChild(opt);
    });
    
    if (devices.length > 1) {
        camSelect.classList.remove('hidden');
    }
}

async function initFullscreenCamera(preferredId = null) {
    cameraVideoEl = document.getElementById('camera-video');
    const camPrompt = document.getElementById('camera-prompt');
    const camIndicator = document.getElementById('cam-indicator');
    
    if (camIndicator) {
        camIndicator.innerText = "📷 CAM: CONNECTING...";
        camIndicator.className = "text-[11px] px-2 py-0.5 rounded border border-sky-400 text-sky-300 font-mono-hud animate-pulse cursor-pointer";
    }
    
    // Safely cancel any active camera loop and stop running tracks
    if (cameraLoopRafId) {
        cancelAnimationFrame(cameraLoopRafId);
        cameraLoopRafId = null;
    }
    if (videoStream) {
        try {
            videoStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        videoStream = null;
    }
    
    let deviceIdToUse = preferredId;
    
    // Check available devices if previously enumerated
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            populateCameraSelector(videoDevices);
            
            if (!deviceIdToUse && videoDevices.length > 0) {
                const laptopCam = videoDevices.find(d => {
                    const l = (d.label || '').toLowerCase();
                    return (l.includes('integrated') || l.includes('webcam') || l.includes('front') || l.includes('hd') || l.includes('internal'))
                           && !l.includes('phone') && !l.includes('mobile') && !l.includes('virtual');
                });
                if (laptopCam && laptopCam.deviceId) {
                    deviceIdToUse = laptopCam.deviceId;
                }
            }
        }
    } catch (e) {}
    
    let stream = null;
    
    try {
        const constraints = {
            video: deviceIdToUse 
                ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err1) {
        console.warn("Targeted camera constraints failed, attempting fallback...", err1);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err2) {
            console.error("Camera acquisition failed:", err2);
            fetch('/api/log', { method: 'POST', body: 'CAMERA_ACQUISITION_FAILED: ' + (err2.name + ': ' + err2.message) }).catch(() => {});
            if (camPrompt) camPrompt.classList.remove('hidden');
            if (camIndicator) {
                camIndicator.innerText = "📷 CAM: OFFLINE";
                camIndicator.className = "text-[11px] px-2 py-0.5 rounded border border-rose-500/60 text-rose-400 font-mono-hud cursor-pointer";
            }
            return;
        }
    }
    
    videoStream = stream;
    const activeTrack = stream.getVideoTracks()[0];
    if (activeTrack && activeTrack.getSettings) {
        currentDeviceId = activeTrack.getSettings().deviceId;
    }
    fetch('/api/log', { method: 'POST', body: 'CAMERA_ACQUISITION_SUCCESS: ' + (activeTrack ? (activeTrack.label || 'active_track') : 'ok') }).catch(() => {});
    
    if (cameraVideoEl) {
        cameraVideoEl.srcObject = videoStream;
        cameraVideoEl.onloadedmetadata = () => {
            cameraVideoEl.play().catch(e => console.warn("Video play error:", e));
        };
        try {
            await cameraVideoEl.play();
        } catch (e) {}
    }
    
    isCameraActive = true;
    if (camPrompt) camPrompt.classList.add('hidden');
    if (camIndicator) {
        camIndicator.innerText = "📷 CAM: LIVE";
        camIndicator.className = "text-[11px] px-2 py-0.5 rounded border border-emerald-400 text-emerald-400 font-mono-hud cursor-pointer";
    }
    
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            populateCameraSelector(devices.filter(d => d.kind === 'videoinput'));
        }
    } catch (e) {}
    
    setupMediaPipe();
    processCameraLoop();
}

let lastVideoFrameTime = -1;

function setupMediaPipe() {
    if (!window.Hands) {
        console.warn("MediaPipe Hands not yet loaded, waiting 200ms...");
        setTimeout(setupMediaPipe, 200);
        return;
    }
    if (handsDetector) return;
    
    try {
        fetch('/api/log', { method: 'POST', body: 'SETUP_MEDIAPIPE_STARTING' }).catch(() => {});
        handsDetector = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        handsDetector.setOptions({
            maxNumHands: 2,
            modelComplexity: 1, // Full Model (far superior in backlit/window conditions)
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45
        });
        
        handsDetector.onResults(onHandResults);
        fetch('/api/log', { method: 'POST', body: 'SETUP_MEDIAPIPE_READY' }).catch(() => {});
        console.log("MediaPipe Hands initialized in bulletproof real-time mode.");
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'SETUP_MEDIAPIPE_ERROR: ' + e.message }).catch(() => {});
        console.error("Error setting up MediaPipe Hands:", e);
    }
}

let isProcessingFrame = false;
let lastFrameSentTime = 0;

async function processCameraLoop() {
    if (!isCameraActive || !cameraVideoEl) return;
    
    const now = performance.now();
    
    // Safety Watchdog: unblock if frame processing hangs for over 4 seconds
    if (isProcessingFrame && (now - lastFrameSentTime > 4000)) {
        console.warn("[MediaPipe Watchdog] Frame processing hung (>4s). Resetting lock.");
        isProcessingFrame = false;
    }
    
    // Send next frame only when detector is ready, video is playing, and a NEW frame has arrived!
    if (!isProcessingFrame && cameraVideoEl.readyState >= 2 && handsDetector && !cameraVideoEl.paused) {
        if (cameraVideoEl.currentTime !== lastVideoFrameTime) {
            lastVideoFrameTime = cameraVideoEl.currentTime;
            isProcessingFrame = true;
            lastFrameSentTime = now;
            try {
                await handsDetector.send({ image: cameraVideoEl });
            } catch (err) {
                console.warn("[CameraLoop send error]:", err);
            } finally {
                isProcessingFrame = false;
            }
        }
    }
    
    cameraLoopRafId = requestAnimationFrame(processCameraLoop);
}

function isValidHandLandmarks(lm) {
    return Array.isArray(lm) && lm.length >= 21 &&
           lm[0] && typeof lm[0].x === 'number' && !isNaN(lm[0].x) &&
           lm[9] && typeof lm[9].x === 'number' && !isNaN(lm[9].x) &&
           lm[4] && typeof lm[4].x === 'number' && !isNaN(lm[4].x) &&
           lm[8] && typeof lm[8].x === 'number' && !isNaN(lm[8].x) &&
           lm[20] && typeof lm[20].x === 'number' && !isNaN(lm[20].x);
}

function showNotification(msg) {
    let toast = document.getElementById('hud-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'hud-toast';
        toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 hud-panel px-6 py-2.5 border-amber-400 bg-slate-950/95 text-amber-300 font-mono-hud text-xs font-bold tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-opacity duration-300 pointer-events-none text-center';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2400);
}

let rightHandPose = null;
let rightHandHistory = [];
let isBlastArmed = true;
let isRepulsorFiringEnabled = false; // MASTER SAFETY INTERLOCK (DEFAULT OFF: ENABLE / DISABLE REPULSOR FIRING)
let lastBlastTime = 0;
let lastBlastStatusTime = 0;
let lastRotationTime = 0;
let lastFacingDirection = 0; // -1 for front palm, +1 for back dorsal, 0 for edge-on

function getScreenCoords(landmark) {
    let nx = 1.0 - landmark.x;
    let ny = landmark.y;
    if (cameraVideoEl && cameraVideoEl.videoWidth > 0 && cameraVideoEl.videoHeight > 0) {
        const videoAspect = cameraVideoEl.videoWidth / cameraVideoEl.videoHeight;
        const screenAspect = window.innerWidth / window.innerHeight;
        if (screenAspect > videoAspect) {
            const scale = screenAspect / videoAspect;
            ny = (ny - 0.5) * scale + 0.5;
        } else if (screenAspect < videoAspect) {
            const scale = videoAspect / screenAspect;
            nx = (nx - 0.5) * scale + 0.5;
        }
    }
    return {
        x: Math.max(0, Math.min(1.0, nx)),
        y: Math.max(0, Math.min(1.0, ny)),
        z: landmark.z || 0
    };
}

let smoothedRightLandmarks = null;
let smoothedRightQuat = null;

function computeRightHand3DPose(rawLandmarks) {
    const dist = 11.5;
    const fovRad = (52 * Math.PI) / 360;
    const halfH = dist * Math.tan(fovRad);
    const aspect = window.innerWidth / window.innerHeight;
    const halfW = halfH * aspect;
    
    // Multi-Band Adaptive EMA Temporal Filter (suppresses camera sensor noise & micro-jitter)
    if (!smoothedRightLandmarks) {
        smoothedRightLandmarks = rawLandmarks.map(l => ({ x: l.x, y: l.y, z: l.z || 0 }));
    } else {
        for (let i = 0; i < 21; i++) {
            const dx = rawLandmarks[i].x - smoothedRightLandmarks[i].x;
            const dy = rawLandmarks[i].y - smoothedRightLandmarks[i].y;
            const dz = (rawLandmarks[i].z || 0) - smoothedRightLandmarks[i].z;
            const mDist = Math.hypot(dx, dy, dz);
            // Ultra-stable multi-band damping:
            // Stationary hand (<0.006): heavy damping (0.28) locks armor still, killing sensor flicker
            // Normal gesture (0.006-0.025): smooth responsive tracking (0.52)
            // Rapid sweep (>0.025): rapid lock-on (0.78)
            const alpha = mDist > 0.025 ? 0.78 : (mDist > 0.006 ? 0.52 : 0.28);
            smoothedRightLandmarks[i].x += dx * alpha;
            smoothedRightLandmarks[i].y += dy * alpha;
            smoothedRightLandmarks[i].z += dz * alpha;
        }
    }
    const landmarks = smoothedRightLandmarks;
    
    // Project landmark into 3D camera world units with true continuous anatomical depth
    function toWorld3D(lm) {
        const sc = getScreenCoords(lm);
        const wx = (sc.x - 0.5) * 2.0 * halfW;
        const wy = (0.5 - sc.y) * 2.0 * halfH;
        // In MediaPipe Hands, landmark.z has roughly the same scale as landmark.x.
        // Negate lm.z so closer to camera is +Z (camera is at +Z looking down -Z).
        const wz = -(lm.z || 0) * 2.0 * halfW * 1.25;
        return new THREE.Vector3(wx, wy, wz);
    }
    
    const pWrist = toWorld3D(landmarks[0]);
    const pIndexMcp = toWorld3D(landmarks[5]);
    const pMiddleMcp = toWorld3D(landmarks[9]);
    const pRingMcp = toWorld3D(landmarks[13]);
    const pPinkyMcp = toWorld3D(landmarks[17]);
    
    // Exact Anatomical Palm Center in 3D:
    const palmCenter = new THREE.Vector3(
        (pWrist.x + pMiddleMcp.x) * 0.50,
        (pWrist.y + pMiddleMcp.y) * 0.50,
        (pWrist.z + pMiddleMcp.z) * 0.50
    );
    
    // Hand Dimensions in World Units
    const realPalmLen = pWrist.distanceTo(pMiddleMcp);
    const realKnuckleWidth = pIndexMcp.distanceTo(pPinkyMcp);
    
    const scaleX = Math.max(0.85, Math.min(3.2, (realKnuckleWidth / 1.08) * 1.35));
    const scaleY = Math.max(0.85, Math.min(3.2, (realPalmLen / 1.38) * 1.32));
    const scaleZ = (scaleX + scaleY) * 0.52;
    
    // Complete 360-Degree Continuous 3D Anatomical Basis:
    // 1. Up vector: along the hand from wrist to knuckles center (+Y in local gauntlet space)
    const pKnuckles = new THREE.Vector3().addVectors(pIndexMcp, pPinkyMcp).multiplyScalar(0.5);
    const vUp = new THREE.Vector3().subVectors(pKnuckles, pWrist).normalize();
    
    // 2. Across vector: across palm from Index MCP to Pinky MCP
    // In mirrored view: points toward +X when palm faces camera; points toward -X when back of hand faces camera
    const vAcross = new THREE.Vector3().subVectors(pPinkyMcp, pIndexMcp).normalize();
    
    // 3. Normal vector: out of palm (+Z when palm faces camera, -Z when back of hand faces camera)
    const vNormal = new THREE.Vector3().crossVectors(vAcross, vUp).normalize();
    
    // 4. Construct orthonormal 3D basis (vX, vY, vZ)
    const vY = vUp.clone();
    const vZ = vNormal.clone().sub(vY.clone().multiplyScalar(vNormal.dot(vY))).normalize();
    const vX = new THREE.Vector3().crossVectors(vY, vZ).normalize();
    
    const basisMatrix = new THREE.Matrix4().makeBasis(vX, vY, vZ);
    const rawQuat = new THREE.Quaternion().setFromRotationMatrix(basisMatrix);
    if (!smoothedRightQuat) {
        smoothedRightQuat = rawQuat.clone();
    } else {
        // Enforce shortest-arc quaternion alignment to avoid sudden 180° antipode flips
        if (smoothedRightQuat.dot(rawQuat) < 0) {
            rawQuat.set(-rawQuat.x, -rawQuat.y, -rawQuat.z, -rawQuat.w);
        }
        smoothedRightQuat.slerp(rawQuat, 0.58);
    }
    const handQuat = smoothedRightQuat.clone();
    const invHandQuat = handQuat.clone().invert();
    
    // Transform any world position into local gauntlet space:
    function toLocal(pWorld) {
        const rel = pWorld.clone().sub(palmCenter);
        rel.applyQuaternion(invHandQuat);
        rel.x /= scaleX;
        rel.y /= scaleY;
        rel.z /= scaleZ;
        return rel;
    }
    
    // 4 Knuckles (Landmarks 5, 9, 13, 17) in local gauntlet space
    const localKnuckles = [
        toLocal(pIndexMcp),
        toLocal(pMiddleMcp),
        toLocal(pRingMcp),
        toLocal(pPinkyMcp)
    ];
    
    // Fingertips (Landmarks 8, 12, 16, 20) in local gauntlet space
    const localTips = [
        toLocal(toWorld3D(landmarks[8])),
        toLocal(toWorld3D(landmarks[12])),
        toLocal(toWorld3D(landmarks[16])),
        toLocal(toWorld3D(landmarks[20]))
    ];
    
    const localPips = [
        toLocal(toWorld3D(landmarks[6])),
        toLocal(toWorld3D(landmarks[10])),
        toLocal(toWorld3D(landmarks[14])),
        toLocal(toWorld3D(landmarks[18]))
    ];
    
    const fingerTracking = [];
    const fingerSpecs = [
        { mcp: 5, pip: 6, dip: 7, tip: 8, baseLen: 1.52, baseX: -0.54, baseY: 0.74 },
        { mcp: 9, pip: 10, dip: 11, tip: 12, baseLen: 1.70, baseX: -0.18, baseY: 0.80 },
        { mcp: 13, pip: 14, dip: 15, tip: 16, baseLen: 1.54, baseX: 0.18, baseY: 0.76 },
        { mcp: 17, pip: 18, dip: 19, tip: 20, baseLen: 1.36, baseX: 0.54, baseY: 0.66 }
    ];
    
    fingerSpecs.forEach((spec, idx) => {
        const pMcp = toWorld3D(landmarks[spec.mcp]);
        const pPip = toWorld3D(landmarks[spec.pip]);
        const pDip = toWorld3D(landmarks[spec.dip]);
        const pTip = toWorld3D(landmarks[spec.tip]);
        
        // Full joint path distance vs direct Euclidean distance = anatomical curl ratio
        const fullJointLen = pMcp.distanceTo(pPip) + pPip.distanceTo(pDip) + pDip.distanceTo(pTip);
        const curLen = pMcp.distanceTo(pTip);
        const extRatio = curLen / Math.max(0.01, fullJointLen);
        const curlRatio = Math.max(0, Math.min(1.0, (0.92 - extRatio) / 0.45));
        
        // Compute direction vector in local canonical space
        const localKnuckle = localKnuckles[idx];
        const localTip = localTips[idx];
        const vX = localTip.x - localKnuckle.x;
        const vY = localTip.y - localKnuckle.y;
        
        // Natural splay angle aligned with user's actual fingers:
        const splayZ = Math.max(-0.65, Math.min(0.65, Math.atan2(-vX, Math.max(0.01, vY))));
        const actualLen = Math.hypot(vX, vY);
        const stretchY = Math.max(0.75, Math.min(1.65, actualLen / spec.baseLen));
        
        fingerTracking.push({
            curl: curlRatio,
            splayZ: splayZ,
            stretchY: stretchY,
            actualLen: actualLen
        });
    });
    
    // Thumb Tracking (Landmarks 2=MCP, 3=IP, 4=Tip)
    const pThumbMcp = toWorld3D(landmarks[2]);
    const pThumbIp = toWorld3D(landmarks[3]);
    const pThumbTip = toWorld3D(landmarks[4]);
    
    const localThumbMcp = toLocal(pThumbMcp);
    const localThumbTip = toLocal(pThumbTip);
    const vThumbX = localThumbTip.x - localThumbMcp.x;
    const vThumbY = localThumbTip.y - localThumbMcp.y;
    const thumbSplayZ = Math.max(0.10, Math.min(0.85, Math.atan2(-vThumbX, Math.max(0.01, vThumbY))));
    const thumbFullLen = pThumbMcp.distanceTo(pThumbIp) + pThumbIp.distanceTo(pThumbTip);
    const thumbCurLen = pThumbMcp.distanceTo(pThumbTip);
    const thumbExt = thumbCurLen / Math.max(0.01, thumbFullLen);
    const thumbCurl = Math.max(0, Math.min(1.0, (0.90 - thumbExt) / 0.45));
    const thumbStretch = Math.max(0.80, Math.min(1.55, Math.hypot(vThumbX, vThumbY) / 1.15));
    
    const thumbTracking = {
        splayZ: thumbSplayZ,
        curl: thumbCurl,
        stretchY: thumbStretch
    };
    
    return {
        x: palmCenter.x,
        y: palmCenter.y,
        z: palmCenter.z,
        quaternion: handQuat,
        vNormal: vNormal,
        scale: (scaleX + scaleY) * 0.5,
        scaleX: scaleX,
        scaleY: scaleY,
        scaleZ: scaleZ,
        palmSpan: realPalmLen / 11.218,
        localKnuckles: localKnuckles,
        localTips: localTips,
        localPips: localPips,
        localThumbMcp: localThumbMcp,
        localThumbTip: localThumbTip,
        fingerTracking: fingerTracking,
        thumbTracking: thumbTracking
    };
}

function getPalmOrientation(landmarks) {
    const w = landmarks[0];
    const indexK = landmarks[5];
    const pinkyK = landmarks[17];
    const middleK = landmarks[9];
    
    // Vector across palm (pinky to index)
    const ux = indexK.x - pinkyK.x;
    const uy = indexK.y - pinkyK.y;
    const uz = (indexK.z || 0) - (pinkyK.z || 0);
    
    // Vector along palm (wrist to middle knuckle)
    const vx = middleK.x - w.x;
    const vy = middleK.y - w.y;
    const vz = (middleK.z || 0) - (w.z || 0);
    
    // Cross product U x V = Palm Normal
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    
    const len = Math.hypot(nx, ny, nz) || 1e-6;
    // In raw MediaPipe image coordinates (unmirrored X, down is +Y):
    // FRONT PALM facing camera: ux > 0, vy < 0 => nz / len is NEGATIVE (approx -0.7 to -1.0)
    // DORSAL BACK facing camera (palm facing user's face): ux < 0, vy < 0 => nz / len is POSITIVE (approx +0.7 to +1.0)
    // SIDE PROFILE / EDGE-ON: nz / len is near 0 (-0.35 to +0.35)
    const facingScore = nz / len;
    
    const isFrontPalm = facingScore < -0.38;
    const isBackDorsal = facingScore > 0.38;
    const isFacingCamera = isFrontPalm || isBackDorsal;
    const isEdgeOn = Math.abs(facingScore) < 0.35;
    
    return {
        facingScore,
        isFacingCamera,
        isFrontPalm,
        isBackDorsal,
        isEdgeOn
    };
}

// 2. Mathematically strict Rotation-Invariant Palm Scale
// Using isotropic normalized coordinates and radial centroid distance + shoelace polygon area
function getRotationInvariantPalmMetrics(landmarks) {
    const videoAspect = (cameraVideoEl && cameraVideoEl.videoWidth > 0 && cameraVideoEl.videoHeight > 0)
        ? (cameraVideoEl.videoWidth / cameraVideoEl.videoHeight)
        : (window.innerWidth / window.innerHeight);
    
    const w = landmarks[0];
    const i = landmarks[5];
    const m = landmarks[9];
    const p = landmarks[17];
    
    // Convert to isotropic coordinates where 1 unit on X equals 1 unit on Y
    const wx = w.x * videoAspect, wy = w.y;
    const ix = i.x * videoAspect, iy = i.y;
    const mx = m.x * videoAspect, my = m.y;
    const px = p.x * videoAspect, py = p.y;
    
    // Palm centroid
    const cx = (wx + ix + mx + px) * 0.25;
    const cy = (wy + iy + my + py) * 0.25;
    
    // Invariant radial distances from centroid to palm corners
    const distW = Math.hypot(wx - cx, wy - cy);
    const distI = Math.hypot(ix - cx, iy - cy);
    const distM = Math.hypot(mx - cx, my - cy);
    const distP = Math.hypot(px - cx, py - cy);
    const avgRadius = (distW + distI + distM + distP) * 0.25;
    
    // Invariant polygon area of the rigid palm quadrilateral
    const area = 0.5 * Math.abs(
        (wx * iy - ix * wy) +
        (ix * my - mx * iy) +
        (mx * py - px * my) +
        (px * wy - wx * py)
    );
    const areaScale = Math.sqrt(Math.max(0, area));
    
    return {
        scale: (avgRadius * 0.6 + areaScale * 0.4),
        cx: cx / videoAspect,
        cy: cy
    };
}

function checkRightPalmBlast(landmarks) {
    // MASTER SAFETY INTERLOCK: ABSOLUTELY CANNOT FIRE IF DISABLED
    if (!isRepulsorFiringEnabled) {
        return;
    }
    const now = performance.now();
    
    const orientation = getPalmOrientation(landmarks);
    const metrics = getRotationInvariantPalmMetrics(landmarks);
    
    // Track rotation / flipping to STRICTLY block firing during wrist turning
    const currentDir = orientation.isFrontPalm ? -1 : (orientation.isBackDorsal ? 1 : 0);
    if (orientation.isEdgeOn || currentDir === 0 || (lastFacingDirection !== 0 && currentDir !== lastFacingDirection)) {
        lastRotationTime = now;
    }
    lastFacingDirection = currentDir;
    
    // Check open stance (ensures hand is not clenched into a tight fist)
    const wrist = landmarks[0];
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
    let extendedCount = 0;
    for (const [tip, pip] of fingers) {
        const dTip = Math.hypot(landmarks[tip].x - wrist.x, landmarks[tip].y - wrist.y);
        const dPip = Math.hypot(landmarks[pip].x - wrist.x, landmarks[pip].y - wrist.y);
        if (dTip > dPip * 1.02) extendedCount++;
    }
    const splay = Math.hypot(landmarks[4].x - landmarks[20].x, landmarks[4].y - landmarks[20].y);
    const isOpenStance = (extendedCount >= 2 || splay > 0.09);
    
    // Maintain rolling history buffer (last 450ms)
    rightHandHistory.push({
        time: now,
        scale: metrics.scale,
        cx: metrics.cx,
        cy: metrics.cy,
        facingScore: orientation.facingScore,
        isFrontPalm: orientation.isFrontPalm,
        isBackDorsal: orientation.isBackDorsal,
        isEdgeOn: orientation.isEdgeOn
    });
    while (rightHandHistory.length > 0 && (now - rightHandHistory[0].time > 450)) {
        rightHandHistory.shift();
    }
    
    // Require at least 140ms of stable tracking history before evaluating motion
    if (rightHandHistory.length < 5 || (now - rightHandHistory[0].time < 140)) {
        return;
    }
    
    // CRITICAL: Block blast if hand was rotating or passing through edge-on within the last 350ms!
    if (now - lastRotationTime < 350) {
        return;
    }
    
    // Reference pre-thrust samples from 120ms to 380ms ago
    const preSamples = rightHandHistory.filter(h => (now - h.time >= 120) && (now - h.time <= 380));
    if (preSamples.length < 3) {
        return;
    }
    
    // Verify that the hand was consistently in the SAME orientation throughout preSamples
    let isConsistentFacing = false;
    if (orientation.isFrontPalm) {
        const nonFrontCount = preSamples.filter(s => !s.isFrontPalm || s.isEdgeOn).length;
        isConsistentFacing = (nonFrontCount === 0);
    } else if (orientation.isBackDorsal) {
        const nonBackCount = preSamples.filter(s => !s.isBackDorsal || s.isEdgeOn).length;
        isConsistentFacing = (nonBackCount === 0);
    }
    
    if (!isConsistentFacing) {
        return;
    }
    
    const minPreScale = Math.min(...preSamples.map(s => s.scale));
    const maxPreScale = Math.max(...preSamples.map(s => s.scale));
    const avgPreScale = preSamples.reduce((sum, s) => sum + s.scale, 0) / preSamples.length;
    
    const preCx = preSamples.reduce((sum, s) => sum + s.cx, 0) / preSamples.length;
    const preCy = preSamples.reduce((sum, s) => sum + s.cy, 0) / preSamples.length;
    const centerDrift = Math.hypot(metrics.cx - preCx, metrics.cy - preCy);
    
    // Forward push expansion ratio (scale grew towards camera)
    const expansionRatio = (metrics.scale - minPreScale) / Math.max(0.04, minPreScale);
    // Backward push contraction ratio (scale shrank away from camera / toward face)
    const contractionRatio = (maxPreScale - metrics.scale) / Math.max(0.04, maxPreScale);
    
    let isPushing = false;
    
    if (orientation.isFrontPalm) {
        // FRONT PALM PUSH: Pushed forward towards camera
        isPushing = (
            expansionRatio >= 0.14 &&
            centerDrift < 0.18 &&
            isOpenStance
        );
    } else if (orientation.isBackDorsal) {
        // PALM TOWARDS FACE: Pushed back towards user's face (scale contracts) OR pushed forward (scale expands)
        isPushing = (
            (contractionRatio >= 0.12 || expansionRatio >= 0.14) &&
            centerDrift < 0.18 &&
            isOpenStance
        );
    }
    
    // Re-arming state machine:
    if (!isBlastArmed) {
        const cooldownElapsed = now - lastBlastTime;
        // Re-arm when hand settles or pulls back slightly
        if (cooldownElapsed > 700 && expansionRatio <= 0.08 && contractionRatio <= 0.08) {
            isBlastArmed = true;
        } else if (cooldownElapsed > 1500) {
            isBlastArmed = true; // Fallback timer
        }
    }
    
    // TRIGGER REPULSOR BLAST (PURE REPULSOR, ALWAYS FROM REPULSOR!):
    if (isBlastArmed && isPushing && (now - lastBlastTime > 850)) {
        isBlastArmed = false;
        lastBlastTime = now;
        lastBlastStatusTime = now;
        
        triggerBlastEffect();
        
        const statusRight = document.getElementById('status-right-hand');
        if (statusRight) {
            statusRight.innerText = "REPULSOR BLAST! 💥";
            statusRight.className = "text-xs font-hud font-bold text-cyan-300 animate-pulse";
        }
        const badgeLaserText = document.getElementById('badge-laser-text');
        if (badgeLaserText) {
            badgeLaserText.innerText = "REPULSOR FIRED ⚡";
            badgeLaserText.className = "text-xs font-hud font-bold text-cyan-300";
        }
    } else if (now - lastBlastStatusTime > 1200) {
        // Return HUD status to normal wearing state
        const statusRight = document.getElementById('status-right-hand');
        if (statusRight && isRightHandPresent) {
            if (!isRepulsorFiringEnabled) {
                statusRight.innerText = "WEARING (BLAST DISABLED) 🔒";
                statusRight.className = "text-xs font-hud font-bold text-slate-400";
            } else {
                statusRight.innerText = isBlastArmed ? "GAUNTLET ATTACHED 🦾" : "RECHARGING... ⚡";
                statusRight.className = isBlastArmed ? "text-xs font-hud font-bold text-emerald-400" : "text-xs font-hud font-bold text-amber-400";
            }
        }
        const badgeLaserText = document.getElementById('badge-laser-text');
        if (badgeLaserText && currentState === 'gauntlet') {
            if (!isRepulsorFiringEnabled) {
                badgeLaserText.innerText = "SAFETY LOCKED (DISABLED)";
                badgeLaserText.className = "text-xs font-hud font-bold text-rose-400 animate-pulse";
            } else {
                badgeLaserText.innerText = isBlastArmed ? "ARMED (PUSH PALM / BACK)" : "RECHARGING... ⚡";
                badgeLaserText.className = isBlastArmed ? "text-xs font-hud font-bold text-sky-400" : "text-xs font-hud font-bold text-amber-400";
            }
        }
    }
}

// MULTI-SIGNAL ANATOMICAL HAND DISCRIMINATOR:
// Works in mirrored selfie video regardless of whether hands cross, are close, or where on screen they are!
function isAnatomicalRightHand(landmarks, handednessLabel, screenX) {
    let score = 0;
    
    // 1. MediaPipe Front-Facing Selfie Camera Handedness:
    // When viewing a mirrored webcam, MediaPipe outputs 'Left' for the user's physical right hand,
    // and 'Right' for the user's physical left hand (due to 3rd-person observer frame of reference).
    if (handednessLabel === 'Left') score += 3.5;
    else if (handednessLabel === 'Right') score -= 3.5;
    
    // 2. Mirrored Screen Position (screenX = 1 - wrist.x):
    // Right side of screen (screenX > 0.50) corresponds to user's right hand.
    // Left side of screen (screenX < 0.50) corresponds to user's left hand.
    if (typeof screenX === 'number') {
        if (screenX > 0.52) score += 3.0;
        else if (screenX < 0.48) score -= 3.0;
    }
    
    // 3. Anatomical Thumb Position in Mirrored Coordinates:
    const wx9 = 1.0 - landmarks[9].x; // Middle MCP
    const wx4 = 1.0 - landmarks[4].x; // Thumb Tip
    const orientation = getPalmOrientation(landmarks);
    
    if (orientation.isFrontPalm) {
        // Front palm facing camera: Right hand thumb is on the inner/left side of palm (wx4 < wx9)
        if (wx4 < wx9) score += 2.0;
        else score -= 2.0;
    } else if (orientation.isBackDorsal) {
        // Back dorsal facing camera: Right hand thumb is on the outer/right side of palm (wx4 > wx9)
        if (wx4 > wx9) score += 2.0;
        else score -= 2.0;
    }
    
    return score > 0;
}

// MODE-LINKED HAND TRACKING:
let lastHandsLogTime = 0;
function onHandResults(results) {
    const now = performance.now();
    const count = (results && results.multiHandLandmarks) ? results.multiHandLandmarks.length : 0;
    if (now - lastHandsLogTime > 2500) {
        lastHandsLogTime = now;
        fetch('/api/log', { method: 'POST', body: 'MEDIAPIPE_HANDS_DETECTED: ' + count }).catch(() => {});
    }
    try {
        handleHandResultsInternal(results);
    } catch (err) {
        console.error("[onHandResults Uncaught Error]:", err);
        fetch('/api/log', { method: 'POST', body: 'ON_HAND_RESULTS_ERROR: ' + err.message + ' | ' + err.stack }).catch(() => {});
    }
}

function handleHandResultsInternal(results) {
    const statusLeftEl = document.getElementById('status-left-hand');
    const statusRightEl = document.getElementById('status-right-hand');
    const panelLeftEl = document.getElementById('panel-left-hand');
    const panelRightEl = document.getElementById('panel-right-hand');
    const now = performance.now();
    
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        if (now - lastLeftHandSeenTime > 1200) {
            isLeftHandPresent = false;
            if (arCursorEl) arCursorEl.style.display = 'none';
            clearHoverState();
            dwellTarget = null;
            if (statusLeftEl) {
                statusLeftEl.innerText = "SEARCHING...";
                statusLeftEl.className = "text-xs font-hud font-bold text-amber-400";
            }
        }
        if (now - lastRightHandSeenTime > 1200) {
            isRightHandPresent = false;
            rightHandPose = null;
            smoothedRightLandmarks = null;
            smoothedRightQuat = null;
            if (statusRightEl) {
                statusRightEl.innerText = "SEARCHING...";
                statusRightEl.className = "text-xs font-hud font-bold text-slate-400";
            }
        }
        return;
    }
    
    // Filter and collect valid hands
    const validHands = [];
    results.multiHandLandmarks.forEach((landmarks, index) => {
        if (isValidHandLandmarks(landmarks)) {
            const wrist = landmarks[0];
            const screenX = 1.0 - wrist.x;
            let handednessLabel = null;
            let handednessScore = 0;
            if (results.multiHandedness && results.multiHandedness[index]) {
                handednessLabel = results.multiHandedness[index].label;
                handednessScore = results.multiHandedness[index].score || 0;
            }
            validHands.push({ landmarks, screenX, index, handednessLabel, handednessScore });
        }
    });
    
    if (validHands.length === 0) return;
    
    // Classify each valid hand using multi-signal anatomical geometry
    validHands.forEach(hand => {
        let isRight = isAnatomicalRightHand(hand.landmarks, hand.handednessLabel, hand.screenX);
        if (isHandsSwapped) isRight = !isRight;
        hand.isRightHand = isRight;
    });
    
    let leftHandData = null;
    let rightHandData = null;
    
    if (currentState === 'resonator') {
        // RESONATOR MODE: No 3D gauntlet rendered.
        // Pure black background hides physical hands/fingers from camera feed.
        // Virtual holographic pointer (#ar-cursor) is driven by whichever hand is pointing/pinching.
        let activePointerHand = null;
        let activePointerType = 'LEFT';
        
        if (validHands.length >= 2) {
            const rHand = validHands.find(h => h.isRightHand);
            const lHand = validHands.find(h => !h.isRightHand);
            if (rHand && lHand) {
                rightHandData = rHand;
                leftHandData = lHand;
            } else {
                validHands.sort((a, b) => b.screenX - a.screenX);
                rightHandData = validHands[0];
                leftHandData = validHands[1];
            }
            
            // Check pinch state on both hands to prioritize whichever hand is pinching
            const rTip = rightHandData.landmarks[8];
            const rThumb = rightHandData.landmarks[4];
            const rPinch = Math.hypot(rTip.x - rThumb.x, rTip.y - rThumb.y);
            
            const lTip = leftHandData.landmarks[8];
            const lThumb = leftHandData.landmarks[4];
            const lPinch = Math.hypot(lTip.x - lThumb.x, lTip.y - lThumb.y);
            
            if (rPinch < 0.10 && lPinch >= 0.10) {
                activePointerHand = rightHandData;
                activePointerType = 'RIGHT';
            } else if (lPinch < 0.10 && rPinch >= 0.10) {
                activePointerHand = leftHandData;
                activePointerType = 'LEFT';
            } else {
                activePointerHand = (leftHandData.landmarks[8].y < rightHandData.landmarks[8].y) ? leftHandData : rightHandData;
                activePointerType = (activePointerHand === rightHandData) ? 'RIGHT' : 'LEFT';
            }
        } else {
            const singleHand = validHands[0];
            activePointerHand = singleHand;
            activePointerType = singleHand.isRightHand ? 'RIGHT' : 'LEFT';
            if (singleHand.isRightHand) {
                rightHandData = singleHand;
                leftHandData = null;
            } else {
                leftHandData = singleHand;
                rightHandData = null;
            }
        }
        
        // Update presence states & top HUD panels
        if (leftHandData) {
            lastLeftHandSeenTime = now;
            isLeftHandPresent = true;
            if (panelLeftEl) {
                panelLeftEl.classList.remove('opacity-30');
                panelLeftEl.classList.add('opacity-100');
            }
            if (statusLeftEl && activePointerHand !== leftHandData) {
                statusLeftEl.innerText = "STANDBY 🎯";
                statusLeftEl.className = "text-xs font-hud font-bold text-sky-300";
            }
        } else if (now - lastLeftHandSeenTime > 1200) {
            isLeftHandPresent = false;
            if (statusLeftEl) {
                statusLeftEl.innerText = "READY (RAISE FINGER)";
                statusLeftEl.className = "text-xs font-hud font-bold text-slate-400";
            }
        }
        
        if (rightHandData) {
            lastRightHandSeenTime = now;
            isRightHandPresent = true;
            if (panelRightEl) {
                panelRightEl.classList.remove('opacity-30');
                panelRightEl.classList.add('opacity-100');
            }
            if (statusRightEl && activePointerHand !== rightHandData) {
                statusRightEl.innerText = "STANDBY 🎯";
                statusRightEl.className = "text-xs font-hud font-bold text-sky-300";
            }
        } else if (now - lastRightHandSeenTime > 1200) {
            isRightHandPresent = false;
            if (statusRightEl) {
                statusRightEl.innerText = "READY (RAISE FINGER)";
                statusRightEl.className = "text-xs font-hud font-bold text-slate-400";
            }
        }
        
        // Process virtual pointer for resonator mode
        if (activePointerHand) {
            processPointerWithHand(activePointerHand.landmarks, activePointerType);
        } else if (!isLeftHandPresent && !isRightHandPresent) {
            if (arCursorEl) arCursorEl.style.display = 'none';
            clearHoverState();
            dwellTarget = null;
        }
    } else {
        // GAUNTLET MODE:
        if (isExplodedView) {
            // ========================================================
            // DISASSEMBLED / EXPLODED GAUNTLET SCHEMATIC VIEW:
            // The armour is detached & disassembled into a 5-stage blueprint schematic.
            // Neither hand is wearing the gauntlet.
            // Holographic pointer (#ar-cursor) is fully active and driven by whichever hand is pointing/pinching!
            // ========================================================
            let activePointerHand = null;
            let activePointerType = 'LEFT';
            
            if (validHands.length >= 2) {
                const rHand = validHands.find(h => h.isRightHand);
                const lHand = validHands.find(h => !h.isRightHand);
                if (rHand && lHand) {
                    rightHandData = rHand;
                    leftHandData = lHand;
                } else {
                    validHands.sort((a, b) => b.screenX - a.screenX);
                    rightHandData = validHands[0];
                    leftHandData = validHands[1];
                }
                
                // Prioritize whichever hand is pinching or pointing higher with hysteresis
                const rTip = rightHandData.landmarks[8];
                const rThumb = rightHandData.landmarks[4];
                const rPinch = Math.hypot(rTip.x - rThumb.x, rTip.y - rThumb.y);
                
                const lTip = leftHandData.landmarks[8];
                const lThumb = leftHandData.landmarks[4];
                const lPinch = Math.hypot(lTip.x - lThumb.x, lTip.y - lThumb.y);
                
                const isRPinching = rPinch < 0.088;
                const isLPinching = lPinch < 0.088;
                
                let chosenType = currentExplodedHandType;
                
                if (isRPinching && !isLPinching) {
                    chosenType = 'RIGHT';
                } else if (isLPinching && !isRPinching) {
                    chosenType = 'LEFT';
                } else if (!chosenType || !['RIGHT', 'LEFT'].includes(chosenType)) {
                    // Default initial assignment when neither is pinching: whichever hand index finger is higher (lower Y)
                    chosenType = (leftHandData.landmarks[8].y < rightHandData.landmarks[8].y) ? 'LEFT' : 'RIGHT';
                } else {
                    // Sticky hysteresis: Only switch hands if the other hand is SIGNIFICANTLY higher (at least 0.14 normalized screen delta Y)
                    // and at least 400ms has elapsed since the last switch to eliminate dual-hand ping-pong jitter
                    if (chosenType === 'RIGHT') {
                        if (leftHandData.landmarks[8].y < rightHandData.landmarks[8].y - 0.14 && (now - lastExplodedHandSwitchTime > 400)) {
                            chosenType = 'LEFT';
                        }
                    } else {
                        if (rightHandData.landmarks[8].y < leftHandData.landmarks[8].y - 0.14 && (now - lastExplodedHandSwitchTime > 400)) {
                            chosenType = 'RIGHT';
                        }
                    }
                }
                
                if (chosenType !== currentExplodedHandType) {
                    currentExplodedHandType = chosenType;
                    lastExplodedHandSwitchTime = now;
                    // Reset activeCursorPos so pointer snaps cleanly without dragging/lerping across the entire screen
                    activeCursorPos.x = -100;
                    activeCursorPos.y = -100;
                }
                
                activePointerType = currentExplodedHandType;
                activePointerHand = (activePointerType === 'RIGHT') ? rightHandData : leftHandData;
            } else {
                const singleHand = validHands[0];
                activePointerHand = singleHand;
                activePointerType = singleHand.isRightHand ? 'RIGHT' : 'LEFT';
                if (currentExplodedHandType !== activePointerType) {
                    currentExplodedHandType = activePointerType;
                    lastExplodedHandSwitchTime = now;
                    activeCursorPos.x = -100;
                    activeCursorPos.y = -100;
                }
                if (singleHand.isRightHand) {
                    rightHandData = singleHand;
                    leftHandData = null;
                } else {
                    leftHandData = singleHand;
                    rightHandData = null;
                }
            }
            
            // Dynamic HUD role labels in exploded view
            const labelRightEl = document.getElementById('label-right-hand');
            const labelLeftEl = document.getElementById('label-left-hand');
            if (labelRightEl) labelRightEl.innerText = "RIGHT HAND: UI CONTROLS";
            if (labelLeftEl) labelLeftEl.innerText = "LEFT HAND: UI CONTROLS";
            
            if (leftHandData) {
                lastLeftHandSeenTime = now;
                isLeftHandPresent = true;
                if (panelLeftEl) {
                    panelLeftEl.classList.remove('opacity-30');
                    panelLeftEl.classList.add('opacity-100');
                }
                if (statusLeftEl && activePointerHand !== leftHandData) {
                    statusLeftEl.innerText = "STANDBY 🎯";
                    statusLeftEl.className = "text-xs font-hud font-bold text-sky-300";
                }
            } else if (now - lastLeftHandSeenTime > 1200) {
                isLeftHandPresent = false;
                if (statusLeftEl) {
                    statusLeftEl.innerText = "READY (RAISE FINGER)";
                    statusLeftEl.className = "text-xs font-hud font-bold text-slate-400";
                }
            }
            
            if (rightHandData) {
                lastRightHandSeenTime = now;
                isRightHandPresent = true;
                if (panelRightEl) {
                    panelRightEl.classList.remove('opacity-30');
                    panelRightEl.classList.add('opacity-100');
                }
                if (statusRightEl && activePointerHand !== rightHandData) {
                    statusRightEl.innerText = "STANDBY 🎯";
                    statusRightEl.className = "text-xs font-hud font-bold text-sky-300";
                }
            } else if (now - lastRightHandSeenTime > 1200) {
                isRightHandPresent = false;
                if (statusRightEl) {
                    statusRightEl.innerText = "READY (RAISE FINGER)";
                    statusRightEl.className = "text-xs font-hud font-bold text-slate-400";
                }
            }
            
            // Process virtual holographic pointer for exploded view
            if (activePointerHand) {
                processPointerWithHand(activePointerHand.landmarks, activePointerType);
            } else if (!isLeftHandPresent && !isRightHandPresent) {
                if (arCursorEl) arCursorEl.style.display = 'none';
                clearHoverState();
                dwellTarget = null;
            }
        } else {
            // ========================================================
            // NORMAL ASSEMBLED GAUNTLET MODE:
            // ========================================================
            const labelRightEl = document.getElementById('label-right-hand');
            const labelLeftEl = document.getElementById('label-left-hand');
            if (labelRightEl) labelRightEl.innerText = "RIGHT HAND: WEARING GAUNTLET";
            if (labelLeftEl) labelLeftEl.innerText = "LEFT HAND: UI CONTROLS";

            if (validHands.length >= 2) {
                const rHand = validHands.find(h => h.isRightHand);
                const lHand = validHands.find(h => !h.isRightHand);
                if (rHand && lHand) {
                    rightHandData = rHand;
                    leftHandData = lHand;
                } else {
                    validHands.sort((a, b) => b.screenX - a.screenX);
                    rightHandData = validHands[0];
                    leftHandData = validHands[1];
                }
            } else {
                const singleHand = validHands[0];
                if (singleHand.isRightHand) {
                    // RIGHT HAND ONLY: Wears gauntlet, suppress pointer
                    rightHandData = singleHand;
                    leftHandData = null;
                    isLeftHandPresent = false;
                    if (arCursorEl) arCursorEl.style.display = 'none';
                    clearHoverState();
                    dwellTarget = null;
                    activeCursorPos.x = -100;
                    activeCursorPos.y = -100;
                } else {
                    // LEFT HAND ONLY: Do NOT attach gauntlet!
                    // Gauntlet remains in pedestal showcase center.
                    // Left hand is strictly UI CONTROLS & POINTER.
                    leftHandData = singleHand;
                    rightHandData = null;
                    isRightHandPresent = false;
                    rightHandPose = null;
                    smoothedRightLandmarks = null;
                    smoothedRightQuat = null;
                    rightHandHistory = [];
                }
            }
            
            // 1. Process LEFT HAND (Controls UI & Pointer exclusively)
            if (leftHandData) {
                lastLeftHandSeenTime = now;
                isLeftHandPresent = true;
                if (panelLeftEl) {
                    panelLeftEl.classList.remove('opacity-30');
                    panelLeftEl.classList.add('opacity-100');
                }
                if (statusLeftEl) {
                    statusLeftEl.innerText = "ACTIVE 🎯";
                    statusLeftEl.className = "text-xs font-hud font-bold text-amber-400";
                }
                processPointerWithHand(leftHandData.landmarks, 'LEFT');
            } else {
                isLeftHandPresent = false;
                if (arCursorEl) arCursorEl.style.display = 'none';
                clearHoverState();
                dwellTarget = null;
                activeCursorPos.x = -100;
                activeCursorPos.y = -100;
                if (panelLeftEl) {
                    panelLeftEl.classList.add('opacity-30');
                    panelLeftEl.classList.remove('opacity-100');
                }
                if (statusLeftEl) {
                    statusLeftEl.innerText = "SEARCHING...";
                    statusLeftEl.className = "text-xs font-hud font-bold text-amber-400";
                }
            }
            
            // 2. Process RIGHT HAND (Wears 3D Gauntlet & Fires Repulsor, NO UI Controls)
            if (rightHandData) {
                lastRightHandSeenTime = now;
                isRightHandPresent = true;
                if (panelRightEl) {
                    panelRightEl.classList.remove('opacity-30');
                    panelRightEl.classList.add('opacity-100');
                }
                
                // Track 3D pose for wearable gauntlet
                rightHandPose = computeRightHand3DPose(rightHandData.landmarks);
                
                if (statusRightEl && (now - lastBlastStatusTime > 1200)) {
                    if (!isRepulsorFiringEnabled) {
                        statusRightEl.innerText = "WEARING (BLAST DISABLED) 🔒";
                        statusRightEl.className = "text-xs font-hud font-bold text-slate-400";
                    } else {
                        statusRightEl.innerText = isBlastArmed ? "GAUNTLET ATTACHED 🦾" : "RECHARGING... ⚡";
                        statusRightEl.className = isBlastArmed ? "text-xs font-hud font-bold text-emerald-400" : "text-xs font-hud font-bold text-amber-400";
                    }
                }
                
                // Check for palm repulsor blast
                checkRightPalmBlast(rightHandData.landmarks);
            } else {
                isRightHandPresent = false;
                rightHandPose = null;
                smoothedRightLandmarks = null;
                smoothedRightQuat = null;
                rightHandHistory = [];
                isBlastArmed = true;
                if (panelRightEl) {
                    panelRightEl.classList.add('opacity-30');
                    panelRightEl.classList.remove('opacity-100');
                }
                if (statusRightEl) {
                    statusRightEl.innerText = "STANDBY (SHOWCASE)";
                    statusRightEl.className = "text-xs font-hud font-bold text-slate-400";
                }
            }
        }
    }
}

// UNIFIED 1:1 RESPONSIVE POINTER ENGINE FOR ACTIVE HAND (SUPPORTS BUTTONS, SLIDERS, SPECTRUM GRAPH & 3D ATOMS)
function processPointerWithHand(handLandmarks, handType) {
    const now = performance.now();
    const indexTip = handLandmarks[8];
    const thumbTip = handLandmarks[4];
    const cursorLabel = document.getElementById('cursor-text');
    const dwellCircle = document.getElementById('dwell-circle');
    const statusEl = handType === 'RIGHT' ? document.getElementById('status-right-hand') : document.getElementById('status-left-hand');
    
    // EXACT 1:1 DIRECT POINTER TRACKING - CORRECTED FOR object-fit: cover CROPPING
    let normX = 1.0 - indexTip.x;
    let normY = indexTip.y;
    if (cameraVideoEl && cameraVideoEl.videoWidth > 0 && cameraVideoEl.videoHeight > 0) {
        const videoAspect = cameraVideoEl.videoWidth / cameraVideoEl.videoHeight;
        const screenAspect = window.innerWidth / window.innerHeight;
        if (screenAspect > videoAspect) {
            const scale = screenAspect / videoAspect;
            normY = (normY - 0.5) * scale + 0.5;
        } else if (screenAspect < videoAspect) {
            const scale = videoAspect / screenAspect;
            normX = (normX - 0.5) * scale + 0.5;
        }
    }
    const exactScreenX = Math.max(0, Math.min(window.innerWidth, normX * window.innerWidth));
    const exactScreenY = Math.max(0, Math.min(window.innerHeight, normY * window.innerHeight));
    
    const deltaX = exactScreenX - activeCursorPos.x;
    const deltaY = exactScreenY - activeCursorPos.y;
    const moveDist = Math.hypot(deltaX, deltaY);
    
    if (activeCursorPos.x < 0) {
        activeCursorPos.x = exactScreenX;
        activeCursorPos.y = exactScreenY;
    } else {
        // Continuous adaptive dynamic pointer filter (no stepped jumps):
        // Micro-tremors (<10px): heavy damping (alpha ~0.36) locks reticle rock-still
        // Normal gestures (20-75px): buttery smooth continuous quadratic ramp
        // Fast sweeps (>100px): snappy repositioning (up to 0.95)
        const speedRatio = Math.min(1.0, moveDist / 85.0);
        let cursorAlpha = 0.36 + 0.54 * (speedRatio * speedRatio);
        if (moveDist > 140) cursorAlpha = 0.95;
        
        activeCursorPos.x += deltaX * cursorAlpha;
        activeCursorPos.y += deltaY * cursorAlpha;
    }
    
    // Calculate Air-Pinch Distance
    const pinchDist2D = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const pinchDist3D = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y, (indexTip.z - thumbTip.z) * 0.7);
    const pinchVal = Math.min(pinchDist2D, pinchDist3D);
    
    const pinchThreshold = isPinching ? 0.11 : 0.088;
    const isCurrentlyPinching = pinchVal < pinchThreshold;
    
    // 1. Check Active Interactive Element under/near cursor (Buttons, Sliders, Spectrum Canvas)
    // Dynamic capture radius: expands slightly while pinching to prevent accidental slips
    const searchRadius = isCurrentlyPinching ? 55 : 38;
    const targetMatch = findNearestInteractiveElement(activeCursorPos.x, activeCursorPos.y, searchRadius);
    const targetEl = targetMatch ? targetMatch.element : null;
    const targetType = targetMatch ? targetMatch.type : null;
    
    // Magnetic Button Stabilization during Pinch:
    // For compact buttons, gently anchor pointer toward button center to eliminate index-thumb drift.
    // For large panels/cards (like schematic stage cards), stabilize in-place without pulling across large distances.
    if (targetEl && targetType === 'button' && isCurrentlyPinching) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.width <= 140 && rect.height <= 70 && !targetEl.classList.contains('schematic-stage-card')) {
            const btnCx = rect.left + rect.width * 0.5;
            const btnCy = rect.top + rect.height * 0.5;
            activeCursorPos.x += (btnCx - activeCursorPos.x) * 0.26;
            activeCursorPos.y += (btnCy - activeCursorPos.y) * 0.26;
        }
    }
    
    // Squeeze visual scaling on holographic reticle
    const squeezeScale = Math.max(0.65, Math.min(1.0, pinchVal / 0.12));
    if (arCursorEl) {
        arCursorEl.style.display = 'block';
        arCursorEl.style.left = `${activeCursorPos.x}px`;
        arCursorEl.style.top = `${activeCursorPos.y}px`;
        arCursorEl.style.transform = `translate(-50%, -50%) scale(${squeezeScale})`;
    }
    
    // 2. Check 3D Object Intersect if no 2D interactive UI is hovered
    const hit3D = !targetEl ? check3DInteraction(activeCursorPos.x, activeCursorPos.y) : null;
    
    // Handle Hover Class Management
    if (targetEl) {
        if (lastHoveredElement && lastHoveredElement !== targetEl) {
            lastHoveredElement.classList.remove('hovered');
            lastHoveredElement.classList.remove('hovered-slider');
        }
        if (targetType === 'slider') {
            targetEl.classList.add('hovered-slider');
        } else if (targetType === 'button') {
            targetEl.classList.add('hovered');
        }
        lastHoveredElement = targetEl;
    } else {
        clearHoverState();
    }
    
    // 3. SLIDER INTERACTION VIA INDEX FINGER (Pinch-and-Drag or Dwell)
    if (targetType === 'slider' && targetEl) {
        const slider = targetEl;
        if (isCurrentlyPinching) {
            activeDraggingSlider = slider;
            const rect = slider.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (activeCursorPos.x - rect.left) / rect.width));
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const step = parseFloat(slider.step) || 1;
            let val = min + ratio * (max - min);
            val = Math.round(val / step) * step;
            if (slider.step && slider.step.includes('.')) {
                const decimals = slider.step.split('.')[1].length;
                val = parseFloat(val.toFixed(decimals));
            }
            if (parseFloat(slider.value) !== val) {
                slider.value = val;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                slider.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (cursorLabel) {
                cursorLabel.innerText = `ADJUST: ${slider.id.replace('slider-', '').toUpperCase()} = ${slider.value}`;
            }
        } else {
            activeDraggingSlider = null;
        }
    } else if (!isCurrentlyPinching) {
        activeDraggingSlider = null;
    }
    
    // 4. SPECTRUM CANVAS INTERACTION VIA INDEX FINGER
    let hoverLambda = null;
    if (targetType === 'spectrum_canvas' && targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const padL = 46;
        const padR = 36;
        const plotW = Math.max(10, rect.width - padL - padR);
        const clickX = activeCursorPos.x - rect.left - padL;
        const ratio = Math.max(0, Math.min(1, clickX / plotW));
        hoverLambda = Math.round((400.0 + ratio * 400.0) * 10) / 10;
    }
    
    // 5. Dwell / Auto-Lock Selection Handling
    const activeHoverTarget = targetEl || (hit3D ? (hit3D.type === 'atom' ? hit3D.atom : hit3D.object) : null);
    if (activeHoverTarget) {
        if (dwellTarget === activeHoverTarget) {
            const elapsed = now - dwellStartTime;
            const pct = Math.min(1.0, elapsed / DWELL_DURATION);
            if (dwellCircle) {
                dwellCircle.style.strokeDashoffset = 132 - (pct * 132);
            }
            if (cursorLabel) {
                if (targetType === 'slider') {
                    cursorLabel.innerText = `SLIDER: ${targetEl.id.replace('slider-', '').toUpperCase()} (${targetEl.value})`;
                } else if (targetType === 'spectrum_canvas' && hoverLambda !== null) {
                    cursorLabel.innerText = `TUNE λ: ${hoverLambda.toFixed(1)} nm (${Math.round(pct * 100)}%)`;
                } else if (targetType === 'button') {
                    const btnName = targetEl.innerText.trim().slice(0, 14) || "BUTTON";
                    cursorLabel.innerText = `HOLD: ${btnName} (${Math.round(pct * 100)}%)`;
                } else if (hit3D) {
                    cursorLabel.innerText = `TARGET: ${hit3D.name} (${Math.round(pct * 100)}%)`;
                }
            }
            
            // Trigger Dwell Auto-Click when dwell circle completes
            if (elapsed >= DWELL_DURATION && (now - lastDwellClickTime > Math.max(1200, DWELL_DURATION * 0.75))) {
                if (targetType === 'button') {
                    triggerAirClick(activeCursorPos.x, activeCursorPos.y, targetEl);
                } else if (targetType === 'spectrum_canvas' && hoverLambda !== null) {
                    const sliderWl = document.getElementById('slider-wavelength');
                    if (sliderWl) {
                        sliderWl.value = hoverLambda.toFixed(1);
                        sliderWl.dispatchEvent(new Event('input', { bubbles: true }));
                        sliderWl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    playResonanceChime();
                    showNotification(`TUNED CAVITY TO λ = ${hoverLambda.toFixed(1)} nm 🎯`);
                } else if (targetType === 'slider') {
                    // Dwell on slider snaps value to index finger position
                    const rect = targetEl.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (activeCursorPos.x - rect.left) / rect.width));
                    const min = parseFloat(targetEl.min) || 0;
                    const max = parseFloat(targetEl.max) || 100;
                    const step = parseFloat(targetEl.step) || 1;
                    let val = min + ratio * (max - min);
                    val = Math.round(val / step) * step;
                    targetEl.value = val;
                    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
                    targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                    playPinchClickSound();
                } else if (hit3D) {
                    trigger3DClick(hit3D);
                }
                lastDwellClickTime = now;
                dwellStartTime = now;
                if (dwellCircle) dwellCircle.style.strokeDashoffset = 132;
            }
        } else {
            dwellTarget = activeHoverTarget;
            dwellStartTime = now;
            if (dwellCircle) dwellCircle.style.strokeDashoffset = 132;
            if (cursorLabel) {
                if (targetType === 'slider') {
                    cursorLabel.innerText = `SLIDER: ${targetEl.id.replace('slider-', '').toUpperCase()} (${targetEl.value})`;
                } else if (targetType === 'spectrum_canvas' && hoverLambda !== null) {
                    cursorLabel.innerText = `TUNE λ: ${hoverLambda.toFixed(1)} nm (PINCH TO LOCK)`;
                } else if (targetType === 'button') {
                    cursorLabel.innerText = `TARGET: ${targetEl.innerText.trim().slice(0, 14)}`;
                } else if (hit3D) {
                    cursorLabel.innerText = `SELECT: ${hit3D.name}`;
                }
            }
        }
    } else {
        dwellTarget = null;
        dwellStartTime = now;
        if (dwellCircle) dwellCircle.style.strokeDashoffset = 132;
        if (cursorLabel) cursorLabel.innerText = handType === 'RIGHT' ? "RIGHT INDEX 🎯" : "LEFT INDEX 🎯";
    }
    
    // 6. Air-Pinch Click Trigger
    if (isCurrentlyPinching) {
        if (arCursorEl) arCursorEl.classList.add('pinching');
        if (!isPinching && (now - pinchCooldown > 280)) {
            if (targetType === 'button') {
                triggerAirClick(activeCursorPos.x, activeCursorPos.y, targetEl);
            } else if (targetType === 'spectrum_canvas' && hoverLambda !== null) {
                const sliderWl = document.getElementById('slider-wavelength');
                if (sliderWl) {
                    sliderWl.value = hoverLambda.toFixed(1);
                    sliderWl.dispatchEvent(new Event('input', { bubbles: true }));
                    sliderWl.dispatchEvent(new Event('change', { bubbles: true }));
                }
                playResonanceChime();
                showNotification(`TUNED CAVITY TO λ = ${hoverLambda.toFixed(1)} nm 🎯`);
            } else if (hit3D) {
                trigger3DClick(hit3D);
            } else if (targetType !== 'slider') {
                triggerAirClick(activeCursorPos.x, activeCursorPos.y, null);
            }
            pinchCooldown = now;
            if (dwellCircle) dwellCircle.style.strokeDashoffset = 132;
        }
        isPinching = true;
        isLeftPinching = true;
        if (statusEl) statusEl.innerText = `${handType} PINCH SELECTION! 💥`;
    } else {
        if (arCursorEl) arCursorEl.classList.remove('pinching');
        isPinching = false;
        isLeftPinching = false;
        if (statusEl) {
            if (targetType === 'button') {
                statusEl.innerText = `BUTTON: ${targetEl.innerText.trim().slice(0, 14)}`;
            } else if (targetType === 'slider') {
                statusEl.innerText = `SLIDER: ${targetEl.id.replace('slider-', '').toUpperCase()} (${targetEl.value})`;
            } else if (targetType === 'spectrum_canvas' && hoverLambda !== null) {
                statusEl.innerText = `TUNE λ: ${hoverLambda.toFixed(1)} nm`;
            } else if (hit3D) {
                statusEl.innerText = `TARGET: ${hit3D.name.slice(0, 18)}`;
            } else {
                statusEl.innerText = handType === 'RIGHT' ? "RIGHT INDEX AIMING 🎯" : "LEFT INDEX AIMING 🎯";
            }
        }
    }
}

// CHECK OPEN-PALM FORWARD THRUST FOR REPULSOR LASER (ONLY IN IRON MAN MODE!)
function checkPalmBlast(landmarks, handType) {
    if (currentState !== 'resonator') return; // Strictly blocked outside resonator mode
    
    const wrist = landmarks[0];
    const middleKnuckle = landmarks[9];
    const pinkyKnuckle = landmarks[17];
    const indexKnuckle = landmarks[5];
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];
    
    const aspect = window.innerWidth / window.innerHeight;
    const palmW = Math.hypot((pinkyKnuckle.x - indexKnuckle.x) * aspect, pinkyKnuckle.y - indexKnuckle.y);
    const palmH = Math.hypot((wrist.x - middleKnuckle.x) * aspect, wrist.y - middleKnuckle.y);
    const handSize = Math.max(palmW, palmH);
    
    const splay = Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y);
    const isOpenPalm = splay > 0.14;
    const isThrusting = handSize > 0.24;
    
    const now = performance.now();
    if (isThrusting && isOpenPalm && (now - blastCooldown > 1100)) {
        triggerBlastEffect();
        blastCooldown = now;
    }
}
const checkLeftPalmBlast = checkPalmBlast; // Compatibility alias

function clearHoverState() {
    if (lastHoveredElement) {
        lastHoveredElement.classList.remove('hovered');
        lastHoveredElement.classList.remove('hovered-slider');
        lastHoveredElement = null;
    }
    if (activeDraggingSlider) {
        activeDraggingSlider.classList.remove('hovered-slider');
        activeDraggingSlider = null;
    }
}

// High-Precision Interactive Element Finder (Buttons, Sliders, Spectrum Graph)
function findNearestInteractiveElement(x, y, maxDist = 38) {
    // 1. Direct hit via elementFromPoint
    const directEl = document.elementFromPoint(x, y);
    if (directEl) {
        const slider = directEl.closest('input[type="range"]');
        if (slider) return { type: 'slider', element: slider, dist: 0 };
        
        const spec = directEl.closest('#spectrum-canvas');
        if (spec) return { type: 'spectrum_canvas', element: spec, dist: 0 };
        
        const btn = directEl.closest('.ar-btn, button, [role="button"], .interactive-target');
        if (btn) return { type: 'button', element: btn, dist: 0 };
    }
    
    // 2. Proximity search around cursor point
    const candidates = document.querySelectorAll('.ar-btn, button, input[type="range"], #spectrum-canvas, .interactive-target');
    let bestMatch = null;
    let minDist = maxDist;
    
    for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        
        // Inside bounding box
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            let elType = 'button';
            if (el.tagName === 'INPUT' && el.type === 'range') elType = 'slider';
            else if (el.id === 'spectrum-canvas') elType = 'spectrum_canvas';
            return { type: elType, element: el, dist: 0 };
        }
        
        // Clamped closest point on rectangle
        const cx = Math.max(rect.left, Math.min(x, rect.right));
        const cy = Math.max(rect.top, Math.min(y, rect.bottom));
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < minDist) {
            minDist = dist;
            let elType = 'button';
            if (el.tagName === 'INPUT' && el.type === 'range') elType = 'slider';
            else if (el.id === 'spectrum-canvas') elType = 'spectrum_canvas';
            bestMatch = { type: elType, element: el, dist: minDist };
        }
    }
    
    return bestMatch;
}

// Backward compatibility alias
const findNearestButton = (x, y, maxDist = 35) => {
    const res = findNearestInteractiveElement(x, y, maxDist);
    return (res && res.type === 'button') ? { btn: res.element, dist: res.dist } : null;
};

// Helper for recursive group hierarchy check (ensures leaf sub-meshes identify their canonical stage group)
function isChildOf(child, parent) {
    if (!child || !parent) return false;
    let curr = child;
    while (curr) {
        if (curr === parent) return true;
        curr = curr.parent;
    }
    return false;
}

// 3D Object Raycast Interaction (Quantum Atoms, Gain Crystal, Mirrors, Cavity Housings)
function check3DInteraction(x, y) {
    if (!camera || !scene) return null;
    
    // Check if cursor point is currently directly over any 2D HUD panels or schematic cards
    const el = document.elementFromPoint(x, y);
    if (el && el.closest && el.closest('.hud-panel, #resonator-controls-panel, #resonator-bench-panel, #hud-top, #hud-bottom-right, #exploded-schematic-stages, #exploded-view-prompt, #exploded-schematic-header, .schematic-stage-card')) {
        return null;
    }
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    
    if (currentState === 'resonator' && resonatorGroup && resonatorGroup.visible) {
        // Priority 1: Check proximity to 36 Quantum Atoms in Gain Medium
        if (gainMediumAtoms && gainMediumAtoms.length > 0) {
            let closestAtom = null;
            let minAtomRayDist = Infinity;
            const atomWorldPos = new THREE.Vector3();
            
            for (const atom of gainMediumAtoms) {
                if (!atom.coreMesh) continue;
                atom.coreMesh.getWorldPosition(atomWorldPos);
                const distToRay = raycaster.ray.distanceToPoint(atomWorldPos);
                if (distToRay < 0.65) {
                    const depthDist = raycaster.ray.origin.distanceTo(atomWorldPos);
                    if (depthDist < minAtomRayDist) {
                        minAtomRayDist = depthDist;
                        closestAtom = atom;
                    }
                }
            }
            
            if (closestAtom) {
                return {
                    type: 'atom',
                    atom: closestAtom,
                    object: closestAtom.coreMesh,
                    name: `ATOM ${closestAtom.state} (${closestAtom.isExcited ? 'EXCITED' : 'GROUND'})`
                };
            }
        }
        
        // Priority 2: Intersect primary optical resonator components
        const meshTargets = [];
        if (gainCrystalMesh) meshTargets.push(gainCrystalMesh);
        if (gainCrystalCore) meshTargets.push(gainCrystalCore);
        if (resMirrorLeft) meshTargets.push(resMirrorLeft);
        if (resMirrorRight) meshTargets.push(resMirrorRight);
        if (resEmitterHousing) meshTargets.push(resEmitterHousing);
        if (resDetectorHousing) meshTargets.push(resDetectorHousing);
        if (pumpEmittersTop && pumpEmittersTop.length > 0) meshTargets.push(...pumpEmittersTop);
        if (pumpEmittersBottom && pumpEmittersBottom.length > 0) meshTargets.push(...pumpEmittersBottom);
        
        if (meshTargets.length > 0) {
            const hits = raycaster.intersectObjects(meshTargets, true);
            if (hits.length > 0) {
                const hitObj = hits[0].object;
                if (hitObj === gainCrystalMesh || hitObj === gainCrystalCore) {
                    return { type: 'crystal', object: gainCrystalMesh, name: 'Nd:YAG GAIN MEDIUM' };
                } else if (hitObj === resMirrorLeft || (resMountL && (hitObj === resMountL || resMountL.children.includes(hitObj)))) {
                    return { type: 'mirror_left', object: resMirrorLeft, name: 'M1 HIGH REFLECTOR (99.9%)' };
                } else if (hitObj === resMirrorRight || (resMountR && (hitObj === resMountR || resMountR.children.includes(hitObj)))) {
                    return { type: 'mirror_right', object: resMirrorRight, name: 'M2 OUTPUT COUPLER' };
                } else if (resEmitterHousing && (hitObj === resEmitterHousing || resEmitterHousing.children.includes(hitObj))) {
                    return { type: 'emitter', object: resEmitterHousing, name: 'LASER SEED EMITTER' };
                } else if (resDetectorHousing && (hitObj === resDetectorHousing || resDetectorHousing.children.includes(hitObj))) {
                    return { type: 'detector', object: resDetectorHousing, name: 'POWER DETECTOR' };
                } else {
                    return { type: 'pump', object: hitObj, name: 'PUMP FLASHLAMPS' };
                }
            }
        }
    } else if (currentState === 'gauntlet' && gauntletGroup && gauntletGroup.visible) {
        if (isExplodedView) {
            const targets = [
                schematicPowerSourceGroup,
                schematicCoreChamberGroup,
                schematicRearEmitterGroup,
                schematicPalmApertureGroup,
                schematicCoherentBeamGroup,
                gauntletGroup
            ].filter(Boolean);
            const hits = raycaster.intersectObjects(targets, true);
            if (hits.length > 0) {
                const hitObj = hits[0].object;
                let stageName = 'EXPLODED MARK VII COMPONENT';
                let stageType = 'gauntlet';
                let stageTarget = hitObj;
                
                if (schematicPowerSourceGroup && isChildOf(hitObj, schematicPowerSourceGroup)) {
                    stageName = 'STAGE 1: POWER SOURCE (ARC REACTOR)';
                    stageType = 'stage_1';
                    stageTarget = schematicPowerSourceGroup;
                } else if (schematicCoreChamberGroup && isChildOf(hitObj, schematicCoreChamberGroup)) {
                    stageName = 'STAGE 2: THE CORE CHAMBER (ACTIVE MEDIUM)';
                    stageType = 'stage_2';
                    stageTarget = schematicCoreChamberGroup;
                } else if (schematicRearEmitterGroup && isChildOf(hitObj, schematicRearEmitterGroup)) {
                    stageName = 'STAGE 3: REAR EMITTER (100% MIRROR)';
                    stageType = 'stage_3';
                    stageTarget = schematicRearEmitterGroup;
                } else if (schematicPalmApertureGroup && isChildOf(hitObj, schematicPalmApertureGroup)) {
                    stageName = 'STAGE 4: PALM APERTURE (OUTPUT COUPLER)';
                    stageType = 'stage_4';
                    stageTarget = schematicPalmApertureGroup;
                } else if (schematicCoherentBeamGroup && isChildOf(hitObj, schematicCoherentBeamGroup)) {
                    stageName = 'STAGE 5: COHERENT OUTPUT BEAM';
                    stageType = 'stage_5';
                    stageTarget = schematicCoherentBeamGroup;
                }
                return { type: stageType, object: stageTarget, name: stageName };
            }
        } else if (!isRightHandPresent) {
            const hits = raycaster.intersectObjects([gauntletGroup], true);
            if (hits.length > 0) {
                return { type: 'gauntlet', object: hits[0].object, name: 'MARK VII GAUNTLET' };
            }
        }
    }
    
    return null;
}

function trigger3DClick(hit3D) {
    playPinchClickSound();
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${activeCursorPos.x}px`;
    ripple.style.top = `${activeCursorPos.y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
    
    if (currentState === 'resonator' && hit3D) {
        if (hit3D.type === 'atom' && hit3D.atom) {
            const nextExcited = !hit3D.atom.isExcited;
            hit3D.atom.setExcited(nextExcited);
            if (nextExcited) {
                playPumpBurstSound();
                showNotification("⚛ QUANTUM ATOM EXCITED TO E₂ (ENERGY ABSORBED) ✨");
            } else {
                playSeedPhotonSound();
                showNotification("⚛ STIMULATED EMISSION TRIGGERED (E₂ → E₁) 💫");
            }
            const activeStatus = ironManHand === 'LEFT' ? document.getElementById('status-left-hand') : document.getElementById('status-right-hand');
            if (activeStatus) activeStatus.innerText = nextExcited ? "ATOM EXCITED ⚡" : "EMISSION 💫";
        } else if (hit3D.type === 'crystal') {
            playPumpBurstSound();
            for (let i = 0; i < 6; i++) {
                setTimeout(() => spawnPumpParticle(), i * 50);
            }
            showNotification("⚡ GAIN CRYSTAL OPTICALLY PUMPED");
        } else if (hit3D.type === 'mirror_left' || hit3D.type === 'mirror_right') {
            const btnTuneRes = document.getElementById('btn-tune-resonance');
            if (btnTuneRes) btnTuneRes.click();
        } else if (hit3D.type === 'emitter') {
            injectSeedPhoton();
            playSeedPhotonSound();
            showNotification("✨ SEED PHOTON INJECTED // Cascade Initiated");
        } else if (hit3D.type === 'detector') {
            fireOpticalLaserBlast();
        } else if (hit3D.type === 'pump') {
            const btnPumpMedium = document.getElementById('btn-pump-medium');
            if (btnPumpMedium) btnPumpMedium.click();
        } else {
            simInput.trigger_photon = true;
            playSeedPhotonSound();
        }
    } else if (currentState === 'gauntlet') {
        if (hit3D && hit3D.type && hit3D.type.startsWith('stage_')) {
            playSeedPhotonSound();
            showNotification(`🔍 INSPECTED: ${hit3D.name} ⚡`);
            if (hit3D.type === 'stage_1') {
                const btnPump = document.getElementById('btn-pump-up');
                if (btnPump) btnPump.click();
            } else if (hit3D.type === 'stage_2') {
                const btnSeed = document.getElementById('btn-seed');
                if (btnSeed) btnSeed.click();
            }
        } else {
            if (arcCore && arcCore.material) {
                arcCore.material.emissiveIntensity = 8.0;
            }
            playSeedPhotonSound();
            const activeStatus = gauntletHand === 'LEFT' ? document.getElementById('status-left-hand') : document.getElementById('status-right-hand');
            if (activeStatus) activeStatus.innerText = "REPULSOR ACTIVE ⚡";
        }
    }
}

function triggerAirClick(x, y, btnElement) {
    playPinchClickSound();
    
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
    
    if (btnElement) {
        btnElement.classList.add('clicked');
        setTimeout(() => btnElement.classList.remove('clicked'), 200);
        btnElement.click();
    }
}

// ==========================================
// AUDIO SYNTHESIZER
// ==========================================
function setupAudio() {
    const audioBtn = document.getElementById('audio-indicator');
    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            audioBtn.innerText = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
            audioBtn.classList.toggle('text-rose-400', !soundEnabled);
            if (!soundEnabled && humGain) {
                humGain.gain.setValueAtTime(0, audioCtx.currentTime);
            }
        });
    }
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        humOsc = audioCtx.createOscillator();
        humGain = audioCtx.createGain();
        humOsc.type = 'sawtooth';
        humOsc.frequency.setValueAtTime(110, audioCtx.currentTime);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, audioCtx.currentTime);
        
        humGain.gain.setValueAtTime(0, audioCtx.currentTime);
        humOsc.connect(filter);
        filter.connect(humGain);
        humGain.connect(audioCtx.destination);
        humOsc.start();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPinchClickSound() {
    if (!soundEnabled) return;
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function updateAudioHum(temp, photons) {
    if (!audioCtx || !soundEnabled || !humGain) return;
    const isHandActive = isLeftHandPresent || isRightHandPresent;
    const palmBoost = isHandActive ? 50 : 0;
    const targetFreq = 110 + (temp * 540) + Math.min(photons * 0.1, 200) + palmBoost;
    humOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.05);
    const targetVol = Math.max(0.0, Math.min(0.12, (temp * 0.08) + (photons > 10 ? 0.04 : 0.0) + (isHandActive ? 0.02 : 0.0)));
    humGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
}

function playSeedPhotonSound() {
    if (!soundEnabled) return;
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
}

function playStimulatedEmissionChime() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now); // D6 note
        osc.frequency.exponentialRampToValueAtTime(2349.32, now + 0.08); // High harmonic twin ping
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch(e) {}
}

function playPumpBurstSound() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.21);
    } catch(e) {}
}

function playResonanceChime() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.08, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.55);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.6);
        });
    } catch(e) {}
}

function playBlastSound() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        
        const nowTime = audioCtx.currentTime;
        const t = Math.max(0.001, nowTime);
        
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(320, t);
        subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.55);
        subGain.gain.setValueAtTime(0.35, t);
        subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        subOsc.connect(subGain);
        subGain.connect(audioCtx.destination);
        subOsc.start(t);
        subOsc.stop(t + 0.65);
        
        const sampleRate = audioCtx.sampleRate || 44100;
        const bufferSize = Math.floor(sampleRate * 0.35);
        if (bufferSize > 0) {
            const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.08));
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(2200, t);
            noiseFilter.Q.setValueAtTime(2.5, t);
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.22, t);
            noiseGain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(audioCtx.destination);
            noise.start(t);
        }
    } catch (err) {
        console.warn("[playBlastSound non-fatal audio error]:", err);
    }
}

function playLockoutSound() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.23);
    } catch (e) {}
}

function playSafetyToggleSound(isArmed) {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        if (isArmed) {
            osc.frequency.setValueAtTime(520, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1040, audioCtx.currentTime + 0.12);
        } else {
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.14);
        }
        gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {}
}


// ==========================================
// MODE HUD UI SYNCHRONIZATION
// ==========================================
function updateModeUI(mode) {
    currentState = mode;
    const btnGauntlet = document.getElementById('btn-mode-gauntlet');
    const btnResonator = document.getElementById('btn-mode-resonator');
    const btnBlast = document.getElementById('btn-blast');
    const panelLeft = document.getElementById('panel-left-hand');
    const panelRight = document.getElementById('panel-right-hand');
    const iconLeft = document.getElementById('icon-left-hand');
    const iconRight = document.getElementById('icon-right-hand');
    const labelLeft = document.getElementById('label-left-hand');
    const labelRight = document.getElementById('label-right-hand');
    const statusLeft = document.getElementById('status-left-hand');
    const statusRight = document.getElementById('status-right-hand');
    const badgeLaserIcon = document.getElementById('badge-laser-icon');
    const badgeLaserText = document.getElementById('badge-laser-text');
    const blastWarning = document.getElementById('blast-warning');
    
    if (btnGauntlet) {
        btnGauntlet.innerText = '🦾 GAUNTLET MODE';
    }
    if (btnResonator) {
        btnResonator.innerText = '🔬 OPTICAL RESONATOR';
    }
    
    // Synchronize Blast & Safety Toggle states
    updateRepulsorSafetyUI();
    
    if (mode === 'gauntlet') {
        if (btnGauntlet) btnGauntlet.classList.add('ar-btn-active');
        if (btnResonator) btnResonator.classList.remove('ar-btn-active');
        
        // Restore AR Camera feed & transparent canvas background
        document.body.classList.remove('mode-resonator');
        if (cameraVideoEl) cameraVideoEl.classList.remove('resonator-blackout');
        if (scene) scene.background = null;
        
        // Toggle Gauntlet vs Optical Resonator HUD panels
        const resControls = document.getElementById('resonator-controls-panel');
        const resBench = document.getElementById('resonator-bench-panel');
        const physicsHud = document.getElementById('physics-hud');
        const gauntletBottom = document.getElementById('gauntlet-bottom-row');
        const badgeLaserContainer = document.getElementById('badge-laser-container');
        const badgeLaserDivider = document.getElementById('badge-laser-divider');
        
        if (resControls) resControls.classList.add('hidden');
        if (resBench) resBench.classList.add('hidden');
        if (physicsHud) physicsHud.classList.remove('hidden');
        if (gauntletBottom) gauntletBottom.classList.remove('hidden');
        if (badgeLaserContainer) badgeLaserContainer.classList.remove('hidden');
        if (badgeLaserDivider) badgeLaserDivider.classList.remove('hidden');
        const resStageBannerHide = document.getElementById('resonator-stage-banner');
        if (resStageBannerHide) resStageBannerHide.classList.add('hidden');
        if (gainMediumGroup) gainMediumGroup.visible = false;
        
        // Gauntlet Mode: Left Hand = Controls & Selector, Right Hand = Wearable Gauntlet & Repulsor
        if (panelLeft) {
            panelLeft.classList.remove('opacity-30');
            panelLeft.classList.add('opacity-100');
        }
        if (panelRight) {
            panelRight.classList.remove('opacity-30');
            panelRight.classList.add('opacity-100');
        }
        if (iconLeft) iconLeft.innerText = '🎯';
        if (iconRight) iconRight.innerText = '🦾';
        if (labelLeft) labelLeft.innerText = 'LEFT HAND: UI CONTROLS';
        if (statusLeft) statusLeft.innerText = isLeftHandPresent ? 'ACTIVE 🎯' : 'SEARCHING...';
        if (labelRight) labelRight.innerText = 'RIGHT HAND: WEARING GAUNTLET';
        if (statusRight) statusRight.innerText = isRightHandPresent ? 'GAUNTLET ATTACHED 🦾' : 'SEARCHING...';
        
        // Repulsor is armed on right hand
        if (badgeLaserIcon) badgeLaserIcon.innerText = isRepulsorFiringEnabled ? '⚡' : '🔒';
        if (badgeLaserText) {
            badgeLaserText.innerText = isRepulsorFiringEnabled ? 'ARMED (PUSH PALM / BACK)' : 'SAFETY LOCKED (DISABLED)';
            badgeLaserText.className = isRepulsorFiringEnabled ? 'text-xs font-hud font-bold text-sky-400' : 'text-xs font-hud font-bold text-rose-400 animate-pulse';
        }
        if (blastWarning) blastWarning.classList.add('hidden');
        
    } else if (mode === 'resonator') {
        if (btnResonator) btnResonator.classList.add('ar-btn-active');
        if (btnGauntlet) btnGauntlet.classList.remove('ar-btn-active');
        
        // Black background for optical resonator mode (pure 3D lab simulation)
        document.body.classList.add('mode-resonator');
        if (cameraVideoEl) cameraVideoEl.classList.add('resonator-blackout');
        if (scene) scene.background = new THREE.Color(0x000000);
        
        // Toggle Gauntlet vs Optical Resonator HUD panels
        const resControls = document.getElementById('resonator-controls-panel');
        const resBench = document.getElementById('resonator-bench-panel');
        const physicsHud = document.getElementById('physics-hud');
        const gauntletBottom = document.getElementById('gauntlet-bottom-row');
        const badgeLaserContainer = document.getElementById('badge-laser-container');
        const badgeLaserDivider = document.getElementById('badge-laser-divider');
        const resStageBanner = document.getElementById('resonator-stage-banner');
        
        if (resControls) resControls.classList.remove('hidden');
        if (resBench) resBench.classList.remove('hidden');
        if (physicsHud) physicsHud.classList.add('hidden');
        if (gauntletBottom) gauntletBottom.classList.add('hidden');
        if (badgeLaserContainer) badgeLaserContainer.classList.add('hidden');
        if (badgeLaserDivider) badgeLaserDivider.classList.add('hidden');
        if (resStageBanner) resStageBanner.classList.remove('hidden');
        
        // Ensure Gain Medium & Quantum Atoms are cleanly visible
        if (gainMediumGroup) gainMediumGroup.visible = true;
        
        // Scale and frame the 3D optical bench apparatus to sit cleanly in center view
        if (resonatorGroup) {
            resonatorGroup.scale.set(0.85, 0.85, 0.85);
            resonatorGroup.position.set(0, 0.25, 0);
        }
        if (camera) {
            camera.position.set(0, 0, 19.5);
        }
        
        // Trigger initial calculations and spectrum rendering (with rAF to ensure layout is measured)
        updateResonatorPhysics();
        requestAnimationFrame(() => {
            updateResonatorPhysics();
        });
        
        if (panelLeft) {
            panelLeft.classList.remove('opacity-30');
            panelLeft.classList.add('opacity-100');
        }
        if (panelRight) {
            panelRight.classList.remove('opacity-30');
            panelRight.classList.add('opacity-100');
        }
        if (iconLeft) iconLeft.innerText = '🔬';
        if (iconRight) iconRight.innerText = '🎯';
        if (labelLeft) labelLeft.innerText = 'LEFT: EXPERIMENT CONTROLS';
        if (statusLeft) statusLeft.innerText = isLeftHandPresent ? 'POINTER ACTIVE 🎯' : 'READY (SLIDERS)';
        if (labelRight) labelRight.innerText = 'RIGHT: OPTICAL BENCH VIEW';
        if (statusRight) statusRight.innerText = isRightHandPresent ? 'POINTER ACTIVE 🎯' : 'READY (SPECTRUM)';
        if (blastWarning) blastWarning.classList.add('hidden');
        
        if (badgeLaserIcon) badgeLaserIcon.innerText = '⚛';
        if (badgeLaserText) {
            badgeLaserText.innerText = 'OPTICAL RESONATOR ACTIVE';
            badgeLaserText.className = 'text-xs font-hud font-bold text-teal-300';
        }
    }
    updateRepulsorSafetyUI();
}

function setRepulsorFiringEnabled(enabled) {
    isRepulsorFiringEnabled = !!enabled;
    updateRepulsorSafetyUI();
}

function updateRepulsorSafetyUI() {
    const btnBlast = document.getElementById('btn-blast');
    const btnToggle = document.getElementById('btn-toggle-blast');
    const labelToggle = document.getElementById('label-toggle-blast');
    const badgeToggleDot = document.getElementById('badge-toggle-dot');
    const badgeLaserText = document.getElementById('badge-laser-text');
    const badgeLaserIcon = document.getElementById('badge-laser-icon');
    const statusRight = document.getElementById('status-right-hand');
    
    if (isRepulsorFiringEnabled) {
        if (btnBlast) {
            btnBlast.classList.remove('ar-btn-disabled', 'opacity-50', 'cursor-not-allowed');
            btnBlast.classList.add('ar-btn-danger');
            btnBlast.innerHTML = '💥 FIRE BLAST';
            btnBlast.title = "Fire Gauntlet Repulsor Blast (Right Palm Thrust / Pinch / Press 'B')";
        }
        if (btnToggle) {
            btnToggle.className = "ar-btn text-xs font-bold px-2.5 py-1.5 text-emerald-300 border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
            btnToggle.title = "Repulsor Firing is ENABLED (Click or Press 'S' to Disable / Safety Lock)";
        }
        if (labelToggle) {
            labelToggle.innerText = "FIRING: ON";
            labelToggle.className = "text-emerald-300";
        }
        if (badgeToggleDot) {
            badgeToggleDot.className = "inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 shadow-[0_0_8px_#34d399]";
        }
        if (badgeLaserIcon) {
            badgeLaserIcon.innerText = '⚡';
        }
        if (badgeLaserText && currentState === 'gauntlet') {
            badgeLaserText.innerText = 'ARMED (PUSH PALM / BACK)';
            badgeLaserText.className = 'text-xs font-hud font-bold text-sky-400';
        }
        if (statusRight && isRightHandPresent) {
            statusRight.innerText = isBlastArmed ? "GAUNTLET ATTACHED 🦾" : "RECHARGING... ⚡";
            statusRight.className = isBlastArmed ? "text-xs font-hud font-bold text-emerald-400" : "text-xs font-hud font-bold text-amber-400";
        }
    } else {
        if (btnBlast) {
            btnBlast.classList.remove('ar-btn-danger');
            btnBlast.classList.add('ar-btn-disabled', 'opacity-50', 'cursor-not-allowed');
            btnBlast.innerHTML = '🔒 BLAST LOCKED';
            btnBlast.title = "Repulsor Blast is DISABLED by Safety Lock (Click toggle or press 'S' to enable)";
        }
        if (btnToggle) {
            btnToggle.className = "ar-btn text-xs font-bold px-2.5 py-1.5 text-rose-300 border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
            btnToggle.title = "Repulsor Firing is DISABLED (Click or Press 'S' to Enable)";
        }
        if (labelToggle) {
            labelToggle.innerText = "FIRING: OFF";
            labelToggle.className = "text-rose-300";
        }
        if (badgeToggleDot) {
            badgeToggleDot.className = "inline-block w-2 h-2 rounded-full bg-rose-500 mr-1 shadow-[0_0_8px_#f43f5e]";
        }
        if (badgeLaserIcon) {
            badgeLaserIcon.innerText = '🔒';
        }
        if (badgeLaserText && currentState === 'gauntlet') {
            badgeLaserText.innerText = 'SAFETY LOCKED (DISABLED)';
            badgeLaserText.className = 'text-xs font-hud font-bold text-rose-400 animate-pulse';
        }
        if (statusRight && isRightHandPresent) {
            statusRight.innerText = "WEARING (BLAST DISABLED) 🔒";
            statusRight.className = "text-xs font-hud font-bold text-slate-400";
        }
    }
}

// ==========================================
// INTERACTIVE UI BUTTONS (AIR & MOUSE CLICKABLE)
// ==========================================
function setupUIListeners() {
    const btnGauntlet = document.getElementById('btn-mode-gauntlet');
    const btnResonator = document.getElementById('btn-mode-resonator');
    const btnExplode = document.getElementById('btn-explode');
    const btnPump = document.getElementById('btn-pump-up');
    const btnSeed = document.getElementById('btn-seed');
    const btnBlast = document.getElementById('btn-blast');
    const btnReset = document.getElementById('btn-reset');
    const btnSwap = document.getElementById('btn-swap-hands');
    const btnCamActivate = document.getElementById('btn-activate-camera');
    const camIndicator = document.getElementById('cam-indicator');
    
    const camSelect = document.getElementById('cam-select');
    
    if (camSelect) {
        camSelect.addEventListener('change', (e) => {
            initAudioContext();
            initFullscreenCamera(e.target.value);
        });
    }
    
    if (btnCamActivate) {
        btnCamActivate.addEventListener('click', () => {
            initAudioContext();
            initFullscreenCamera();
        });
    }
    
    if (camIndicator) {
        camIndicator.addEventListener('click', () => {
            initAudioContext();
            initFullscreenCamera();
        });
    }
    
    // Set initial mode UI
    updateModeUI('gauntlet');

    // ==========================================
    // OPTICAL RESONATOR LAB EVENT LISTENERS
    // ==========================================
    const sliderLength = document.getElementById('slider-length');
    if (sliderLength) {
        sliderLength.addEventListener('input', (e) => {
            resonatorState.cavityLength = parseFloat(e.target.value);
            updateResonatorPhysics();
        });
    }

    const sliderWavelength = document.getElementById('slider-wavelength');
    if (sliderWavelength) {
        sliderWavelength.addEventListener('input', (e) => {
            resonatorState.wavelength = parseFloat(e.target.value);
            updateResonatorPhysics();
        });
    }

    const sliderReflectivity = document.getElementById('slider-reflectivity');
    if (sliderReflectivity) {
        sliderReflectivity.addEventListener('input', (e) => {
            resonatorState.reflectivity = parseFloat(e.target.value) / 100.0;
            updateResonatorPhysics();
        });
    }

    const btnTuneRes = document.getElementById('btn-tune-resonance');
    if (btnTuneRes) {
        btnTuneRes.addEventListener('click', () => {
            initAudioContext();
            const targetM = Math.max(1, Math.round(resonatorState.m));
            const newL = (targetM * resonatorState.wavelength) / (2000.0 * resonatorState.refractiveIndex);
            const clampedL = Math.max(2.0, Math.min(10.0, newL));
            resonatorState.cavityLength = clampedL;
            if (sliderLength) sliderLength.value = clampedL.toFixed(3);
            updateResonatorPhysics();
            playResonanceChime();
            showNotification(`TUNED TO NEAREST RESONANCE // MODE m = ${targetM} (L = ${clampedL.toFixed(3)} µm) ✨`);
        });
    }

    const btnResPause = document.getElementById('btn-res-pause');
    if (btnResPause) {
        btnResPause.addEventListener('click', () => {
            initAudioContext();
            resonatorState.isPaused = !resonatorState.isPaused;
            btnResPause.innerText = resonatorState.isPaused ? 'Resume' : 'Pause';
            if (resonatorState.isPaused) {
                btnResPause.classList.add('bg-teal-900/70', 'text-teal-300', 'border-teal-400');
            } else {
                btnResPause.classList.remove('bg-teal-900/70', 'text-teal-300', 'border-teal-400');
            }
        });
    }

    const btnResReset = document.getElementById('btn-res-reset');
    if (btnResReset) {
        btnResReset.addEventListener('click', () => {
            initAudioContext();
            resonatorState.cavityLength = 4.826;
            resonatorState.wavelength = 743.6;
            resonatorState.reflectivity = 0.37;
            resonatorState.isPaused = false;
            laserCavityCharge.level = 0.0;
            laserCavityCharge.isFullyCharged = false;
            laserCavityCharge.hasPrompted = false;
            const promptEl = document.getElementById('laser-fire-prompt');
            if (promptEl) promptEl.classList.add('hidden');
            if (sliderLength) sliderLength.value = '4.826';
            if (sliderWavelength) sliderWavelength.value = '743.6';
            if (sliderReflectivity) sliderReflectivity.value = '37';
            if (btnResPause) {
                btnResPause.innerText = 'Pause';
                btnResPause.classList.remove('bg-teal-900/70', 'text-teal-300', 'border-teal-400');
            }

            // Reset Gain Medium and Atoms to Ground State E1
            if (gainMediumAtoms && gainMediumAtoms.length > 0) {
                gainMediumAtoms.forEach(a => a.setExcited(false, false));
            }
            if (cavityPhotons) {
                cavityPhotons.forEach(p => { p.active = false; p.mesh.visible = false; });
            }
            if (pumpParticles) {
                pumpParticles.forEach(p => { p.active = false; p.mesh.visible = false; });
            }
            laserDynamics.stage = 'pumping';
            laserDynamics.stageTimer = 0.0;
            laserDynamics.stimulatedEvents = 0;
            laserDynamics.outputLaserActive = false;
            laserDynamics.timeScale = 1.0;
            setLaserStageUI('1. OPTICAL PUMPING', '⚡ Pumping energy particles into gain medium (E₁ → E₂)', 'text-teal-300');

            updateResonatorPhysics();
            showNotification('OPTICAL RESONATOR RESET (L = 4.826 µm, λ = 743.6 nm, R = 37%)');
        });
    }

    // Laser Fire Button Handlers
    const btnFireBlast = document.getElementById('btn-fire-laser-blast');
    if (btnFireBlast) {
        btnFireBlast.addEventListener('click', () => {
            fireOpticalLaserBlast();
        });
    }

    const btnFireManual = document.getElementById('btn-fire-laser-manual');
    if (btnFireManual) {
        btnFireManual.addEventListener('click', () => {
            fireOpticalLaserBlast();
        });
    }

    // STIMULATED EMISSION & GAIN MEDIUM INTERACTIVE BUTTONS
    const btnPumpMedium = document.getElementById('btn-pump-medium');
    if (btnPumpMedium) {
        btnPumpMedium.addEventListener('click', () => {
            initAudioContext();
            playPumpBurstSound();
            for (let i = 0; i < 8; i++) {
                setTimeout(() => spawnPumpParticle(), i * 45);
            }
            showNotification("⚡ PUMPING ENERGY: Photons injected into Gain Medium → Exciting Atoms (E₁ → E₂)");
            setLaserStageUI('1. OPTICAL PUMPING', '⚡ Energy pumped into medium: Atoms absorbing & exciting (E₁ → E₂)', 'text-amber-300');
        });
    }

    const btnSeedPhoton = document.getElementById('btn-seed-photon');
    if (btnSeedPhoton) {
        btnSeedPhoton.addEventListener('click', () => {
            initAudioContext();
            injectSeedPhoton();
            playSeedPhotonSound();
            showNotification("✨ SEED PHOTON INJECTED // Initiating Stimulated Emission Cascade");
            setLaserStageUI('2. SEED PHOTON', '✨ Incident photon enters excited gain medium', 'text-sky-300');
        });
    }

    const btnDemoStimulated = document.getElementById('btn-demo-stimulated');
    if (btnDemoStimulated) {
        btnDemoStimulated.addEventListener('click', () => {
            startStimulatedDemo();
        });
    }

    const btnAutoLaserCycle = document.getElementById('btn-auto-laser-cycle');
    const autoCycleStatus = document.getElementById('auto-cycle-status');
    if (btnAutoLaserCycle) {
        btnAutoLaserCycle.addEventListener('click', () => {
            initAudioContext();
            laserDynamics.autoCycle = !laserDynamics.autoCycle;
            if (autoCycleStatus) autoCycleStatus.innerText = laserDynamics.autoCycle ? 'AUTO' : 'MANUAL';
            showNotification(laserDynamics.autoCycle
                ? "🔄 CONTINUOUS LASER CYCLE ENGAGED (Pumping → Emission → Laser Beam)"
                : "⏸ MANUAL CONTROL MODE ENGAGED (Use buttons to trigger steps)"
            );
        });
    }

    // Keyboard Shortcuts for Laser Firing ('Space' or 'F')
    window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.code === 'Space' || e.key === 'f' || e.key === 'F') {
            if (currentState === 'resonator') {
                e.preventDefault();
                fireOpticalLaserBlast();
            }
        }
    });

    const btnToggleOverlay = document.getElementById('btn-toggle-field-overlay');
    const fieldOverlayContainer = document.getElementById('field-overlay-container');
    const btnOverlayText = document.getElementById('btn-overlay-text');
    if (btnToggleOverlay) {
        btnToggleOverlay.addEventListener('click', () => {
            initAudioContext();
            resonatorState.showFieldOverlay = !resonatorState.showFieldOverlay;
            if (fieldOverlayContainer) {
                if (resonatorState.showFieldOverlay) {
                    fieldOverlayContainer.classList.remove('hidden');
                    if (btnOverlayText) btnOverlayText.innerText = 'Hide field overlay';
                    btnToggleOverlay.classList.add('bg-teal-950', 'text-teal-300', 'border-teal-500');
                    drawFieldOverlay();
                } else {
                    fieldOverlayContainer.classList.add('hidden');
                    if (btnOverlayText) btnOverlayText.innerText = 'Show field overlay';
                    btnToggleOverlay.classList.remove('bg-teal-950', 'text-teal-300', 'border-teal-500');
                }
            }
        });
    }

    // Panel Minimize / Expand Controls
    const btnMinControls = document.getElementById('btn-minimize-controls');
    const controlsBody = document.getElementById('resonator-controls-body');
    if (btnMinControls && controlsBody) {
        btnMinControls.addEventListener('click', () => {
            const isHidden = controlsBody.classList.toggle('hidden');
            btnMinControls.innerText = isHidden ? '+' : '_';
        });
    }

    const btnMinBench = document.getElementById('btn-minimize-bench');
    const benchBody = document.getElementById('resonator-bench-body');
    if (btnMinBench && benchBody) {
        btnMinBench.addEventListener('click', () => {
            const isHidden = benchBody.classList.toggle('hidden');
            btnMinBench.innerText = isHidden ? '+' : '_';
            if (!isHidden) {
                drawTransmissionSpectrum();
                if (resonatorState.showFieldOverlay) drawFieldOverlay();
            }
        });
    }

    // Make Resonator Bench Panel Draggable by its Header
    const benchPanel = document.getElementById('resonator-bench-panel');
    const benchHeader = document.getElementById('bench-header-handle');
    if (benchPanel && benchHeader) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initLeft = 0, initTop = 0;
        benchHeader.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button') || e.target.closest('.ar-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const r = benchPanel.getBoundingClientRect();
            initLeft = r.left;
            initTop = r.top;
            benchPanel.style.bottom = 'auto';
            benchPanel.style.right = 'auto';
            benchPanel.style.left = `${initLeft}px`;
            benchPanel.style.top = `${initTop}px`;
        });
        window.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const maxL = Math.max(10, window.innerWidth - benchPanel.offsetWidth - 10);
            const maxT = Math.max(10, window.innerHeight - benchPanel.offsetHeight - 10);
            benchPanel.style.left = `${Math.max(10, Math.min(maxL, initLeft + dx))}px`;
            benchPanel.style.top = `${Math.max(10, Math.min(maxT, initTop + dy))}px`;
        });
        window.addEventListener('pointerup', () => {
            isDragging = false;
        });
    }

    // Expand / Collapse Spectrum Graph Button
    const btnExpandSpec = document.getElementById('btn-expand-spectrum');
    const specContainer = document.getElementById('spectrum-canvas-container');
    const labelExpandSpec = document.getElementById('label-expand-spectrum');
    if (btnExpandSpec && specContainer) {
        btnExpandSpec.addEventListener('click', () => {
            initAudioContext();
            const isExpanded = specContainer.classList.toggle('expanded-spectrum');
            if (labelExpandSpec) labelExpandSpec.innerText = isExpanded ? 'COLLAPSE' : 'EXPAND';
            drawTransmissionSpectrum();
            playResonanceChime();
        });
    }

    const specCanvas = document.getElementById('spectrum-canvas');
    if (specCanvas) {
        let isDraggingSpec = false;
        const handleSpecPointer = (e) => {
            const rect = specCanvas.getBoundingClientRect();
            const padL = 46;
            const padR = 36;
            const plotW = Math.max(10, rect.width - padL - padR);
            const clickX = e.clientX - rect.left - padL;
            const ratio = Math.max(0, Math.min(1, clickX / plotW));
            const newLambda = 400.0 + ratio * 400.0;
            resonatorState.wavelength = Math.round(newLambda * 10) / 10;
            if (sliderWavelength) sliderWavelength.value = resonatorState.wavelength.toFixed(1);
            updateResonatorPhysics();
        };
        specCanvas.addEventListener('pointerdown', (e) => {
            initAudioContext();
            isDraggingSpec = true;
            handleSpecPointer(e);
        });
        window.addEventListener('pointermove', (e) => {
            if (isDraggingSpec) handleSpecPointer(e);
        });
        window.addEventListener('pointerup', () => {
            isDraggingSpec = false;
        });
    }

    // Audio Context unlock on initial user gesture
    const unlockAudio = () => {
        initAudioContext();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    // Mouse pointer fallback (allows cursor interaction without camera)
    window.addEventListener('mousemove', (e) => {
        if (!isLeftHandPresent && !isRightHandPresent) {
            activeCursorPos.x = e.clientX;
            activeCursorPos.y = e.clientY;
        }
    });

    // Global 3D Interaction click handler (reliable across canvas pointer-events overlays)
    window.addEventListener('pointerdown', (e) => {
        initAudioContext();
        // Ignore if clicking directly on interactive HUD button or dropdown
        if (e.target && (e.target.closest('.ar-btn') || e.target.closest('select') || e.target.closest('button'))) {
            return;
        }
        const hit3D = check3DInteraction(e.clientX, e.clientY);
        if (hit3D) {
            trigger3DClick(hit3D);
        }
    });

    if (btnSwap) {
        btnSwap.addEventListener('click', () => {
            initAudioContext();
            isHandsSwapped = !isHandsSwapped;
            gauntletHand = isHandsSwapped ? 'LEFT' : 'RIGHT';
            ironManHand = isHandsSwapped ? 'LEFT' : 'RIGHT';
            updateModeUI(currentState);
            showNotification(isHandsSwapped ? "HANDS SWAPPED: GAUNTLET ON LEFT HAND" : "DEFAULT: GAUNTLET ON RIGHT HAND");
        });
    }

    const btnDwell = document.getElementById('btn-dwell-delay');
    function updateDwellUI() {
        if (btnDwell) {
            btnDwell.innerText = `⏱️ DELAY: ${(DWELL_DURATION / 1000).toFixed(1)}s`;
            btnDwell.title = `Selector Dwell Auto-Click Delay: ${(DWELL_DURATION / 1000).toFixed(1)}s (Click or press 'D' to cycle)`;
        }
    }
    updateDwellUI();

    if (btnDwell) {
        btnDwell.addEventListener('click', () => {
            initAudioContext();
            const currIdx = DWELL_OPTIONS.indexOf(DWELL_DURATION);
            const nextIdx = (currIdx + 1) % DWELL_OPTIONS.length;
            DWELL_DURATION = DWELL_OPTIONS[nextIdx];
            localStorage.setItem('repulsor_dwell_duration', DWELL_DURATION);
            updateDwellUI();
            showNotification(`⏱️ SELECTOR DELAY SET TO ${(DWELL_DURATION / 1000).toFixed(1)}s`);
        });
    }

    if (btnGauntlet) {
        btnGauntlet.addEventListener('click', () => {
            initAudioContext();
            if (currentState !== 'gauntlet') {
                zoomOutOfResonator();
                updateModeUI('gauntlet');
                showNotification(`MODE: GAUNTLET (WEARING ON RIGHT HAND // UI ON LEFT HAND)`);
            }
        });
    }
    
    if (btnResonator) {
        btnResonator.addEventListener('click', () => {
            initAudioContext();
            if (currentState !== 'resonator') {
                zoomIntoResonator();
                updateModeUI('resonator');
                showNotification(`MODE: OPTICAL RESONATOR (LASER CAVITY SIMULATION)`);
            }
        });
    }
    
    function toggleExplodedView(forceState) {
        initAudioContext();
        isExplodedView = (typeof forceState === 'boolean') ? forceState : !isExplodedView;
        
        currentExplodedHandType = null;
        lastExplodedHandSwitchTime = 0;
        activeCursorPos.x = -100;
        activeCursorPos.y = -100;
        
        const lbl = document.getElementById('label-explode');
        const promptEl = document.getElementById('exploded-view-prompt');
        const headerEl = document.getElementById('exploded-schematic-header');
        const stagesEl = document.getElementById('exploded-schematic-stages');
        const labelRightEl = document.getElementById('label-right-hand');
        const labelLeftEl = document.getElementById('label-left-hand');
        const einsteinDetails = document.getElementById('einstein-panel-details');
        const btnToggleEinstein = document.getElementById('btn-toggle-einstein');
        
        playExplodeServoSound(isExplodedView);

        if (isExplodedView) {
            if (lbl) lbl.innerText = 'ASSEMBLE ARMOUR';
            if (btnExplode) btnExplode.classList.add('ar-btn-active');
            if (promptEl) promptEl.classList.remove('hidden');
            if (headerEl) headerEl.classList.remove('hidden');
            if (stagesEl) stagesEl.classList.remove('hidden');
            if (labelRightEl) labelRightEl.innerText = "RIGHT HAND: UI CONTROLS";
            if (labelLeftEl) labelLeftEl.innerText = "LEFT HAND: UI CONTROLS";
            // Auto-collapse Einstein details to ensure Stage 1 card is completely unobstructed
            if (einsteinDetails) einsteinDetails.classList.add('hidden');
            if (btnToggleEinstein) {
                btnToggleEinstein.innerText = '+ EXPAND';
                btnToggleEinstein.title = 'Expand Einstein Dynamics Detail';
            }
            showNotification("⚡ EXPLODED VIEW ENGAGED // 5 RESONATOR STAGES REVEALED");
        } else {
            if (lbl) lbl.innerText = 'EXPLODE ARMOUR';
            if (btnExplode) btnExplode.classList.remove('ar-btn-active');
            if (promptEl) promptEl.classList.add('hidden');
            if (headerEl) headerEl.classList.add('hidden');
            if (stagesEl) stagesEl.classList.add('hidden');
            if (labelRightEl) labelRightEl.innerText = 'RIGHT HAND: WEARING GAUNTLET';
            if (labelLeftEl) labelLeftEl.innerText = 'LEFT HAND: UI CONTROLS';
            // Restore Einstein details when assembled
            if (einsteinDetails) einsteinDetails.classList.remove('hidden');
            if (btnToggleEinstein) {
                btnToggleEinstein.innerText = '— MIN';
                btnToggleEinstein.title = 'Minimize Einstein Dynamics Detail';
            }
            if (!isLeftHandPresent && arCursorEl) {
                arCursorEl.style.display = 'none';
                clearHoverState();
                dwellTarget = null;
            }
            showNotification("🛡️ MARK VII ARMOUR REASSEMBLED // COMBAT PROFILE LOCKED");
        }
    }

    if (btnExplode) {
        btnExplode.addEventListener('click', () => {
            toggleExplodedView();
        });
    }

    // Modal Action Buttons in Middle-Left Prompt
    const btnPromptEnterRes = document.getElementById('btn-prompt-enter-resonator');
    if (btnPromptEnterRes) {
        btnPromptEnterRes.addEventListener('click', () => {
            initAudioContext();
            toggleExplodedView(false);
            if (currentState !== 'resonator') {
                zoomIntoResonator();
                updateModeUI('resonator');
                showNotification(`MODE: OPTICAL RESONATOR (LASER CAVITY SIMULATION)`);
            }
        });
    }

    const btnPromptAssemble = document.getElementById('btn-prompt-assemble-armour');
    if (btnPromptAssemble) {
        btnPromptAssemble.addEventListener('click', () => {
            toggleExplodedView(false);
        });
    }

    // Einstein Rate Equation Minimization Toggle Button
    const btnToggleEinstein = document.getElementById('btn-toggle-einstein');
    if (btnToggleEinstein) {
        btnToggleEinstein.addEventListener('click', () => {
            initAudioContext();
            const details = document.getElementById('einstein-panel-details');
            if (details) {
                const isHidden = details.classList.toggle('hidden');
                btnToggleEinstein.innerText = isHidden ? '+ EXPAND' : '— MIN';
                btnToggleEinstein.title = isHidden ? 'Expand Einstein Dynamics Detail' : 'Minimize Einstein Dynamics Detail';
            }
        });
    }

    // Technical Schematic Stage Cards Interaction via Pointer or Mouse
    const cardStage1 = document.getElementById('stage-card-1');
    if (cardStage1) {
        cardStage1.addEventListener('click', () => {
            initAudioContext();
            if (btnPump) btnPump.click();
            showNotification("⚡ STAGE 1 (PUMP POWER): Arc Reactor Pumping Cycled");
        });
    }
    const cardStage2 = document.getElementById('stage-card-2');
    if (cardStage2) {
        cardStage2.addEventListener('click', () => {
            initAudioContext();
            if (btnSeed) btnSeed.click();
            showNotification("⚛ STAGE 2 (ACTIVE MEDIUM): Seed Photon Injected");
        });
    }
    const cardStage3 = document.getElementById('stage-card-3');
    if (cardStage3) {
        cardStage3.addEventListener('click', () => {
            initAudioContext();
            playResonanceChime();
            showNotification("🪞 STAGE 3 (REAR EMITTER): 100% Reflective Mirror Verified");
        });
    }
    const cardStage4 = document.getElementById('stage-card-4');
    if (cardStage4) {
        cardStage4.addEventListener('click', () => {
            initAudioContext();
            playResonanceChime();
            showNotification("🔆 STAGE 4 (PALM APERTURE): Output Coupler (R=0.90) Aligned");
        });
    }
    const cardStage5 = document.getElementById('stage-card-5');
    if (cardStage5) {
        cardStage5.addEventListener('click', () => {
            initAudioContext();
            playPinchClickSound();
            showNotification("💥 STAGE 5 (COHERENT BEAM): Stimulated Emission Wavefront Active");
        });
    }
    
    if (btnPump) {
        btnPump.addEventListener('click', () => {
            initAudioContext();
            pumpIndex = (pumpIndex + 1) % pumpSteps.length;
            simInput.temperature = pumpSteps[pumpIndex];
            const lbl = document.getElementById('label-pump');
            if (lbl) lbl.innerText = `PUMP POWER: ${simInput.temperature.toFixed(2)}`;
        });
    }
    
    if (btnSeed) {
        btnSeed.addEventListener('click', () => {
            initAudioContext();
            simInput.trigger_photon = true;
            playSeedPhotonSound();
        });
    }
    
    const btnToggleBlast = document.getElementById('btn-toggle-blast');
    if (btnToggleBlast) {
        btnToggleBlast.addEventListener('click', () => {
            initAudioContext();
            setRepulsorFiringEnabled(!isRepulsorFiringEnabled);
            playSafetyToggleSound(isRepulsorFiringEnabled);
            showNotification(isRepulsorFiringEnabled
                ? "⚡ REPULSOR FIRING ENABLED // WEAPONS ONLINE"
                : "🔒 REPULSOR FIRING DISABLED // SAFETY INTERLOCK ENGAGED"
            );
        });
    }

    if (btnBlast) {
        btnBlast.addEventListener('click', () => {
            initAudioContext();
            if (!isRepulsorFiringEnabled) {
                showNotification("⚠️ REPULSOR BLAST LOCKED // SAFETY INTERLOCK ENGAGED");
                playLockoutSound();
                return;
            }
            triggerBlastEffect();
        });
    }
    
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            initAudioContext();
            toggleExplodedView(false);
            pumpIndex = 0;
            simInput.explode_ratio = 0;
            simInput.temperature = 0;
            physics.photons = 0;
            physics.N2 = 0;
            physics.N1 = physics.N_total;
            const lblExp = document.getElementById('label-explode');
            const lblPmp = document.getElementById('label-pump');
            if (lblExp) lblExp.innerText = 'EXPLODE ARMOUR';
            if (lblPmp) lblPmp.innerText = 'PUMP POWER: 0.00';
            if (currentState === 'resonator') {
                zoomOutOfResonator();
                updateModeUI('gauntlet');
            }
        });
    }
    
    window.addEventListener('keydown', (e) => {
        initAudioContext();
        if (e.code === 'Space') {
            e.preventDefault();
            if (currentState === 'gauntlet') btnResonator.click();
            else btnGauntlet.click();
        } else if (e.key === 'p' || e.key === 'P') {
            btnSeed.click();
        } else if (e.key === 'b' || e.key === 'B') {
            if (!isRepulsorFiringEnabled) {
                showNotification("⚠️ REPULSOR BLAST LOCKED // SAFETY INTERLOCK ENGAGED");
                playLockoutSound();
                return;
            }
            btnBlast.click();
        } else if (e.key === 's' || e.key === 'S') {
            if (btnToggleBlast) btnToggleBlast.click();
        } else if (e.key === 'e' || e.key === 'E') {
            toggleExplodedView();
        } else if (e.key === 'r' || e.key === 'R') {
            if (currentState === 'gauntlet') {
                toggleExplodedView(false);
                btnResonator.click();
            } else {
                btnGauntlet.click();
            }
        } else if (e.key === 'd' || e.key === 'D') {
            if (btnDwell) btnDwell.click();
        }
    });
}

function fireOpticalLaserBlast() {
    initAudioContext();
    playBlastSound();

    const promptEl = document.getElementById('laser-fire-prompt');
    if (promptEl) promptEl.classList.add('hidden');

    opticalBlastLife = 1.0;
    if (opticalBlastGroup) {
        opticalBlastGroup.visible = true;
        if (opticalBlastAura) opticalBlastAura.material.color.setHex(resonatorState.spectralColorHex);
        opticalBlastRings.forEach((r, idx) => {
            r.material.color.setHex(resonatorState.spectralColorHex);
            r.scale.set(1, 1, 1);
            r.position.x = 8.0 + idx * 4.5;
        });
    }

    // Surge photodetector sensor emission on energy absorption
    if (resDetectorHousing && resDetectorHousing.children[1]) {
        const sensor = resDetectorHousing.children[1];
        if (sensor.material) {
            sensor.material.emissive = new THREE.Color(resonatorState.spectralColorHex);
            sensor.material.emissiveIntensity = 8.0;
        }
    }

    // Accelerate and burst all active charges forward with the blast
    activeLaserCharges.forEach(ch => {
        ch.vx = Math.abs(ch.vx) * 3.8;
    });

    showNotification("💥 HIGH-POWER LASER BLAST DISCHARGED // 1.21 GW PULSE COMPLETED!");

    // Deplete cavity energy storage to 0% and enter post-blast cooldown before recharging
    laserCavityCharge.level = 0.0;
    laserCavityCharge.isFullyCharged = false;
    laserCavityCharge.hasPrompted = false;
    laserCavityCharge.postBlastCooldown = 1.6;

    const barCharge = document.getElementById('bar-laser-charge');
    const valCharge = document.getElementById('res-val-charge-pct');
    const statusCharge = document.getElementById('res-charge-status');
    if (barCharge) barCharge.style.width = '0%';
    if (valCharge) valCharge.innerText = '0%';
    if (statusCharge) {
        statusCharge.innerText = 'DISCHARGED 💥';
        statusCharge.className = 'text-rose-400 font-bold truncate';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// SCENE TRANSITIONS
// ==========================================
function zoomIntoResonator() {
    if (isTransitioning || currentState === 'resonator') return;
    isTransitioning = true;
    
    // Fade out camera feed to solid black
    if (cameraVideoEl) cameraVideoEl.classList.add('resonator-blackout');
    document.body.classList.add('mode-resonator');
    
    const startZ = camera.position.z;
    const targetZ = 1.0;
    const startTime = performance.now();
    const duration = 850;
    
    function step() {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1.0, elapsed / duration);
        const ease = p * p * (3 - 2 * p);
        
        camera.position.z = startZ - (startZ - targetZ) * ease;
        
        if (p < 1.0) {
            requestAnimationFrame(step);
        } else {
            currentState = 'resonator';
            gauntletGroup.visible = false;
            pedestalGroup.visible = false;
            resonatorGroup.visible = true;
            if (particlesGroup) particlesGroup.visible = false;
            resonatorGroup.scale.set(0.85, 0.85, 0.85);
            resonatorGroup.position.set(0, 0.25, 0);
            camera.position.set(0, 0, 19.5);
            if (scene) scene.background = new THREE.Color(0x000000);
            isTransitioning = false;
            updateModeUI('resonator');
        }
    }
    requestAnimationFrame(step);
}

function zoomOutOfResonator() {
    if (isTransitioning || currentState === 'gauntlet') return;
    isTransitioning = true;
    
    // Restore AR video feed
    if (scene) scene.background = null;
    if (cameraVideoEl) cameraVideoEl.classList.remove('resonator-blackout');
    document.body.classList.remove('mode-resonator');
    
    const startZ = camera.position.z;
    const targetZ = 11.5; // Smooth transition directly to gauntlet camera position with zero jump-cut
    const startTime = performance.now();
    const duration = 800;
    
    pedestalGroup.visible = true;
    gauntletGroup.visible = true;
    
    function step() {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1.0, elapsed / duration);
        const ease = p * p * (3 - 2 * p);
        
        camera.position.z = startZ + (targetZ - startZ) * ease;
        
        if (p < 1.0) {
            requestAnimationFrame(step);
        } else {
            currentState = 'gauntlet';
            resonatorGroup.visible = false;
            if (particlesGroup) particlesGroup.visible = true;
            resonatorGroup.scale.set(1.0, 1.0, 1.0);
            resonatorGroup.position.set(0, 0, 0);
            camera.position.set(0, 0, 11.5);
            isTransitioning = false;
            updateModeUI('gauntlet');
        }
    }
    requestAnimationFrame(step);
}

// ==========================================
// REPULSOR BLAST EFFECT
// ==========================================
function triggerBlastEffect() {
    // HARD MASTER INTERLOCK: ABSOLUTELY CANNOT FIRE NO MATTER WHAT WHEN DISABLED
    if (!isRepulsorFiringEnabled) {
        showNotification("⚠️ REPULSOR BLAST LOCKED // SAFETY INTERLOCK ENGAGED");
        playLockoutSound();
        return;
    }
    playBlastSound();
    showNotification("💥 REPULSOR BLAST FIRED! // MAXIMUM DISCHARGE");
    
    try {
        if (!blastEffectGroup) {
            blastEffectGroup = new THREE.Group();
            
            // Repulsor beam along local +Z (emerging directly from palm repulsor)
            const beamGeo = new THREE.CylinderGeometry(0.55, 1.4, 28, 24);
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.name = 'blastBeamCore';
            beam.rotation.x = Math.PI / 2; // Point forward along local +Z!
            beam.position.z = 14;
            blastEffectGroup.add(beam);
            
            // Outer electric cyan plasma halo cylinder
            const auraGeo = new THREE.CylinderGeometry(1.2, 2.8, 28, 24);
            const auraMat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending
            });
            const aura = new THREE.Mesh(auraGeo, auraMat);
            aura.name = 'blastBeamAura';
            aura.rotation.x = Math.PI / 2;
            aura.position.z = 14;
            blastEffectGroup.add(aura);
            
            // 4 Expanding shockwave rings around palm repulsor
            for (let i = 0; i < 4; i++) {
                const shockGeo = new THREE.RingGeometry(0.8, 2.4, 32);
                const shockMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.95,
                    blending: THREE.AdditiveBlending
                });
                const ring = new THREE.Mesh(shockGeo, shockMat);
                ring.name = 'shockwaveRing_' + i;
                ring.position.z = 1.0 + (i * 2.2);
                ring.userData = { initialScale: 0.6 + (i * 0.35) };
                blastEffectGroup.add(ring);
                shockwaves.push(ring);
            }
            
            scene.add(blastEffectGroup);
        }
        
        // Ensure pure electric cyan/white repulsor colors
        const aura = blastEffectGroup.getObjectByName('blastBeamAura');
        if (aura && aura.material) {
            aura.material.color.setHex(0x00f0ff);
        }
        shockwaves.forEach(ring => {
            if (ring.material) {
                ring.material.color.setHex(0x38bdf8);
            }
        });
        
        // Position blast directly at gauntlet's palm repulsor and align with palm normal
        if (gauntletGroup) {
            const palmOffset = new THREE.Vector3(0, 0, 0.14).applyQuaternion(gauntletGroup.quaternion);
            blastEffectGroup.position.copy(gauntletGroup.position).add(palmOffset);
            // Follow gauntlet quaternion so it fires out of the palm repulsor!
            // When palm faces camera: fires forward towards camera.
            // When palm faces user's face: fires back towards user's face!
            blastEffectGroup.quaternion.copy(gauntletGroup.quaternion);
        }
        
        blastEffectGroup.userData = { life: 1.0 };
        blastEffectGroup.visible = true;
        
        // Flash palm repulsor Arc Core and Palm Light
        if (arcCore) {
            arcCore.material.emissiveIntensity = 24.0;
        }
        if (palmLight) {
            palmLight.intensity = 28.0;
        }
        if (innerTurbineMesh) {
            innerTurbineMesh.rotation.z -= 0.65;
        }
        if (arcHalo) {
            arcHalo.scale.set(1.5, 1.5, 1.5);
        }
        if (innerHaloReticle) {
            innerHaloReticle.scale.set(1.5, 1.5, 1.5);
        }
        
        if (gauntletFingers && gauntletFingers.length > 0) {
            gauntletFingers.forEach(f => {
                if (f.prox) f.prox.rotation.x = -0.25;
                else f.group.rotation.x = -0.25;
            });
        }
    } catch (e) {
        console.warn("[triggerBlastEffect error]:", e);
    }
}

// ==========================================
// OPTICAL RESONATOR GAIN MEDIUM & STIMULATED EMISSION CORE
// ==========================================
function spawnPumpParticle() {
    if (!gainMediumAtoms || gainMediumAtoms.length === 0) return;
    const unexcited = gainMediumAtoms.filter(a => a.state === 'E1');
    if (unexcited.length === 0) return;
    const target = unexcited[Math.floor(Math.random() * unexcited.length)];
    
    const p = pumpParticles.find(part => !part.active);
    if (!p) return;
    
    const isTop = Math.random() > 0.5;
    p.active = true;
    p.x = target.baseX + (Math.random() - 0.5) * 0.4;
    p.y = isTop ? 1.6 : -1.6;
    p.z = (Math.random() - 0.5) * 0.4;
    p.targetAtom = target;
    p.speed = 0.25 + Math.random() * 0.12;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.visible = true;

    // Pulse emitter diode
    const emitterList = isTop ? pumpEmittersTop : pumpEmittersBottom;
    if (emitterList && emitterList.length > 0) {
        const d = emitterList[Math.floor(Math.random() * emitterList.length)];
        d.scale.set(1.4, 1.4, 1.4);
        setTimeout(() => d.scale.set(1.0, 1.0, 1.0), 90);
    }
}

function injectSeedPhoton(targetY = 0, targetZ = 0) {
    if (!cavityPhotons || cavityPhotons.length === 0) return;
    const ph = cavityPhotons.find(p => !p.active);
    if (!ph) return;
    ph.active = true;
    ph.x = -4.8;
    ph.y = targetY + (Math.random() - 0.5) * 0.25;
    ph.z = targetZ + (Math.random() - 0.5) * 0.25;
    ph.vx = 0.38;
    ph.phase = Math.random() * Math.PI * 2;
    ph.cooldown = 0.1;
    ph.isTwin = false;
    ph.mesh.position.set(ph.x, ph.y, ph.z);
    ph.mesh.visible = true;
}

function spawnTwinPhoton(x, y, z, vx, phase) {
    if (!cavityPhotons || cavityPhotons.length === 0) return;
    const ph = cavityPhotons.find(p => !p.active);
    if (!ph) return;
    ph.active = true;
    ph.x = x;
    // Parallel spatial micro-offset (twin coherent photon)
    ph.y = y + (Math.random() > 0.5 ? 0.08 : -0.08);
    ph.z = z + (Math.random() > 0.5 ? 0.08 : -0.08);
    ph.vx = vx; // Identical velocity and forward direction!
    ph.phase = phase; // Coherent phase!
    ph.cooldown = 0.18;
    ph.isTwin = true;
    ph.mesh.position.set(ph.x, ph.y, ph.z);
    ph.mesh.visible = true;
}

function setLaserStageUI(title, desc, colorClass, icon = null) {
    const titleEl = document.getElementById('res-stage-title');
    const descEl = document.getElementById('res-stage-desc');
    const stepTag = document.getElementById('laser-cycle-step-tag');
    const iconEl = document.getElementById('res-stage-icon');
    if (titleEl) {
        titleEl.innerText = title;
        titleEl.className = `text-xs font-hud font-bold ${colorClass || 'text-teal-300'}`;
    }
    if (descEl) {
        descEl.innerText = desc;
    }
    if (iconEl && icon) {
        iconEl.innerText = icon;
    }
    if (stepTag) {
        const parts = title.split('.');
        stepTag.innerText = parts[1] ? parts[1].trim() : title;
    }
}

function resetForNextLaserCycle() {
    cavityPhotons.forEach(p => { p.active = false; p.mesh.visible = false; });
    pumpParticles.forEach(p => { p.active = false; p.mesh.visible = false; });
    laserDynamics.outputLaserActive = false;
    laserDynamics.stimulatedEvents = 0;
    laserDynamics.stageTimer = 0.0;
}

function startStimulatedDemo() {
    initAudioContext();
    laserDynamics.mode = 'demo';
    laserDynamics.timeScale = 0.28; // Slow motion for crystal-clear observation!
    laserDynamics.demoTimer = 0.0;
    
    // Clear active particles
    cavityPhotons.forEach(p => { p.active = false; p.mesh.visible = false; });
    pumpParticles.forEach(p => { p.active = false; p.mesh.visible = false; });
    
    // Set all atoms to E1 except 3 aligned along the axis
    gainMediumAtoms.forEach(a => a.setExcited(false, false));
    
    const sorted = [...gainMediumAtoms].sort((a, b) => a.baseX - b.baseX);
    const atom1 = sorted[10] || sorted[0];
    const atom2 = sorted[18] || sorted[1];
    const atom3 = sorted[26] || sorted[2];
    
    atom1.setExcited(true);
    atom2.setExcited(true);
    atom3.setExcited(true);
    
    showNotification("🔬 SLOW-MOTION DEMO: Incident Photon → Stimulated Emission Twin Multiplication!");
    setLaserStageUI("DEMO: INCIDENT SEED PHOTON", "Single photon glides into gain medium towards excited atom E₂", "text-purple-300");
    
    setTimeout(() => {
        const ph = cavityPhotons[0];
        if (ph) {
            ph.active = true;
            ph.x = -4.6;
            ph.y = atom1.baseY;
            ph.z = atom1.baseZ;
            ph.vx = 0.35;
            ph.phase = 0;
            ph.cooldown = 0;
            ph.mesh.position.set(ph.x, ph.y, ph.z);
            ph.mesh.visible = true;
            playSeedPhotonSound();
        }
    }, 450);

    setTimeout(() => {
        laserDynamics.timeScale = 1.0;
        laserDynamics.mode = 'auto';
        showNotification("⚡ STIMULATED EMISSION DEMO COMPLETE // RESUMING CONTINUOUS LASER CYCLE");
        setLaserStageUI("4. LASER EMISSION", "🔴 Coherent light intensifies → Collimated laser beam emitted", "text-rose-400");
    }, 9000);
}

function updateGainMediumAndLaserDynamics(dt, now, halfL, L_3D, m, tPhase) {
    if (!gainMediumGroup || !gainMediumGroup.visible) return;
    
    const timeScale = laserDynamics.timeScale;
    const effectiveDt = dt * timeScale;
    
    // 1. Quantum Atoms inside Gain Medium
    let excitedCount = 0;
    let groundCount = 0;
    
    gainMediumAtoms.forEach((atom) => {
        // Quantum orbital electron rotation
        atom.electronAngle += (atom.state === 'E2' ? 0.22 : 0.07) * timeScale;
        const orbRadius = atom.state === 'E2' ? 0.30 : 0.18;
        atom.electronMesh.position.set(
            Math.cos(atom.electronAngle) * orbRadius,
            Math.sin(atom.electronAngle) * orbRadius,
            0
        );
        
        // Quantum thermal jitter
        atom.group.position.x = atom.baseX + Math.sin(now * 0.005 + atom.phase) * 0.035;
        atom.group.position.y = atom.baseY + Math.cos(now * 0.006 + atom.phase) * 0.035;
        atom.group.position.z = atom.baseZ + Math.sin(now * 0.004 + atom.phase) * 0.035;
        
        // Halo pulsing for excited atoms (E2)
        if (atom.state === 'E2') {
            excitedCount++;
            const pulse = 0.5 + Math.sin(now * 0.008 + atom.phase) * 0.2;
            atom.haloMat.opacity = pulse;
            atom.coreMat.emissiveIntensity = 2.2 + Math.sin(now * 0.01) * 0.6;
        } else {
            groundCount++;
        }
        
        // Quantum Shockwave flash ring dissipation
        if (atom.flashLife > 0) {
            atom.flashLife -= effectiveDt * 3.8;
            const life = Math.max(0, atom.flashLife);
            atom.flashRing.scale.setScalar(1.0 + (1.0 - life) * 3.2);
            atom.flashMat.opacity = life * 0.9;
        } else {
            atom.flashMat.opacity = 0;
        }
    });

    // 2. Automated Laser Cycle Stages (Pumping -> Seed -> Amplifying -> Lasing)
    if (laserDynamics.mode === 'auto' && laserDynamics.autoCycle && !resonatorState.isPaused) {
        laserDynamics.stageTimer += dt;
        
        if (laserDynamics.stage === 'pumping') {
            laserDynamics.isPumpingActive = true;
            
            // Periodically spawn pump particles targeting E1 atoms
            if (laserDynamics.stageTimer % 0.08 < dt && groundCount > 0) {
                spawnPumpParticle();
            }
            
            // Once majority of atoms are excited (Population Inversion achieved!), transition to SEED
            if (excitedCount >= 28 || laserDynamics.stageTimer > 2.8) {
                laserDynamics.stage = 'seed';
                laserDynamics.stageTimer = 0.0;
                setLaserStageUI('2. SEED PHOTON', '✨ Incident seed photon enters excited medium', 'text-sky-300');
            }
        } else if (laserDynamics.stage === 'seed') {
            injectSeedPhoton();
            playSeedPhotonSound();
            laserDynamics.stage = 'amplifying';
            laserDynamics.stageTimer = 0.0;
            setLaserStageUI('3. STIMULATED EMISSION', '💥 Photon strikes excited atoms → Clones coherent twin photons', 'text-amber-300');
        } else if (laserDynamics.stage === 'amplifying') {
            // Replenish some excited atoms with pump photons
            if (laserDynamics.stageTimer % 0.22 < dt && groundCount > 4) {
                spawnPumpParticle();
            }
            
            const activePhCount = cavityPhotons.filter(p => p.active).length;
            // When photons multiply into an avalanche, transition to sustained LASING
            if (activePhCount >= 22 || laserDynamics.stageTimer > 3.2) {
                laserDynamics.stage = 'lasing';
                laserDynamics.stageTimer = 0.0;
                laserDynamics.outputLaserActive = true;
                playResonanceChime();
                setLaserStageUI('4. LASER EMISSION', '🔴 Amplified light intensifies → Collimated laser beam emitted', 'text-rose-400');
            }
        } else if (laserDynamics.stage === 'lasing') {
            laserDynamics.outputLaserActive = true;
            // Sustained laser beam for 4.5 seconds, then loop back to pumping
            if (laserDynamics.stageTimer > 4.5) {
                laserDynamics.stage = 'pumping';
                laserDynamics.stageTimer = 0.0;
                laserDynamics.outputLaserActive = false;
                resetForNextLaserCycle();
                setLaserStageUI('1. OPTICAL PUMPING', '⚡ Pumping energy particles into gain medium (E₁ → E₂)', 'text-teal-300');
            }
        }
    }

    // 3. Update Pump Particles (Travel from flashlamps into gain medium)
    pumpParticles.forEach(p => {
        if (!p.active) return;
        
        if (p.targetAtom) {
            const dx = p.targetAtom.group.position.x - p.x;
            const dy = p.targetAtom.group.position.y - p.y;
            const dz = p.targetAtom.group.position.z - p.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist < 0.28) {
                // Collided with atom: Absorption E1 -> E2!
                p.active = false;
                p.mesh.visible = false;
                if (p.targetAtom.state === 'E1') {
                    p.targetAtom.setExcited(true);
                }
            } else {
                const moveDist = p.speed * timeScale;
                p.x += (dx / dist) * moveDist;
                p.y += (dy / dist) * moveDist;
                p.z += (dz / dist) * moveDist;
                p.mesh.position.set(p.x, p.y, p.z);
            }
        } else {
            p.active = false;
            p.mesh.visible = false;
        }
    });

    // 4. Update Intracavity Photons & Detect Stimulated Emission
    let activePhCount = 0;
    const speedScale = 0.40 * timeScale;

    cavityPhotons.forEach(ph => {
        if (!ph.active) return;
        activePhCount++;
        ph.cooldown = Math.max(0, ph.cooldown - effectiveDt);

        // Advance photon along optical axis
        ph.x += ph.vx * speedScale;
        ph.phase += 0.25 * timeScale;

        // Wavelet tail animation
        const posArr = ph.tailLine.geometry.attributes.position.array;
        const tailDir = -Math.sign(ph.vx);
        for (let j = 0; j < 12; j++) {
            const u = j / 11;
            posArr[j * 3] = tailDir * u * 0.75;
            posArr[j * 3 + 1] = Math.sin(ph.phase - j * 0.55) * 0.08 * (1.0 - u * 0.5);
            posArr[j * 3 + 2] = 0;
        }
        ph.tailLine.geometry.attributes.position.needsUpdate = true;

        // Stimulated Emission Collision Check with Excited Atoms inside Gain Medium
        if (Math.abs(ph.x) < 4.6 && ph.cooldown <= 0) {
            for (let k = 0; k < gainMediumAtoms.length; k++) {
                const atom = gainMediumAtoms[k];
                if (atom.state === 'E2') {
                    const dx = ph.x - atom.group.position.x;
                    const dy = ph.y - atom.group.position.y;
                    const dz = ph.z - atom.group.position.z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < 0.22) { // Collision with excited atom (~0.47 radius)
                        // === STIMULATED EMISSION OCCURS! ===
                        atom.setExcited(false); // Atom de-excites to ground state E1
                        laserDynamics.stimulatedEvents++;
                        
                        // Spawn twin identical photon (same vx, direction, wavelength, and phase)
                        spawnTwinPhoton(ph.x, ph.y, ph.z, ph.vx, ph.phase);
                        ph.cooldown = 0.15; // Brief immunity so parent doesn't re-trigger immediately
                        
                        playStimulatedEmissionChime();
                        break;
                    }
                }
            }
        }

        // Mirror Reflections:
        // Left Mirror (High Reflector, 100% R at -halfL)
        if (ph.x <= -halfL + 0.3) {
            ph.x = -halfL + 0.3;
            ph.vx = Math.abs(ph.vx); // 100% reflect rightward
            if (resMirrorLeft && resMirrorMatLeft) {
                resMirrorMatLeft.emissiveIntensity = 2.0;
            }
        }
        // Right Mirror (Output Coupler at +halfL)
        else if (ph.x >= halfL - 0.3) {
            ph.x = halfL - 0.3;
            // 92% bounce back into cavity to continue cascade
            ph.vx = -Math.abs(ph.vx);
            if (resMirrorRight && resMirrorMatRight) {
                resMirrorMatRight.opacity = 0.95;
            }
        }

        ph.mesh.position.set(ph.x, ph.y, ph.z);
        ph.mesh.scale.setScalar(0.9 + Math.min(1.0, activePhCount / 30) * 0.4);
    });

    // 5. Light Intensification & Intracavity Glow Growth
    laserDynamics.intracavityPhotonCount = activePhCount;
    const chargeLevel = Math.min(1.0, activePhCount / 36);
    laserCavityCharge.level = chargeLevel;

    // Expand Intracavity Laser Core Beam as light intensifies
    if (resLaserCoreBeam) {
        const coreThick = 0.25 + chargeLevel * 0.65;
        resLaserCoreBeam.scale.set(coreThick, L_3D / 16.0, coreThick);
        resLaserCoreBeam.material.opacity = 0.20 + chargeLevel * 0.75;
    }

    // Gain Medium active crystal glow scales with excited atoms & circulating photons
    if (gainCrystalCore) {
        gainCrystalCore.material.opacity = 0.08 + (excitedCount / 36) * 0.25 + chargeLevel * 0.35;
        gainCrystalCore.material.color.setHex(resonatorState.spectralColorHex);
    }

    // 6. Output Laser Beam (Intense collimated emission shooting out through Output Coupler)
    const isLaserEmitting = laserDynamics.outputLaserActive || chargeLevel > 0.45;
    if (resOutputBeam) {
        const outLen = Math.max(0.2, 20 - halfL);
        resOutputBeam.position.x = (halfL + 20) / 2.0;
        resOutputBeam.scale.y = outLen / 16.0;
        
        if (isLaserEmitting) {
            const beamThick = 0.35 + (laserDynamics.outputLaserActive ? 0.65 : chargeLevel * 0.45);
            resOutputBeam.scale.x = beamThick;
            resOutputBeam.scale.z = beamThick;
            resOutputBeam.material.opacity = 0.65 + chargeLevel * 0.35;
            resOutputBeam.material.color.setHex(resonatorState.spectralColorHex);
            
            // Photodetector sensor on the right glows with laser absorption
            if (resDetectorHousing && resDetectorHousing.children[1]) {
                const sensor = resDetectorHousing.children[1];
                if (sensor.material) {
                    sensor.material.emissive = new THREE.Color(resonatorState.spectralColorHex);
                    sensor.material.emissiveIntensity = 1.0 + chargeLevel * 4.0;
                }
            }
        } else {
            resOutputBeam.material.opacity = Math.max(0.04, resonatorState.transmission * 0.85);
            resOutputBeam.scale.x = 0.18;
            resOutputBeam.scale.z = 0.18;
        }
    }

    // 7. Update DOM Metrics & Atom Counters
    const elE1 = document.getElementById('res-atom-count-e1');
    const elE2 = document.getElementById('res-atom-count-e2');
    const elStim = document.getElementById('res-val-stim-events');
    const elPh = document.getElementById('res-val-intracavity-photons');
    const elBeam = document.getElementById('res-val-beam-power');
    const elStep = document.getElementById('laser-cycle-step-tag');
    
    if (elE1) elE1.innerText = groundCount;
    if (elE2) elE2.innerText = excitedCount;
    if (elStim) elStim.innerText = laserDynamics.stimulatedEvents;
    if (elPh) elPh.innerText = activePhCount;
    if (elBeam) {
        elBeam.innerText = isLaserEmitting ? `${Math.round(chargeLevel * 100)}% (LASING)` : 'OFF';
        elBeam.className = isLaserEmitting ? 'text-emerald-400 font-bold animate-pulse' : 'text-slate-400';
    }
    if (elStep) {
        elStep.innerText = laserDynamics.stage.toUpperCase();
    }
}

// ==========================================
// ANIMATION & AR ATTACHMENT LOOP
// ==========================================

function animate() {
    requestAnimationFrame(animate);
    
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        document.getElementById('val-fps').innerText = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }
    
    // Auto-recover right hand if tracking data stopped arriving (>650ms)
    if (isRightHandPresent && (now - lastRightHandSeenTime > 650)) {
        isRightHandPresent = false;
        rightHandPose = null;
        smoothedRightLandmarks = null;
        smoothedRightQuat = null;
        if (currentState === 'gauntlet' && !isExplodedView) {
            const statusRightEl = document.getElementById('status-right-hand');
            if (statusRightEl) statusRightEl.innerText = "SEARCHING...";
        } else {
            if (!isLeftHandPresent && arCursorEl) {
                arCursorEl.style.display = 'none';
                clearHoverState();
                dwellTarget = null;
                activeCursorPos.x = -100;
                activeCursorPos.y = -100;
            }
            const statusRightEl = document.getElementById('status-right-hand');
            if (statusRightEl) statusRightEl.innerText = "READY (RAISE FINGER)";
        }
    }
    
    // Auto-recover left hand if tracking data stopped arriving (>650ms)
    if (isLeftHandPresent && (now - lastLeftHandSeenTime > 650)) {
        isLeftHandPresent = false;
        if (arCursorEl) {
            arCursorEl.style.display = 'none';
            clearHoverState();
            dwellTarget = null;
            activeCursorPos.x = -100;
            activeCursorPos.y = -100;
        }
        if (currentState === 'gauntlet' && !isExplodedView) {
            const statusLeftEl = document.getElementById('status-left-hand');
            if (statusLeftEl) statusLeftEl.innerText = "SEARCHING...";
        } else {
            const statusLeftEl = document.getElementById('status-left-hand');
            if (statusLeftEl) statusLeftEl.innerText = "READY (RAISE FINGER)";
        }
    }
    
    const seedPulse = simInput.trigger_photon;
    simInput.trigger_photon = false;
    const phys = physics.update(simInput.temperature, seedPulse);
    
    updateAudioHum(phys.temperature, phys.photons);
    
    document.getElementById('val-temp').innerText = phys.temperature.toFixed(2);
    document.getElementById('val-photons').innerText = Math.floor(phys.photons).toLocaleString();
    document.getElementById('val-n1').innerText = Math.round(phys.N1).toLocaleString();
    document.getElementById('val-n2').innerText = Math.round(phys.N2).toLocaleString();
    
    const inversionRatio = phys.N2 / (phys.N_total * 0.5);
    const inversionPct = Math.min(100, Math.round(inversionRatio * 100));
    document.getElementById('val-inversion-pct').innerText = inversionPct + '%';
    document.getElementById('bar-inversion').style.width = inversionPct + '%';
    
    const tag = document.getElementById('inversion-tag');
    if (phys.population_inverted) {
        tag.innerText = "INVERTED (LASING)";
        tag.className = "text-[10px] px-1.5 py-0.5 rounded font-bold bg-pink-900/80 text-pink-300 border border-pink-500 animate-pulse";
    } else {
        tag.innerText = "SUB-CRITICAL";
        tag.className = "text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-900 text-gray-400 border border-slate-700";
    }
    
    const netStim = (0.05 * (phys.N2 - phys.N1) * phys.rho_nu);
    const stimSign = netStim >= 0 ? '-' : '+';
    const stimVal = Math.abs(netStim).toFixed(1);
    const eqStr = `dN₂/dt = (${(phys.temperature * 3.5).toFixed(2)} × ${Math.round(phys.N1)}) ${stimSign} ${stimVal} - (${(0.01 * phys.N2).toFixed(1)}) = ${phys.dN2_dt.toFixed(1)}`;
    const liveEqEl = document.getElementById('live-equation');
    if (liveEqEl) liveEqEl.innerText = eqStr;
    const stage2Live = document.getElementById('stage2-live-rate');
    if (stage2Live) {
        stage2Live.innerText = `ΔE → N₂ (${phys.dN2_dt >= 0 ? '+' : ''}${phys.dN2_dt.toFixed(1)})`;
    }
    
    // Update bottom-left live Einstein rate dynamics graph
    drawRateEquationGraph(phys);
    const rateTag = document.getElementById('rate-status-tag');
    if (rateTag) {
        if (phys.population_inverted) {
            rateTag.innerText = "INVERTED (LASING)";
            rateTag.className = "text-[9px] font-mono-hud font-bold text-pink-400 animate-pulse";
        } else if (Math.abs(phys.dN2_dt) > 10) {
            rateTag.innerText = phys.dN2_dt > 0 ? "PUMPING ↑" : "DECAYING ↓";
            rateTag.className = "text-[9px] font-mono-hud text-amber-400";
        } else {
            rateTag.innerText = "EQUILIBRIUM";
            rateTag.className = "text-[9px] font-mono-hud text-teal-300";
        }
    }
    
    const warning = document.getElementById('blast-warning');
    if (currentState === 'resonator' && phys.N2 > phys.N1 * 1.4 && phys.photons > 200) {
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
    }
    
    // --- 3D GAUNTLET HOLOGRAPHIC RENDERING (GAUNTLET SIMULATION MODE) ---
    if (currentState === 'gauntlet' && gauntletGroup) {
        gauntletGroup.visible = true;
        // Smooth Exploded Schematic Progress (0.0 = Assembled Mark VII Armour, 1.0 = Complete 5-Stage Resonator Schematic)
        const targetExplode = isExplodedView ? 1.0 : 0.0;
        explodedProgress += (targetExplode - explodedProgress) * 0.085;
        if (Math.abs(explodedProgress - targetExplode) < 0.001) {
            explodedProgress = targetExplode;
        }
        const p = explodedProgress;
        simInput.explode_ratio = p;
        
        // Forearm Wing Shells Radial Separation
        if (shellLeft) {
            shellLeft.position.x = -p * 1.85;
            shellLeft.position.z = p * 0.75;
            shellLeft.rotation.y = -p * 0.35;
        }
        if (shellRight) {
            shellRight.position.x = p * 1.85;
            shellRight.position.z = -p * 0.75;
            shellRight.rotation.y = p * 0.35;
        }
        
        // Forearm Hydraulic Pistons Extension
        if (forearmPistons && forearmPistons.length > 0) {
            forearmPistons.forEach(item => {
                item.rod.position.x = item.basePos.x + (item.basePos.side * p * 1.20);
                item.rod.position.z = item.basePos.z + (item.basePos.z < 0 ? -p * 0.50 : p * 0.50);
            });
        }
        
        // Dorsal Pop-up Micro-Missile Bay Mechanical Opening
        if (dorsalMissileHatch && dorsalMissileRack) {
            const hatchLift = Math.min(1.0, p * 1.4);
            dorsalMissileHatch.rotation.x = -hatchLift * 0.85;
            dorsalMissileRack.position.z = -0.80 - (hatchLift * 0.32);
        }
        
        // Dorsal Ruby Laser Diode Pulse
        if (dorsalLaserLens) {
            dorsalLaserLens.material.emissiveIntensity = 3.2 + Math.sin(now * 0.005) * 1.6;
        }
        
        // Braided Energy Conduits Sinusoidal Traveling Wave
        if (energyConduits && energyConduits.length > 0) {
            energyConduits.forEach((line, idx) => {
                const wave = Math.sin(now * 0.007 + idx * 0.9) * 0.5 + 0.5;
                line.material.emissiveIntensity = 2.2 + wave * 2.8;
            });
        }

        // Axial and Radial Plate Displacements for Complete Internal Exposure
        if (elbowCuffMesh) elbowCuffMesh.position.y = -2.60 - 1.40 * p;
        if (wristCollarRef) wristCollarRef.position.y = -0.40 + 0.90 * p;
        if (innerArmPlateRef) innerArmPlateRef.position.z = -1.10 * p;
        if (chassisMeshRef) chassisMeshRef.position.z = -0.85 * p;
        if (palmPlateRef) palmPlateRef.position.y = 1.45 * p;
        if (palmBedRef) palmBedRef.position.y = 1.45 * p;
        if (repulsorBezelRef) repulsorBezelRef.position.y = 0.12 + 1.45 * p;
        if (emitterCoreRef) emitterCoreRef.position.y = 0.13 + 1.45 * p;
        if (dorsalKnuckleGuardRef) dorsalKnuckleGuardRef.position.y = 0.65 + 1.85 * p;
        if (knuckleBridgeRef) knuckleBridgeRef.position.y = 0.62 + 1.85 * p;

        // 5-STAGE INTERNAL LASER CAVITY SCHEMATIC COMPONENT SEPARATION & ANIMATION
        const showSchematic = (p > 0.015);
        if (schematicPowerSourceGroup) {
            schematicPowerSourceGroup.visible = showSchematic;
            schematicPowerSourceGroup.position.y = -2.60 - 1.30 * p;
            if (schematicContainmentRings && schematicContainmentRings.length > 0) {
                schematicContainmentRings.forEach((ring, idx) => {
                    ring.position.y = ring.userData.baseRelY + (idx + 1) * 0.35 * p;
                });
            }
            if (arcReactorCorePulse) {
                const pulse = Math.sin(now * 0.008) * 0.5 + 0.5;
                arcReactorCorePulse.material.color.setRGB(0.7 + pulse * 0.3, 0.95 + pulse * 0.05, 1.0);
            }
        }
        
        if (schematicCoreChamberGroup) {
            schematicCoreChamberGroup.visible = showSchematic;
            schematicCoreChamberGroup.position.y = -1.60 - 0.25 * p;
            if (schematicCoreAtoms && schematicCoreAtoms.length > 0) {
                schematicCoreAtoms.forEach(atom => {
                    atom.theta += atom.vTheta;
                    const wobble = Math.sin(now * 0.004 + atom.phase) * 0.08;
                    atom.mesh.position.x = Math.cos(atom.theta) * atom.r;
                    atom.mesh.position.z = Math.sin(atom.theta) * atom.r;
                    atom.mesh.position.y = atom.baseY + wobble;
                });
            }
        }
        
        if (schematicRearEmitterGroup) {
            schematicRearEmitterGroup.visible = showSchematic;
            schematicRearEmitterGroup.position.y = -0.55 + 0.40 * p;
        }
        
        if (schematicPalmApertureGroup) {
            schematicPalmApertureGroup.visible = showSchematic;
            schematicPalmApertureGroup.position.y = 0.00 + 1.45 * p;
        }
        
        if (schematicCoherentBeamGroup) {
            schematicCoherentBeamGroup.visible = showSchematic;
            schematicCoherentBeamGroup.position.y = 0.70 + 2.50 * p;
            if (schematicLaserBeamMesh) {
                schematicLaserBeamMesh.material.opacity = 0.70 + Math.sin(now * 0.015) * 0.20;
            }
            if (schematicWavefrontRings && schematicWavefrontRings.length > 0) {
                schematicWavefrontRings.forEach((ring, idx) => {
                    const t = ((now * 0.0035 + idx * 0.25) % 1.0);
                    ring.position.y = 0.35 + t * 4.6;
                    ring.scale.setScalar(1.0 + t * 0.9);
                    ring.material.opacity = (1.0 - t) * 0.85;
                });
            }
        }

        const normX = (activeCursorPos && activeCursorPos.x > 0) ? ((activeCursorPos.x / window.innerWidth) - 0.5) : 0;
        const normY = (activeCursorPos && activeCursorPos.y > 0) ? ((activeCursorPos.y / window.innerHeight) - 0.5) : 0;

        if (p > 0.001) {
            // EXPLODED SCHEMATIC VIEW: Horizontal Blueprint Presentation
            if (pedestalGroup) pedestalGroup.visible = false;
            
            // Frame horizontal schematic layout with Stage 1 completely visible and unobstructed on the left
            const targetPos = new THREE.Vector3(1.35 * p, 0.16 * p, -0.95 * p);
            gauntletGroup.position.lerp(targetPos, 0.12);
            
            const targetQuat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(-normY * 0.18, normX * 0.28, -Math.PI / 2)
            );
            gauntletGroup.quaternion.slerp(targetQuat, 0.12);
            
            const targetScale = 0.94 + 0.04 * p;
            gauntletGroup.scale.set(targetScale, targetScale, targetScale);

            // Knuckle caps displaced along Y with Stage 5 hand assembly
            if (knuckleNodes && knuckleNodes.length > 0) {
                knuckleNodes.forEach(kn => {
                    if (kn.userData && kn.userData.basePos) {
                        kn.position.y = kn.userData.basePos.y + 2.05 * p;
                    }
                });
            }

            // Fingers & Thumb splayed around the escaping coherent laser beam (Stage 5)
            if (gauntletFingers && gauntletFingers.length >= 4) {
                const splayAngles = [-0.38, -0.14, 0.14, 0.38];
                gauntletFingers.forEach((f, idx) => {
                    if (f.group.userData && f.group.userData.basePos) {
                        f.group.position.y = f.group.userData.basePos.y + 2.50 * p;
                        f.group.position.x = f.group.userData.basePos.x + splayAngles[idx] * 0.40 * p;
                    }
                    f.group.rotation.z = splayAngles[idx] * 0.95 * p;
                    f.group.scale.y = 1.0 + 0.15 * p;
                    if (f.prox) f.prox.rotation.x = -0.18 * p;
                    if (f.inter) f.inter.rotation.x = 0;
                    if (f.dist) f.dist.rotation.x = -0.12 * p;
                });
            }
            if (thumbGroup) {
                if (thumbGroup.userData && thumbGroup.userData.basePos) {
                    thumbGroup.position.y = thumbGroup.userData.basePos.y + 2.30 * p;
                }
                const baseRotZ = (thumbGroup.userData && typeof thumbGroup.userData.baseRotZ === 'number') ? thumbGroup.userData.baseRotZ : 0.40;
                thumbGroup.rotation.z = baseRotZ + 0.65 * p;
                thumbGroup.rotation.x = -0.32 * p;
            }
        } else if (isRightHandPresent && rightHandPose) {
            // Normal AR right hand tracking
            if (pedestalGroup) pedestalGroup.visible = false;
            
            const targetPos = new THREE.Vector3(rightHandPose.x, rightHandPose.y, rightHandPose.z);
            const distToHand = gauntletGroup.position.distanceTo(targetPos);
            
            if (distToHand > 3.0) {
                gauntletGroup.position.copy(targetPos);
                if (rightHandPose.quaternion) gauntletGroup.quaternion.copy(rightHandPose.quaternion);
            } else {
                const posFactor = Math.min(0.78, 0.46 + distToHand * 0.22);
                gauntletGroup.position.lerp(targetPos, posFactor);
                
                if (rightHandPose.quaternion) {
                    gauntletGroup.quaternion.slerp(rightHandPose.quaternion, 0.55);
                }
            }
            
            const targetScaleX = rightHandPose.scaleX || rightHandPose.scale || 1.0;
            const targetScaleY = rightHandPose.scaleY || rightHandPose.scale || 1.0;
            const targetScaleZ = rightHandPose.scaleZ || rightHandPose.scale || 1.0;
            const scaleLerp = 0.18;
            gauntletGroup.scale.x += (targetScaleX - gauntletGroup.scale.x) * scaleLerp;
            gauntletGroup.scale.y += (targetScaleY - gauntletGroup.scale.y) * scaleLerp;
            gauntletGroup.scale.z += (targetScaleZ - gauntletGroup.scale.z) * scaleLerp;
            
            if (knuckleNodes && knuckleNodes.length > 0) {
                knuckleNodes.forEach(kn => {
                    if (kn.userData && kn.userData.basePos) {
                        kn.position.copy(kn.userData.basePos);
                    }
                });
            }
            
            if (gauntletFingers && gauntletFingers.length >= 4 && rightHandPose.fingerTracking) {
                const recoilFlex = (blastEffectGroup && blastEffectGroup.userData.life > 0) ? (-0.22 * blastEffectGroup.userData.life) : 0.0;
                const fingerLerp = 0.42;
                gauntletFingers.forEach((f, idx) => {
                    if (f.group.userData && f.group.userData.basePos) {
                        f.group.position.copy(f.group.userData.basePos);
                    }
                    const ft = rightHandPose.fingerTracking[idx];
                    if (ft) {
                        f.group.rotation.z += (ft.splayZ - f.group.rotation.z) * fingerLerp;
                        f.group.scale.y += (ft.stretchY - f.group.scale.y) * fingerLerp;
                        const c = ft.curl;
                        if (f.prox) f.prox.rotation.x += (c * 0.75 + recoilFlex - f.prox.rotation.x) * fingerLerp;
                        if (f.inter) f.inter.rotation.x += (c * 0.85 - f.inter.rotation.x) * fingerLerp;
                        if (f.dist) f.dist.rotation.x += (c * 0.60 - f.dist.rotation.x) * fingerLerp;
                    }
                });
            }
            
            if (thumbGroup && rightHandPose.thumbTracking) {
                if (thumbGroup.userData && thumbGroup.userData.basePos) {
                    thumbGroup.position.copy(thumbGroup.userData.basePos);
                }
                const tt = rightHandPose.thumbTracking;
                const thumbLerp = 0.42;
                thumbGroup.rotation.z += (tt.splayZ - thumbGroup.rotation.z) * thumbLerp;
                thumbGroup.scale.y += (tt.stretchY - thumbGroup.scale.y) * thumbLerp;
                if (thumbGroup.userData && thumbGroup.userData.thumbBase) {
                    thumbGroup.userData.thumbBase.rotation.x += (tt.curl * 0.75 - thumbGroup.userData.thumbBase.rotation.x) * thumbLerp;
                }
                if (thumbGroup.userData && thumbGroup.userData.thumbDistGroup) {
                    thumbGroup.userData.thumbDistGroup.rotation.x += (tt.curl * 0.65 - thumbGroup.userData.thumbDistGroup.rotation.x) * thumbLerp;
                }
            }
        } else {
            // Normal Pedestal resting & Showcase Mode
            if (pedestalGroup) {
                pedestalGroup.visible = true;
                pedestalGroup.rotation.y += 0.0015;
            }
            
            gauntletGroup.position.x += (0 - gauntletGroup.position.x) * 0.07;
            gauntletGroup.position.y += (-0.2 - gauntletGroup.position.y) * 0.07;
            gauntletGroup.position.z += (0 - gauntletGroup.position.z) * 0.07;
            
            const curScaleX = gauntletGroup.scale.x;
            const targetScale = curScaleX + (1.15 - curScaleX) * 0.07;
            gauntletGroup.scale.set(targetScale, targetScale, targetScale);
            
            const isHandActive = isLeftHandPresent && activeCursorPos.x > 0;
            let targetQuat;
            if (isHandActive) {
                targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-normY * 0.85, normX * 1.25, 0));
            } else {
                targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(now * 0.001) * 0.08, now * 0.0015, 0));
            }
            gauntletGroup.quaternion.slerp(targetQuat, 0.08);
            
            if (knuckleNodes && knuckleNodes.length > 0) {
                knuckleNodes.forEach(kn => {
                    if (kn.userData && kn.userData.basePos) {
                        kn.position.lerp(kn.userData.basePos, 0.10);
                    }
                });
            }
            
            if (gauntletFingers && gauntletFingers.length > 0) {
                const idleBreathe = Math.sin(now * 0.0022) * 0.04;
                gauntletFingers.forEach((f, idx) => {
                    if (f.group.userData && f.group.userData.basePos) {
                        f.group.position.lerp(f.group.userData.basePos, 0.10);
                    }
                    f.group.rotation.z += (0 - f.group.rotation.z) * 0.10;
                    f.group.scale.y += (1.0 - f.group.scale.y) * 0.10;
                    if (f.prox) f.prox.rotation.x += (idleBreathe + idx * 0.015 - f.prox.rotation.x) * 0.10;
                    if (f.inter) f.inter.rotation.x += (0 - f.inter.rotation.x) * 0.10;
                    if (f.dist) f.dist.rotation.x += (0 - f.dist.rotation.x) * 0.10;
                });
            }
            if (thumbGroup) {
                if (thumbGroup.userData && thumbGroup.userData.basePos) {
                    thumbGroup.position.lerp(thumbGroup.userData.basePos, 0.10);
                }
                const baseRot = (thumbGroup.userData && typeof thumbGroup.userData.baseRotZ === 'number') ? thumbGroup.userData.baseRotZ : 0.42;
                thumbGroup.rotation.z += (baseRot - thumbGroup.rotation.z) * 0.10;
                thumbGroup.scale.y += (1.0 - thumbGroup.scale.y) * 0.10;
                if (thumbGroup.userData && thumbGroup.userData.thumbBase) {
                    thumbGroup.userData.thumbBase.rotation.x += (0 - thumbGroup.userData.thumbBase.rotation.x) * 0.10;
                }
                if (thumbGroup.userData && thumbGroup.userData.thumbDistGroup) {
                    thumbGroup.userData.thumbDistGroup.rotation.x += (0 - thumbGroup.userData.thumbDistGroup.rotation.x) * 0.10;
                }
            }
        }

        // Complete Reassembly Clean-up when p <= 0.005
        if (p <= 0.005) {
            if (schematicPowerSourceGroup) schematicPowerSourceGroup.visible = false;
            if (schematicCoreChamberGroup) schematicCoreChamberGroup.visible = false;
            if (schematicRearEmitterGroup) schematicRearEmitterGroup.visible = false;
            if (schematicPalmApertureGroup) schematicPalmApertureGroup.visible = false;
            if (schematicCoherentBeamGroup) schematicCoherentBeamGroup.visible = false;
            
            if (elbowCuffMesh) elbowCuffMesh.position.y = -2.60;
            if (wristCollarRef) wristCollarRef.position.y = -0.40;
            if (innerArmPlateRef) innerArmPlateRef.position.z = 0;
            if (chassisMeshRef) chassisMeshRef.position.z = 0;
            if (palmPlateRef) palmPlateRef.position.y = 0;
            if (palmBedRef) palmBedRef.position.y = 0;
            if (repulsorBezelRef) repulsorBezelRef.position.y = 0.12;
            if (emitterCoreRef) emitterCoreRef.position.y = 0.13;
            if (dorsalKnuckleGuardRef) dorsalKnuckleGuardRef.position.y = 0.65;
            if (knuckleBridgeRef) knuckleBridgeRef.position.y = 0.62;
        }
        
        // Arc Reactor Dynamic Iris Turbine Counter-Rotation
        if (innerTurbineMesh) {
            innerTurbineMesh.rotation.z -= 0.038;
        }
        
        // Dual-Layer Holographic Targeting Reticles
        if (arcHalo) {
            arcHalo.rotation.z += 0.018;
            arcHalo.material.opacity = 0.85;
            if (arcHalo.scale.x > 1.0) {
                arcHalo.scale.x += (1.0 - arcHalo.scale.x) * 0.06;
                arcHalo.scale.y = arcHalo.scale.x;
            }
        }
        if (innerHaloReticle) {
            innerHaloReticle.rotation.z -= 0.042;
            innerHaloReticle.material.opacity = 0.80;
            if (innerHaloReticle.scale.x > 1.0) {
                innerHaloReticle.scale.x += (1.0 - innerHaloReticle.scale.x) * 0.06;
                innerHaloReticle.scale.y = innerHaloReticle.scale.x;
            }
        }
        
        // Palm Repulsor Arc Core Pulsing Glow
        if (arcCore) {
            if (!isRepulsorFiringEnabled) {
                // Dim standby safe glow when disabled
                arcCore.material.emissiveIntensity = 1.2 + Math.sin(now * 0.003) * 0.4;
            } else {
                const baseGlow = (blastEffectGroup && blastEffectGroup.userData.life > 0) ? (4.0 + blastEffectGroup.userData.life * 20.0) : (3.6 + Math.sin(now * 0.009) * 0.9);
                arcCore.material.emissiveIntensity = baseGlow;
            }
        }
        if (palmLight) {
            if (!isRepulsorFiringEnabled) {
                palmLight.intensity = 1.4;
            } else {
                const baseLight = (blastEffectGroup && blastEffectGroup.userData.life > 0) ? (5.0 + blastEffectGroup.userData.life * 23.0) : (4.4 + Math.sin(now * 0.009) * 0.8);
                palmLight.intensity = baseLight;
            }
        }
        if (arcHalo) {
            arcHalo.rotation.z += 0.018;
            arcHalo.material.opacity = isRepulsorFiringEnabled ? 0.85 : 0.30;
            if (arcHalo.scale.x > 1.0) {
                arcHalo.scale.x += (1.0 - arcHalo.scale.x) * 0.06;
                arcHalo.scale.y = arcHalo.scale.x;
            }
        }
        if (innerHaloReticle) {
            innerHaloReticle.rotation.z -= 0.042;
            innerHaloReticle.material.opacity = isRepulsorFiringEnabled ? 0.80 : 0.22;
            if (innerHaloReticle.scale.x > 1.0) {
                innerHaloReticle.scale.x += (1.0 - innerHaloReticle.scale.x) * 0.06;
                innerHaloReticle.scale.y = innerHaloReticle.scale.x;
            }
        }


    }
    
    // Resonator Atoms, 3D Standing Waves & Beams
    if (currentState === 'resonator' || isTransitioning) {
        if ((isLeftHandPresent || isRightHandPresent) && activeCursorPos.x > 0) {
            const normX = (activeCursorPos.x / window.innerWidth) - 0.5;
            const normY = (activeCursorPos.y / window.innerHeight) - 0.5;
            resonatorGroup.rotation.y += ((normX * 0.40) - resonatorGroup.rotation.y) * 0.06;
            resonatorGroup.rotation.x += ((-normY * 0.28) - resonatorGroup.rotation.x) * 0.06;
        } else {
            resonatorGroup.rotation.y = Math.sin(now * 0.0003) * 0.08;
            resonatorGroup.rotation.x = Math.cos(now * 0.0004) * 0.04;
        }

        // Advance wave oscillation phase if not paused
        if (!resonatorState.isPaused) {
            resonatorState.wavePhaseTime += 0.08;
        }
        const tPhase = resonatorState.wavePhaseTime;
        const { m, transmission, reflectivity, cavityLength, wavelength } = resonatorState;
        
        // 3D physical separation of mirrors based on Cavity Length L
        const L_3D = 16.0 * (cavityLength / 4.826);
        const halfL = L_3D / 2.0;

        // Position mirrors and optical mounts
        if (resMirrorLeft) resMirrorLeft.position.x = -halfL;
        if (resMirrorRight) resMirrorRight.position.x = halfL;
        if (resMountL) resMountL.position.x = -halfL;
        if (resMountR) resMountR.position.x = halfL;

        // Animate 3D Standing Wave Ribbon & Field lines
        if (resStandingWaveLine && resStandingWaveCrossLine) {
            const peakAmp = 1.45 * Math.sqrt(Math.max(0.02, transmission)) * (0.35 + 0.65 * reflectivity);
            const posLine = resStandingWaveLine.geometry.attributes.position.array;
            const posCross = resStandingWaveCrossLine.geometry.attributes.position.array;
            const posEnvTop = resWaveEnvelopeTop ? resWaveEnvelopeTop.geometry.attributes.position.array : null;
            const posEnvBot = resWaveEnvelopeBottom ? resWaveEnvelopeBottom.geometry.attributes.position.array : null;

            const mismatch = Math.abs(m - Math.round(m));
            const travelWeight = Math.min(1.0, mismatch * 3.5);
            const N = 300;

            for (let i = 0; i < N; i++) {
                const u = i / (N - 1); // 0 to 1 across cavity
                const x = -halfL + u * L_3D;

                // Standing wave term: sin(m * π * u) * cos(ω * t)
                const standing = Math.sin(m * Math.PI * u) * Math.cos(tPhase);
                // Phase-mismatch traveling ripple when off-resonance
                const traveling = 0.35 * Math.sin(m * Math.PI * u - tPhase);

                const yVal = peakAmp * ((1.0 - travelWeight * 0.75) * standing + travelWeight * 0.25 * traveling);
                const zVal = (peakAmp * 0.55) * Math.sin(m * Math.PI * u) * Math.sin(tPhase);

                posLine[i * 3] = x;
                posLine[i * 3 + 1] = yVal;
                posLine[i * 3 + 2] = 0;

                posCross[i * 3] = x;
                posCross[i * 3 + 1] = 0;
                posCross[i * 3 + 2] = zVal;

                if (posEnvTop && posEnvBot) {
                    const env = peakAmp * Math.abs(Math.sin(m * Math.PI * u));
                    posEnvTop[i * 3] = x;
                    posEnvTop[i * 3 + 1] = env;
                    posEnvTop[i * 3 + 2] = 0;

                    posEnvBot[i * 3] = x;
                    posEnvBot[i * 3 + 1] = -env;
                    posEnvBot[i * 3 + 2] = 0;
                }
            }
            resStandingWaveLine.geometry.attributes.position.needsUpdate = true;
            resStandingWaveCrossLine.geometry.attributes.position.needsUpdate = true;
            if (resWaveEnvelopeTop) resWaveEnvelopeTop.geometry.attributes.position.needsUpdate = true;
            if (resWaveEnvelopeBottom) resWaveEnvelopeBottom.geometry.attributes.position.needsUpdate = true;
        }

        // Intracavity central laser core beam
        if (resLaserCoreBeam) {
            resLaserCoreBeam.scale.set(0.8 + transmission * 0.9, L_3D / 16.0, 0.8 + transmission * 0.9);
            resLaserCoreBeam.material.opacity = 0.2 + transmission * 0.75;
        }

        // Input beam from left emitter (-20) to left mirror (-halfL)
        if (resInputBeam) {
            const inputLen = Math.max(0.2, 20 - halfL);
            resInputBeam.position.x = (-20 - halfL) / 2.0;
            resInputBeam.scale.y = inputLen / 16.0;
        }

        // Transmitted output beam from right mirror (+halfL) to right detector (+20)
        if (resOutputBeam) {
            const outLen = Math.max(0.2, 20 - halfL);
            resOutputBeam.position.x = (halfL + 20) / 2.0;
            resOutputBeam.scale.y = outLen / 16.0;
            resOutputBeam.material.opacity = Math.max(0.04, transmission * 0.92);
            resOutputBeam.scale.x = Math.max(0.15, transmission);
            resOutputBeam.scale.z = Math.max(0.15, transmission);
        }

        // Node marker rings along cavity
        if (resNodeMarkerGroup) {
            const targetNodes = Math.floor(m);
            while (resNodeMarkerGroup.children.length < targetNodes + 1) {
                const ringGeo = new THREE.TorusGeometry(1.2, 0.035, 8, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: resonatorState.spectralColorHex,
                    transparent: true,
                    opacity: 0.5,
                    blending: THREE.AdditiveBlending
                });
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.rotation.y = Math.PI / 2;
                resNodeMarkerGroup.add(ringMesh);
            }
            while (resNodeMarkerGroup.children.length > targetNodes + 1) {
                resNodeMarkerGroup.remove(resNodeMarkerGroup.children[resNodeMarkerGroup.children.length - 1]);
            }
            resNodeMarkerGroup.children.forEach((mesh, idx) => {
                const u = idx / m;
                mesh.position.x = -halfL + u * L_3D;
                mesh.material.color.setHex(resonatorState.spectralColorHex);
                mesh.material.opacity = (Math.abs(m - Math.round(m)) < 0.03 ? 0.75 : 0.25);
            });
        }

        // Field overlay real-time animation update if open
        if (resonatorState.showFieldOverlay) {
            drawFieldOverlay();
        }
        
        const dt = 0.016;
        updateGainMediumAndLaserDynamics(dt, now, halfL, L_3D, m, tPhase);

        // Sync DOM Laser Charge Indicators
        const barCharge = document.getElementById('bar-laser-charge');
        const valCharge = document.getElementById('res-val-charge-pct');
        const statusCharge = document.getElementById('res-charge-status');
        const pct = Math.round(laserCavityCharge.level * 100);
        if (barCharge) barCharge.style.width = `${pct}%`;
        if (valCharge) valCharge.innerText = `${pct}%`;
        if (statusCharge) {
            if (laserDynamics.outputLaserActive || laserCavityCharge.level >= 0.95) {
                statusCharge.innerText = '⚡ 100% LASING (BEAM EMITTED)';
                statusCharge.className = 'text-rose-400 font-bold truncate animate-pulse';
            } else if (laserDynamics.stage === 'amplifying') {
                statusCharge.innerText = `AMPLIFYING: ${pct}%`;
                statusCharge.className = 'text-amber-300 font-bold truncate';
            } else {
                statusCharge.innerText = `PUMPING: ${pct}%`;
                statusCharge.className = 'text-teal-300 truncate';
            }
        }

        // 3. ANIMATE HIGH-ENERGY OPTICAL LASER BLAST DISCHARGE
        if (opticalBlastLife > 0) {
            opticalBlastLife -= 0.034;
            const life = Math.max(0.0, opticalBlastLife);
            if (opticalBlastCore) opticalBlastCore.material.opacity = life * 1.0;
            if (opticalBlastAura) opticalBlastAura.material.opacity = life * 0.85;

            opticalBlastRings.forEach(ring => {
                ring.scale.multiplyScalar(1.055);
                ring.material.opacity = life * 0.9;
            });

            if (opticalBlastLife <= 0) {
                if (opticalBlastGroup) opticalBlastGroup.visible = false;
                opticalBlastRings.forEach(ring => ring.scale.set(1, 1, 1));
                if (resDetectorHousing && resDetectorHousing.children[1]) {
                    const sensor = resDetectorHousing.children[1];
                    if (sensor.material) sensor.material.emissiveIntensity = 0.0;
                }
            }
        }
    }
    
    // Blast beam update
    if (blastEffectGroup && blastEffectGroup.userData.life > 0) {
        blastEffectGroup.userData.life -= 0.035;
        const life = blastEffectGroup.userData.life;
        
        if (gauntletGroup && (isRightHandPresent || isLeftHandPresent)) {
            const palmOffset = new THREE.Vector3(0, 0, 0.14).applyQuaternion(gauntletGroup.quaternion);
            blastEffectGroup.position.copy(gauntletGroup.position).add(palmOffset);
            blastEffectGroup.quaternion.copy(gauntletGroup.quaternion);
        }
        
        blastEffectGroup.children.forEach(child => {
            if (child.material) {
                child.material.opacity = Math.max(0.0, life);
            }
        });
        
        shockwaves.forEach(ring => {
            ring.scale.multiplyScalar(1.04);
        });
        
        if (life <= 0) {
            blastEffectGroup.visible = false;
            shockwaves.forEach(ring => ring.scale.set(1, 1, 1));
        }
    }

    
    renderer.render(scene, camera);
}

// ==========================================
// BOOTSTRAP INITIALIZATION
// ==========================================
function startApplication() {
    fetch('/api/log', { method: 'POST', body: 'APP_JS_LOADED: Starting init sequence' }).catch(() => {});
    
    try {
        init3D();
        fetch('/api/log', { method: 'POST', body: 'INIT3D_SUCCESS' }).catch(() => {});
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'INIT3D_ERROR: ' + (e.stack || e) }).catch(() => {});
    }
    
    try {
        setupAudio();
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'SETUP_AUDIO_ERROR: ' + (e.stack || e) }).catch(() => {});
    }
    
    try {
        setupUIListeners();
        fetch('/api/log', { method: 'POST', body: 'SETUP_UI_SUCCESS' }).catch(() => {});
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'SETUP_UI_ERROR: ' + (e.stack || e) }).catch(() => {});
    }
    
    try {
        initFullscreenCamera().catch(err => {
            fetch('/api/log', { method: 'POST', body: 'INIT_CAMERA_PROMISE_ERR: ' + (err.stack || err) }).catch(() => {});
        });
        fetch('/api/log', { method: 'POST', body: 'INIT_CAMERA_INVOKED' }).catch(() => {});
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'INIT_CAMERA_ERROR: ' + (e.stack || e) }).catch(() => {});
    }
    
    try {
        animate();
        fetch('/api/log', { method: 'POST', body: 'ANIMATE_STARTED' }).catch(() => {});
    } catch (e) {
        fetch('/api/log', { method: 'POST', body: 'ANIMATE_ERROR: ' + (e.stack || e) }).catch(() => {});
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApplication);
    } else {
        startApplication();
    }
}

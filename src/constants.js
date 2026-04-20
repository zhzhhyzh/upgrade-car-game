// ── Game Configuration ──

export const TRACK_LENGTH = 700;        // total Z distance (longer for 7 tiers)
export const ROAD_WIDTH = 12;           // road width
export const LANE_COUNT = 3;            // number of lanes
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

export const CAR_SPEED = 30;            // forward speed (units/s)
export const STEER_SPEED = 12;          // lateral speed (units/s)
export const ROAD_HALF = ROAD_WIDTH / 2 - 1.2;

export const CHUNK_LENGTH = 40;         // length of one road chunk
export const CHUNK_BUFFER = 6;          // chunks visible ahead

export const GATE_INTERVAL = 22;        // Z spacing between gates
export const GATE_START_Z = 30;         // first gate Z position

// ── Car Tiers (7 levels) ──
export const TIERS = [
  {
    name: 'Junk Heap',
    value: 500,
    color: 0x8B4513,
    metalness: 0.1,
    roughness: 0.9,
    scale: 1.0,
    neonColor: null,
    enginePitch: 55,
    engineType: 'triangle',
    engineVol: 0.025,
  },
  {
    name: 'Rusty Beater',
    value: 2500,
    color: 0x707070,
    metalness: 0.2,
    roughness: 0.7,
    scale: 1.0,
    neonColor: null,
    enginePitch: 70,
    engineType: 'triangle',
    engineVol: 0.028,
  },
  {
    name: 'City Sedan',
    value: 12000,
    color: 0x4682B4,
    metalness: 0.4,
    roughness: 0.5,
    scale: 1.03,
    neonColor: 0x3388ff,
    enginePitch: 90,
    engineType: 'sawtooth',
    engineVol: 0.03,
  },
  {
    name: 'Sports Coupe',
    value: 45000,
    color: 0xCC0000,
    metalness: 0.6,
    roughness: 0.3,
    scale: 1.07,
    neonColor: 0xff2200,
    enginePitch: 120,
    engineType: 'sawtooth',
    engineVol: 0.035,
  },
  {
    name: 'Neon Racer',
    value: 120000,
    color: 0x1a1a2e,
    metalness: 0.75,
    roughness: 0.2,
    scale: 1.1,
    neonColor: 0x00ffff,
    enginePitch: 150,
    engineType: 'sawtooth',
    engineVol: 0.038,
  },
  {
    name: 'Cyber GT',
    value: 350000,
    color: 0x0a0a1a,
    metalness: 0.85,
    roughness: 0.12,
    scale: 1.13,
    neonColor: 0xff00ff,
    enginePitch: 180,
    engineType: 'square',
    engineVol: 0.04,
  },
  {
    name: 'Hyperion X',
    value: 1000000,
    color: 0x0d0d0d,
    metalness: 0.95,
    roughness: 0.05,
    scale: 1.16,
    neonColor: 0xffaa00,
    enginePitch: 220,
    engineType: 'square',
    engineVol: 0.045,
  },
];

export const MAX_TIER = TIERS.length - 1;

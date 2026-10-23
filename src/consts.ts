export const MAX_USERNAME_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 10;

const env = import.meta.env;

export const WS_HOST = env.VITE_WS_HOST || 'ws://localhost';
export const WS_PORT = Number(env.VITE_WS_PORT) || 3000;

export const DISABLE_OBJECTS_LOADING = false;
export const DEBUG_PATHFINDING = false;
export const DEBUG_SHOW_TERRAIN_ATTRIBUTES = false;
export const DEBUG_SHOW_BOUNDING_BOXES = false;

export const ENABLE_BG_MUSIC = true;

/**
 * THE REGISTRY of game versions this client can play. Exactly one entry is
 * available in this MU Origins build.
 *
 * Entry metadata (`id`, `label`, `listTag`) is eager so the server picker
 * can answer "can this client play that world?" without loading a version
 * body; the body comes in through a dynamic import.
 *
 * Invariant: a version's `index.ts` (the `load()` module) must import only
 * the contract, generated packet files and its own data - never app code.
 * App modules read `gameVersion` at module scope, so they may evaluate only
 * after `load()` resolved; version UI reaches app code, which is why it
 * sits behind the separate `loadUi()`.
 */
import type { GameVersion, GameVersionId } from '../src/version/contract';
import type { VersionUi } from '../src/version/uiContract';

/**
 * The three packet lists the S6EP3 client exports.
 */
export type VersionPackets = {
  ServerToClientPackets: typeof import('./season6/packets')['ServerToClientPackets'];
  ClientToServerPackets: typeof import('./season6/packets')['ClientToServerPackets'];
  ConnectServerPackets: typeof import('./season6/packets')['ConnectServerPackets'];
  ChangeMapServerInfoPacket: typeof import('./season6/packets')['ChangeMapServerInfoPacket'];
};

/** What `versions/<id>/index.ts` exports. */
export type VersionModule = {
  gameVersion: GameVersion;
  packets: VersionPackets;
};

export type { VersionUi };

export type VersionEntry = {
  readonly id: GameVersionId;
  /** Human label for pickers and logs. Must match the module's `gameVersion.label`. */
  readonly label: string;
  /** The token a published server line leads with. Must match `gameVersion.listTag`. */
  readonly listTag: string;
  readonly load: () => Promise<VersionModule>;
  readonly loadUi: () => Promise<VersionUi>;
};

export const DEFAULT_VERSION_ID: GameVersionId = 'season6';

export const VERSION_REGISTRY: readonly VersionEntry[] = [
  {
    id: 'season6',
    label: 'Season 6 Episode 3',
    listTag: 'S6EP3',
    load: () => import('./season6'),
    loadUi: () => import('./season6/ui'),
  },
];

import { WS_HOST, WS_PORT } from '../consts';
import { versionByTag } from '../version';

/**
 * This client is locked to MU Origins. The connect-server endpoint is fixed;
 * only the proxy address can vary between deployments through the build env.
 *
 * Note what the ws address is *not*: a browser cannot open a TCP socket, so
 * every connection goes through the ws↔TCP proxy (`proxy/main.ts`), which
 * dials `?host=&port=` for us. `wsUrl` is therefore the proxy's own address,
 * and `csHost:csPort` is the MU connect server as seen **from the proxy's
 * network** - they have no reason to be the same machine.
 */

export type GameServerPolicy =
  /** Use the address `ConnectionInfo` returns; fall back to `csHost`. */
  | 'auto'
  /** Ignore it and always reconnect to `csHost` (single-box setups). */
  | 'csHost';

/**
 * A channel inside a game server, as the published list named it. `id` is the
 * low byte of the `ServerId` the connect server sends - the id that server was
 * configured with, which is the whole of it in a single-group deployment.
 */
export type PublishedChannel = { id: number; name: string };

/**
 * One of a world's game servers, as the published list named it. `id` is the
 * server group (`ServerId >> 8`), `0` for a world that never set one up.
 *
 * The connect server sends ids and load percentages and no text at all, so the
 * published list is the only place a world can say what its game servers are
 * called. Anything it does not name keeps the numbered default.
 */
export type PublishedGameServer = {
  id: number;
  /** Empty when the line only opened a group to hang channel names off. */
  name: string;
  channels: PublishedChannel[];
};

export type ServerProfile = {
  /** Stable key; `URL_PROFILE_ID` remains reserved for legacy account data. */
  id: string;
  /** What the picker shows. Free text, never parsed. */
  name: string;
  /** Connect-server host, no scheme - the proxy resolves it, not the browser. */
  csHost: string;
  csPort: number;
  /** Proxy origin, scheme included (`ws://localhost:3000`, `wss://play.x.com`). */
  wsUrl: string;
  gsAddress: GameServerPolicy;
  /** From the published list (`serverList.ts`): shown, selectable, not editable. */
  listed?: boolean;
  /**
   * The world's own domain, when it published one. Everything else the world
   * has hangs off it by convention - the proxy, its signup page, its shop -
   * which is what `serverServices.ts` reads it for.
   */
  domain?: string;
  /** The published list's blurb, language tag and banner. Display only. */
  description?: string;
  language?: string;
  image?: string;
  /**
   * What this world calls its game servers and their channels, taken from the
   * lines the published entry carried under it. Absent on a saved profile: the
   * player typed an address, not a world's own names.
   */
  servers?: PublishedGameServer[];
  /**
   * Which client this world expects (`gameVersion.listTag`, e.g. `S6EP3`), as
   * the published line gave it. Empty on a saved profile: the player typed the
   * address, so it is played with whatever version this client picks.
   */
  version?: string;
};

export const URL_PROFILE_ID = 'url';

/** MU Origins' fixed connect-server port. */
const DEFAULT_CS_PORT = 44405;

const MAX_PORT = 65535;

/**
 * Addresses a connect server can hand back that mean "no address": OpenMU and
 * most season-6 servers pad the 16-byte field, and a misconfigured one sends
 * the unspecified address rather than an empty string. Anything here falls
 * back to `csHost` even under the `auto` policy.
 */
const UNUSABLE_HOSTS = new Set(['', '0.0.0.0', '255.255.255.255', 'null']);

/** Hostnames/IPs only - no scheme, path, credentials or spaces. */
const HOST_RE = /^[A-Za-z0-9._-]+$/;

function clampPort(value: unknown, fallback: number): number {
  const port = Math.trunc(Number(value));

  return Number.isFinite(port) && port > 0 && port <= MAX_PORT ? port : fallback;
}

/** Strip a scheme, a path and a trailing dot a user may have pasted in. */
export function normalizeHost(raw: string): string {
  return raw
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isUsableHost(raw: string): boolean {
  const host = normalizeHost(raw);

  return host.length > 0 && !UNUSABLE_HOSTS.has(host.toLowerCase()) && HOST_RE.test(host);
}

/**
 * A page served over https may not open a `ws://` socket - the browser blocks
 * it as mixed content, with an error the player cannot act on. Default the
 * scheme to the page's, and upgrade a bare `ws://` typed into an https build.
 */
function defaultWsScheme(): 'ws' | 'wss' {
  return typeof location !== 'undefined' && location.protocol === 'https:'
    ? 'wss'
    : 'ws';
}

export function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');

  if (!trimmed) return '';

  const scheme = defaultWsScheme();
  const withScheme = /^wss?:\/\//i.test(trimmed)
    ? trimmed
    : `${scheme}://${trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')}`;

  return scheme === 'wss' ? withScheme.replace(/^ws:\/\//i, 'wss://') : withScheme;
}

/** True when this proxy address will be blocked as mixed content. */
export function isInsecureWsUrl(url: string): boolean {
  return (
    typeof location !== 'undefined' &&
    location.protocol === 'https:' &&
    /^ws:\/\//i.test(url.trim())
  );
}

/**
 * What the picker writes while the player types: stored as typed, so a
 * half-finished host (`127.`) or a cleared port is not rewritten under the
 * cursor. `effective` is what normalizes it, at connect time.
 */
export function draftProfile(
  patch: Partial<ServerProfile>,
  base: ServerProfile
): ServerProfile {
  const port = Math.trunc(Number(patch.csPort ?? base.csPort));

  return {
    id: base.id,
    name: patch.name ?? base.name,
    csHost: patch.csHost ?? base.csHost,
    // 0 (an emptied field) is kept and read as "the default port".
    csPort: Number.isFinite(port) ? Math.min(Math.max(port, 0), MAX_PORT) : 0,
    wsUrl: patch.wsUrl ?? base.wsUrl,
    gsAddress: patch.gsAddress ?? base.gsAddress,
  };
}

/** The strict pass: storage, the URL override and a new profile go through it. */
export function sanitizeProfile(
  patch: Partial<ServerProfile>,
  base: ServerProfile
): ServerProfile {
  const csHost = normalizeHost(patch.csHost ?? base.csHost);

  return {
    id: patch.id ?? base.id,
    name: (patch.name ?? base.name).trim() || base.name,
    csHost: csHost || base.csHost,
    csPort: clampPort(patch.csPort ?? base.csPort, base.csPort),
    wsUrl: normalizeWsUrl(patch.wsUrl ?? base.wsUrl) || base.wsUrl,
    gsAddress: patch.gsAddress ?? base.gsAddress,
    ...((patch.listed ?? base.listed) && { listed: true }),
    ...((patch.domain ?? base.domain) && {
      domain: patch.domain ?? base.domain,
    }),
    ...((patch.description ?? base.description) && {
      description: patch.description ?? base.description,
    }),
    ...((patch.language ?? base.language) && {
      language: patch.language ?? base.language,
    }),
    ...((patch.image ?? base.image) && { image: patch.image ?? base.image }),
    ...((patch.servers ?? base.servers)?.length && {
      servers: patch.servers ?? base.servers,
    }),
    ...((patch.version ?? base.version) && {
      version: patch.version ?? base.version,
    }),
  };
}

/**
 * Can this client enter that world? It can when it carries the version the
 * world asked for - `versions/registry.ts`, which is where the versions this
 * client ships are enumerated and where the answer widens as `versions/` grows.
 *
 * A world that named no version is always played: the older list lines say
 * nothing, and neither does an address the player typed themselves.
 */
export function playableHere(profile: ServerProfile): boolean {
  return !profile.version || versionByTag(profile.version) !== null;
}

/**
 * Does this world answer to what was typed in the worlds tab's search box?
 *
 * Everything the world says about itself is searched, not just its name: a
 * player looking for somewhere to go types a language, a version tag, a domain
 * or the name of a channel they were told about as readily as the world's own
 * name, and a box that only matched the name would be a box that usually finds
 * nothing. Every word has to match something, so adding one narrows the list
 * rather than widening it.
 */
export function matchesSearch(profile: ServerProfile, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (!words.length) return true;

  const haystack = [
    profile.name,
    profile.description ?? '',
    profile.language ?? '',
    profile.version ?? '',
    profile.domain ?? '',
    displayAddress(profile),
    ...(profile.servers ?? []).flatMap(server => [
      server.name,
      ...server.channels.map(channel => channel.name),
    ]),
  ]
    .join(' ')
    .toLowerCase();

  return words.every(word => haystack.includes(word));
}

const LOCKED_SERVER: ServerProfile = Object.freeze({
  id: 'list:play.muorigins.online:44405',
  name: 'MU Origins',
  csHost: 'play.muorigins.online',
  csPort: DEFAULT_CS_PORT,
  wsUrl: normalizeWsUrl(`${WS_HOST}:${WS_PORT}`),
  gsAddress: 'auto',
  description: 'Season 6 Episode 3',
  version: 'S6EP3',
});

class ServerConfigStore {
  get profiles(): ServerProfile[] {
    return [LOCKED_SERVER];
  }

  get listed(): ServerProfile[] {
    return [];
  }

  get activeId(): string {
    return LOCKED_SERVER.id;
  }

  get lastPlayedId(): string {
    return '';
  }

  get urlProfile(): null {
    return null;
  }

  get all(): ServerProfile[] {
    return [LOCKED_SERVER];
  }

  get languages(): string[] {
    return [];
  }

  get active(): ServerProfile {
    return LOCKED_SERVER;
  }

  get isEmpty(): boolean {
    return false;
  }

  get lockedByUrl(): boolean {
    return false;
  }

  get activeIsListed(): boolean {
    return !!this.active.listed;
  }

  get readOnly(): boolean {
    return true;
  }

  setListed(_entries: ServerProfile[]): void {}
  markPlayed(_id: string): void {}
  select(_id: string): void {}
  update(_id: string, _patch: Partial<ServerProfile>): void {}
  add(_from?: Partial<ServerProfile>): ServerProfile {
    return LOCKED_SERVER;
  }
  remove(_id: string): void {}
  reset(): void {}
}

export const ServerConfig = new ServerConfigStore();

/**
 * A profile as the sockets will use it: the typed text normalized, with the
 * build defaults standing in for anything left empty. Every connection and the
 * picker's preview line read this, so what the player is shown is exactly what
 * will be dialled.
 */
export function effective(_profile: ServerProfile = ServerConfig.active): {
  csHost: string;
  csPort: number;
  wsUrl: string;
} {
  return {
    csHost: LOCKED_SERVER.csHost,
    csPort: LOCKED_SERVER.csPort,
    wsUrl: LOCKED_SERVER.wsUrl,
  };
}

/** Proxy origin the sockets open (`createSocket`'s `wsAddress`). */
export function wsAddress(): string {
  return effective().wsUrl;
}

/** Connect server, as the proxy will dial it. */
export function connectServerAddress(): { host: string; port: number } {
  const { csHost, csPort } = effective();

  return { host: csHost, port: csPort };
}

/**
 * The address to *show* for a world, which is not always the one it is dialled
 * at.
 *
 * A published world's `csHost` is the connect server as its own proxy reaches
 * it, and a world whose proxy shares a box with the game server publishes
 * `127.0.0.1` there - correct, and meaningless on a player's screen. So a
 * listed world shows what it is known by: its domain, or failing that the
 * proxy that carries it, which is the address the browser really opens.
 *
 * A saved profile shows its endpoint unchanged: the player typed it, and it is
 * the field they are checking when they read this line.
 */
export function displayAddress(
  profile: ServerProfile = ServerConfig.active
): string {
  if (!profile.listed) {
    const csHost = normalizeHost(profile.csHost) || LOCKED_SERVER.csHost;
    const csPort = clampPort(profile.csPort, LOCKED_SERVER.csPort);

    return `${csHost}:${csPort}`;
  }

  const { csHost, csPort, wsUrl } = effective(profile);

  return profile.domain || normalizeHost(wsUrl) || `${csHost}:${csPort}`;
}

/**
 * Where a host sits: the client cannot probe reachability, but it can tell a
 * public address from one that only means something inside a network - which
 * is enough to know when a server is describing itself to the internet rather
 * than to us.
 */

/** 127.0.0.0/8 and the names for it. The proxy and the server are one machine. */
function isLoopback(host: string): boolean {
  const lower = host.toLowerCase();

  return (
    lower === 'localhost' ||
    lower === '::1' ||
    lower.endsWith('.localhost') ||
    /^127\./.test(lower)
  );
}

/**
 * True when the wider internet could route to this address - a public IPv4, or
 * any qualified hostname (a name resolves to whatever its DNS says, so it is
 * assumed routable). False for loopback, RFC1918 / CGNAT / link-local space,
 * single-label names and the local-network suffixes.
 */
function isPublicAddress(host: string): boolean {
  const lower = host.toLowerCase();

  if (isLoopback(lower)) return false;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);

  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);

    if (a === 10 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    // CGNAT (100.64/10) and link-local (169.254/16) are no more routable to us
    // than RFC1918 space.
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;

    return true;
  }

  // `mu-server`, `openmu.local`, `box.lan` - names only a local resolver knows.
  if (!lower.includes('.')) return false;

  return !/\.(local|lan|home|internal|localdomain)$/.test(lower);
}

/**
 * Where the game-server socket goes, and where it goes if that fails.
 *
 * `ConnectionInfo` carries the address the server wants us on - right for a
 * real deployment, where the game servers are separate boxes. But the address a
 * server advertises is how it believes the *internet* reaches it, which is a
 * different question from how the proxy reaches it, and the two disagree in one
 * very common setup: a server on this machine, or on this network, announcing
 * the public IP of its router. OpenMU's demo does exactly that.
 *
 * So a public address is believed only when the connect server we just spoke to
 * was itself public. Reached OpenMU on `127.0.0.1` and it answers with a public
 * IP? That IP is this same machine seen from outside; going out to the router
 * and back - if the router even hairpins - is at best a slow way to reach a
 * server that is right here, so the loopback address is used at once. Two
 * private addresses, on the other hand, are two boxes on one network: believed.
 *
 * Every such judgement is a guess about someone else's network, so it is never
 * final: `fallback` is the address that lost, and the store tries it if the
 * winner does not answer. Whichever way the guess goes, both get a turn.
 */
export function gameServerTarget(returned: string): {
  host: string;
  fallback: string | null;
} {
  const { csHost } = effective();
  const address = isUsableHost(returned) ? normalizeHost(returned) : '';

  if (ServerConfig.active.gsAddress === 'csHost' || !address) {
    return { host: csHost, fallback: null };
  }

  if (address === csHost) return { host: csHost, fallback: null };

  // The advertised address describes the wider internet, while the connect
  // server that just answered us does not: prefer what demonstrably works, and
  // keep the advertised one as the second try.
  if (isPublicAddress(address) && !isPublicAddress(csHost)) {
    return { host: csHost, fallback: address };
  }

  return { host: address, fallback: csHost };
}

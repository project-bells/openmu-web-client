import { describe, expect, it } from 'vitest';
import {
  connectServerAddress,
  effective,
  matchesSearch,
  ServerConfig,
  type ServerProfile,
} from './serverConfig';

const world = (patch: Partial<ServerProfile> = {}): ServerProfile => ({
  id: 'list:ignies.net',
  name: 'Ignies',
  csHost: '127.0.0.1',
  csPort: 44405,
  wsUrl: 'wss://ws.ignies.net',
  gsAddress: 'auto',
  listed: true,
  domain: 'ignies.net',
  description: 'Season 6 Episode 3, played in the browser',
  language: 'es',
  version: 'S6EP3',
  ...patch,
});

describe('matchesSearch', () => {
  it('keeps every world when nothing was typed', () => {
    expect(matchesSearch(world(), '')).toBe(true);
    expect(matchesSearch(world(), '   ')).toBe(true);
  });

  describe('locked server configuration', () => {
    it('offers only MU Origins and ignores saved, listed, and URL-style changes', () => {
      const other = world({
        id: 'list:other.example',
        name: 'Other server',
        csHost: 'other.example',
      });

      ServerConfig.setListed([other]);
      ServerConfig.select(other.id);
      ServerConfig.update(ServerConfig.activeId, { csHost: 'other.example' });
      ServerConfig.add({ csHost: 'other.example' });

      expect(ServerConfig.all).toHaveLength(1);
      expect(ServerConfig.active).toMatchObject({
        name: 'MU Origins',
        csHost: 'play.muorigins.online',
        csPort: 44405,
        version: 'S6EP3',
      });
      expect(ServerConfig.readOnly).toBe(true);
      expect(connectServerAddress()).toEqual({
        host: 'play.muorigins.online',
        port: 44405,
      });
    });

    it('uses the fixed endpoint even when a caller supplies another profile', () => {
      const other = world({
        csHost: 'other.example',
        csPort: 55555,
        wsUrl: 'wss://other.example',
      });

      expect(effective(other)).toMatchObject({
        csHost: 'play.muorigins.online',
        csPort: 44405,
      });
    });
  });

  it('matches the name, whatever the case', () => {
    expect(matchesSearch(world(), 'IGN')).toBe(true);
    expect(matchesSearch(world(), 'lorencia')).toBe(false);
  });

  it('matches what the world says about itself, not only its name', () => {
    expect(matchesSearch(world(), 'episode 3')).toBe(true);
    expect(matchesSearch(world(), 's6ep3')).toBe(true);
    expect(matchesSearch(world(), 'es')).toBe(true);
    expect(matchesSearch(world(), 'ignies.net')).toBe(true);
  });

  it('matches a game server or channel the list named', () => {
    const named = world({
      servers: [
        { id: 0, name: 'Valhalla', channels: [{ id: 0, name: 'Peaceful' }] },
      ],
    });

    expect(matchesSearch(named, 'valhalla')).toBe(true);
    expect(matchesSearch(named, 'peaceful')).toBe(true);
    expect(matchesSearch(world(), 'valhalla')).toBe(false);
  });

  it('narrows with every word rather than widening', () => {
    expect(matchesSearch(world(), 'ignies browser')).toBe(true);
    expect(matchesSearch(world(), 'ignies lorencia')).toBe(false);
  });

  it('searches a saved profile by the address it was typed with', () => {
    const saved = world({
      id: 'local',
      name: 'Local (OpenMU)',
      listed: false,
      domain: undefined,
      description: undefined,
      language: undefined,
      version: undefined,
    });

    expect(matchesSearch(saved, '127.0.0.1')).toBe(true);
    expect(matchesSearch(saved, '44405')).toBe(true);
    expect(matchesSearch(saved, 'openmu')).toBe(true);
  });
});

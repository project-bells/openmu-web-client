import { describe, expect, it } from 'vitest';
import { VERSION_REGISTRY, DEFAULT_VERSION_ID } from './registry';
import { gameVersion as season6 } from './season6';
import { versionByTag, versionIdForTag, versionTags } from '../src/version';

/**
 * The client ships only S6EP3, and keeps its wire-visible version values.
 */
describe('version registry', () => {
  it('offers only season6', () => {
    expect(DEFAULT_VERSION_ID).toBe('season6');
    expect(VERSION_REGISTRY.map(v => v.id)).toEqual(['season6']);
    expect(VERSION_REGISTRY.map(v => v.listTag)).toEqual(['S6EP3']);
    expect(versionTags()).toEqual(['S6EP3']);
    expect(versionByTag('V097D')).toBeNull();
    expect(versionIdForTag('V097D')).toBe('season6');
  });

  it('keeps entry metadata in step with the season6 version body', () => {
    for (const entry of VERSION_REGISTRY) {
      expect(entry.label).toBe(season6.label);
      expect(entry.listTag).toBe(season6.listTag);
      expect(entry.id).toBe(season6.id);
    }
  });

  it('gives every version a distinct list tag', () => {
    const tags = VERSION_REGISTRY.map(v => v.listTag.toLowerCase());
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe('season6 is untouched', () => {
  it('keeps its login bytes', () => {
    expect(String.fromCharCode(...season6.clientVersionBytes)).toBe('10404');
    expect(String.fromCharCode(...season6.serialBytes)).toBe('k1Pk2jcET48mxL3b');
  });

  it('keeps the Season 6 Xor keys', () => {
    expect([...season6.protocol.encryption.xor32Key.slice(0, 4)]).toEqual([0xab, 0x11, 0xcd, 0xfe]);
    expect([...season6.protocol.encryption.xor3Key]).toEqual([0xfc, 0xcf, 0xab]);
  });

  it('still prefers the classic layout over every variant', () => {
    const rank = season6.protocol.variantRank;
    expect(rank('AddCharactersToScope')).toBeLessThan(rank('AddCharactersToScope095'));
    expect(rank('AddCharactersToScope')).toBeLessThan(rank('AddCharactersToScope075'));
    expect(rank('AddCharactersToScope')).toBeLessThan(rank('AddCharacterToScopeExtended'));
    expect(rank('CharacterInformation')).toBeLessThan(rank('CharacterInformation097'));
  });
});

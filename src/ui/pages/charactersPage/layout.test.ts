import { describe, expect, it } from 'vitest';
import { hasSpecialCharacters, NAME_MAX_LENGTH, NAME_MIN_LENGTH } from './layout';

describe('character name validation', () => {
  it('matches the server-supported length and character ranges', () => {
    expect(NAME_MIN_LENGTH).toBe(3);
    expect(NAME_MAX_LENGTH).toBe(10);
    expect(hasSpecialCharacters('กขค')).toBe(false);
    expect(hasSpecialCharacters('Knight01')).toBe(false);
  });

  it('rejects characters outside the server-supported ranges', () => {
    expect(hasSpecialCharacters('กข-ค')).toBe(true);
    expect(hasSpecialCharacters('ชื่อ')).toBe(false);
    expect(hasSpecialCharacters('玩家')).toBe(true);
  });
});

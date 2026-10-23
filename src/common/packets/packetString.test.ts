import { describe, expect, it } from 'vitest';
import {
  decodePacketString,
  encodePacketString,
  writePacketString,
} from './packetString';

describe('MU packet strings', () => {
  it('round-trips Thai names through Windows-874', () => {
    const encoded = encodePacketString('กขค');

    expect([...encoded].map(character => character.charCodeAt(0))).toEqual([
      0xa1, 0xa2, 0xa4,
    ]);
    expect(decodePacketString(encoded)).toBe('กขค');
  });

  it('preserves UTF-8 chat bytes for the chat decoder', () => {
    const chatBytes = String.fromCharCode(
      ...new TextEncoder().encode('สวัสดี')
    );

    expect(decodePacketString(chatBytes)).toBe(chatBytes);
  });

  it('writes within the field and zero-pads its unused bytes', () => {
    const buffer = new DataView(new ArrayBuffer(4));
    writePacketString(buffer, 1, 2, 'กขค');

    expect([...new Uint8Array(buffer.buffer)]).toEqual([0, 0xa1, 0xa2, 0]);
  });
});

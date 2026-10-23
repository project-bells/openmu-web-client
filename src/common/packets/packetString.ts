const CP874_DECODED_START = 0x0e01;
const CP874_ENCODED_START = 0xa1;

function decodeWindows874Byte(byte: number): number | null {
  if (byte <= 0x7f) return byte;
  if (byte >= 0xa1 && byte <= 0xda) {
    return CP874_DECODED_START + byte - CP874_ENCODED_START;
  }
  if (byte === 0xdf) return 0x0e3f;
  if (byte >= 0xe0 && byte <= 0xfb) return 0x0e40 + byte - 0xe0;
  return null;
}

function encodeWindows874CodePoint(codePoint: number): number | null {
  if (codePoint <= 0x7f) return codePoint;
  if (codePoint >= 0x0e01 && codePoint <= 0x0e3a) {
    return CP874_ENCODED_START + codePoint - CP874_DECODED_START;
  }
  if (codePoint === 0x0e3f) return 0xdf;
  if (codePoint >= 0x0e40 && codePoint <= 0x0e5b) {
    return 0xe0 + codePoint - 0x0e40;
  }
  if (codePoint <= 0xff) return codePoint;
  return null;
}

/**
 * Identity fields in OpenMU's MU protocol use Windows-874. Chat packets are
 * UTF-8 byte strings, so only decode a string when every extended byte is a
 * valid Windows-874 Thai/ASCII byte; otherwise preserve its original bytes.
 */
export function decodePacketString(value: string): string {
  let decoded = '';
  let hasThaiByte = false;

  for (let i = 0; i < value.length; i++) {
    const byte = value.charCodeAt(i);
    const codePoint = decodeWindows874Byte(byte);
    if (codePoint === null) return value;
    if (byte > 0x7f) hasThaiByte = true;
    decoded += String.fromCodePoint(codePoint);
  }

  return hasThaiByte ? decoded : value;
}

/** Encodes Thai text as the single-byte Windows-874 form used by MU names. */
export function encodePacketString(value: string): string {
  let encoded = '';

  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const byte = encodeWindows874CodePoint(codePoint);
    encoded += String.fromCharCode(byte ?? 0x3f);
  }

  return encoded;
}

/** Writes a packet string without crossing its field or packet boundary. */
export function writePacketString(
  buffer: DataView,
  offset: number,
  count: number,
  value: string
): void {
  const fieldLength = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : buffer.byteLength - offset;
  const length = Math.min(fieldLength, buffer.byteLength - offset);
  const encoded = encodePacketString(value);

  for (let i = 0; i < length; i++) {
    buffer.setUint8(offset + i, i < encoded.length ? encoded.charCodeAt(i) : 0);
  }
}

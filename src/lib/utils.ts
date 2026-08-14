import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compute MD5 hash of an email and return a Gravatar URL.
 * Falls back to `retro` identicon for users without a Gravatar.
 * Uses a pure JavaScript MD5 implementation since `crypto.subtle.digest`
 * does not support MD5.
 */
export async function getGravatarUrl(email: string, size = 64): Promise<string | undefined> {
  try {
    const normalized = email.toLowerCase().trim()
    const hashHex = md5(normalized)
    return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=retro`
  } catch {
    return undefined
  }
}

/**
 * Pure JavaScript MD5 hash function (public domain).
 * Computes the MD5 digest of an arbitrary string and returns the hex-encoded hash.
 */
function md5(str: string): string {
  const rotateLeft = (x: number, n: number) => (x << n) | (x >>> (32 - n))

  const toUTF8Bytes = (s: string): number[] => {
    const bytes: number[] = []
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i)
      if (c < 0x80) {
        bytes.push(c)
      } else if (c < 0x800) {
        bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      } else if (c < 0xd800 || c >= 0xe000) {
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
      } else {
        i++
        c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff))
        bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
      }
    }
    return bytes
  }

  const toHex = (n: number): string => {
    const hex = '0123456789abcdef'
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += hex.charAt((n >> (i * 8 + 4)) & 0x0f) + hex.charAt((n >> (i * 8)) & 0x0f)
    }
    return s
  }

  // Per-round shift amounts
  const s: number[] = []
  for (let i = 0; i < 64; i++) {
    s[i] = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
            5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
            4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
            6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21][i]
  }

  // Use sine-based constants for K
  const K: number[] = []
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000)
  }

  const bytes = toUTF8Bytes(str)
  const originalLengthBits = bytes.length * 8

  // Pad the message
  bytes.push(0x80)
  while ((bytes.length * 8) % 512 !== 448) {
    bytes.push(0)
  }
  // Append original length as 64-bit little-endian
  for (let i = 0; i < 8; i++) {
    bytes.push((originalLengthBits >>> (i * 8)) & 0xff)
  }

  // Initialise hash variables
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  // Process each 512-bit chunk
  for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
    const M: number[] = []
    for (let i = 0; i < 16; i++) {
      M[i] = bytes[chunkStart + i * 4] |
             (bytes[chunkStart + i * 4 + 1] << 8) |
             (bytes[chunkStart + i * 4 + 2] << 16) |
             (bytes[chunkStart + i * 4 + 3] << 24)
    }

    let A = a0
    let B = b0
    let C = c0
    let D = d0

    for (let i = 0; i < 64; i++) {
      let F: number
      let g: number
      if (i < 16) {
        F = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        F = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        F = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * i) % 16
      }

      F = (F + A + K[i] + M[g]) | 0
      A = D
      D = C
      C = B
      B = (B + rotateLeft(F, s[i])) | 0
    }

    a0 = (a0 + A) | 0
    b0 = (b0 + B) | 0
    c0 = (c0 + C) | 0
    d0 = (d0 + D) | 0
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0)
}

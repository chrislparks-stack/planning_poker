import { compress, decompress } from "lz4js";

export function compressMessage(html: string): string {
  const utf8 = new TextEncoder().encode(html);

  // Compress
  const compressed = compress(utf8);

  let binary = "";
  const chunkSize = 0x8000; // prevents call stack overflow
  for (let i = 0; i < compressed.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      compressed.subarray(i, i + chunkSize) as any
    );
  }
  return btoa(binary);
}

export function decompressMessage(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const decompressed = decompress(bytes);
  return new TextDecoder().decode(decompressed);
}
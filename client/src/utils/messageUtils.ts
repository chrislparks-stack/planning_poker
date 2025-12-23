import { compress, decompress } from "lz4js";
import {ChatMessage} from "@/types";

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

export function safeDecompressMessage(msg: ChatMessage): ChatMessage {
  let decompressed = msg.formattedContent || msg.content;
  try {
    const likelyBase64 =
      /^[A-Za-z0-9+/=]+$/.test(decompressed) &&
      decompressed.length % 4 === 0 &&
      /[A-Za-z0-9+/]{10,}/.test(decompressed) &&
      !/\s/.test(decompressed);

    if (likelyBase64 && decompressed.length > 64) {
      const result = decompressMessage(decompressed);
      if (result && /[ -~]/.test(result.slice(0, 10))) {
        decompressed = result;
      }
    }
  } catch (err) {
    console.warn("Decompression failed:", err);
  }

  return { ...msg, formattedContent: decompressed };
}

type ClampValue = number | string;

const toCss = (v: ClampValue) =>
  typeof v === "number" ? `${v}px` : v;

export const clamp = (
  min: ClampValue,
  value: ClampValue,
  max: ClampValue
): ClampValue => {
  const allNumbers =
    typeof min === "number" &&
    typeof value === "number" &&
    typeof max === "number";

  // Pure numeric → JS clamp
  if (allNumbers) {
    return Math.min(max, Math.max(min, value));
  }

  // Anything else → CSS clamp
  return `clamp(${toCss(min)}, ${toCss(value)}, ${toCss(max)})`;
};


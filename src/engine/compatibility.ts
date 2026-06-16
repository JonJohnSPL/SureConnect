import type { Port } from "./types";

export function typesCompatible(a: Port, b: Port): boolean {
  if (a.type === b.type) return true;
  const pair = [a.type, b.type].sort().join("|");
  return pair === "tube_end|tube_receiver";
}

export function sizesCompatible(a: Port, b: Port): boolean {
  return !a.size || !b.size || a.size === b.size;
}

export function gendersCompatible(a: Port, b: Port): boolean {
  const pair = [a.gender, b.gender].sort().join("|");
  return [
    "female|male",
    "receiver|tube",
    "plug|socket",
    "bidirectional|bidirectional",
    "none|none",
  ].includes(pair);
}

export function threadCompatible(a: Port, b: Port): boolean {
  if (a.type !== "NPT" && b.type !== "NPT") return true;
  return Boolean(a.thread && b.thread && a.thread === b.thread);
}


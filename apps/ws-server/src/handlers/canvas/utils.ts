import { Element } from "../../types";

export function shouldReplace(existing: Element, incoming: Element): boolean {
  return (
    incoming.version > existing.version ||
    (incoming.version === existing.version &&
      incoming.versionNonce > existing.versionNonce)
  );
}

export function mergeElementPatch(
  existing: Element | undefined,
  patch: Partial<Element>,
): Element | null {
  if (!existing) {
    if (
      !patch.id ||
      !patch.type ||
      patch.version === undefined ||
      patch.versionNonce === undefined
    ) {
      return null;
    }

    return {
      id: patch.id,
      type: patch.type,
      x: patch.x ?? 0,
      y: patch.y ?? 0,
      width: patch.width ?? 0,
      height: patch.height ?? 0,
      color: patch.color ?? "#000000",
      angle: patch.angle ?? 0,
      text: patch.text ?? "",
      seed: patch.seed ?? 0,
      version: patch.version,
      versionNonce: patch.versionNonce,
      deleted: patch.deleted ?? false,
      updatedAt: patch.updatedAt ?? Date.now(),
    };
  }

  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined),
    ),
    deleted: patch.deleted ?? existing.deleted,
    updatedAt: patch.updatedAt ?? Date.now(),
  };
}

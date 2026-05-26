export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomValues =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint32Array(2))
      : null;
  const randomPart = randomValues
    ? `${randomValues[0].toString(36)}${randomValues[1].toString(36)}`
    : Math.random().toString(36).slice(2);

  return `${Date.now().toString(36)}-${randomPart}`;
}

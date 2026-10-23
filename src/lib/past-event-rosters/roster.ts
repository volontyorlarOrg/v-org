export const ROSTER_LIMIT = 100;

const USERNAME = /^[a-z0-9_]{3,32}$/;

export function usernamesIn(text: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const name = raw.replace(/^@+/, "").toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    (USERNAME.test(name) ? valid : invalid).push(name);
  }
  return { valid, invalid };
}

export function rosterTotals(
  participants: readonly { hours: string; xpAwarded: string }[],
) {
  const number = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    count: participants.length,
    hours:
      Math.round(
        participants.reduce((sum, person) => sum + number(person.hours), 0) * 100,
      ) / 100,
    xp: participants.reduce((sum, person) => sum + number(person.xpAwarded), 0),
    zeroHours: participants.filter((person) => number(person.hours) === 0).length,
  };
}

export const AMOUNT_PATTERNS = {
  hours: /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/,
  xpAwarded: /^\d{1,6}$/,
} as const;

export function amountProblem(
  key: keyof typeof AMOUNT_PATTERNS,
  value: string,
): "hoursAmount" | "xpAmount" | null {
  const trimmed = value.trim();
  if (key === "hours")
    return AMOUNT_PATTERNS.hours.test(trimmed) ? null : "hoursAmount";
  return AMOUNT_PATTERNS.xpAwarded.test(trimmed) && Number(trimmed) <= 100_000
    ? null
    : "xpAmount";
}

export function filled(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

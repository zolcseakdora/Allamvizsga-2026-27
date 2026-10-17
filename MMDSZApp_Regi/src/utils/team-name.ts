export function normalizeTeamName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function teamNameKey(name: string) {
  return normalizeTeamName(name).toLowerCase();
}

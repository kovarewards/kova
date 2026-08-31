const METERS_PER_FOOT = 0.3048;
const FEET_PER_MILE = 5280;

export function formatDistance(meters: number): string {
  const feet = meters / METERS_PER_FOOT;
  if (feet < FEET_PER_MILE * 0.1) {
    return `${Math.round(feet)}ft`;
  }
  return `${(feet / FEET_PER_MILE).toFixed(1)}mi`;
}

export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

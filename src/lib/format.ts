const METERS_PER_FOOT = 0.3048;
const FEET_PER_MILE = 5280;

export function formatDistance(meters: number): string {
  const feet = meters / METERS_PER_FOOT;
  if (feet < FEET_PER_MILE * 0.1) {
    return `${Math.round(feet)}ft`;
  }
  return `${(feet / FEET_PER_MILE).toFixed(1)}mi`;
}

export function formatMinutesToHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export function getAutoBreakMinutes(
  startH: string, startM: string, endH: string, endM: string, threshold: number, deduction: number
): number {
  if (threshold <= 0) return 0;
  const s = parseInt(startH || '0') * 60 + parseInt(startM || '0');
  let e = parseInt(endH || '0') * 60 + parseInt(endM || '0');
  if (e < s) e += 24 * 60;
  const duration = e - s;
  if (duration >= threshold) return deduction;
  return 0;
}
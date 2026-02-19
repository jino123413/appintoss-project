export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

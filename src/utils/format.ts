import i18n from '@/i18n';
import { LABEL_PALETTE } from '@/data/constants';

const lang = () => i18n.language || 'en';

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['minute', 60],
  ['hour', 3600],
  ['day', 86400],
];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses an ISO string. A bare "YYYY-MM-DD" is read as local midnight of that
 * day; `new Date()` would read it as UTC midnight, a day early west of UTC.
 */
function parseIso(iso: string): Date {
  if (DATE_ONLY_RE.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  // Older tickets stored only the day; "17h ago" would be made up, so show the date.
  if (DATE_ONLY_RE.test(iso)) return formatDate(iso);
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return i18n.t('time.justNow');
  if (diff >= 604800) return d.toLocaleDateString(lang());
  const rtf = new Intl.RelativeTimeFormat(lang(), { numeric: 'always', style: 'narrow' });
  for (let i = RELATIVE_STEPS.length - 1; i >= 0; i--) {
    const [unit, seconds] = RELATIVE_STEPS[i];
    if (diff >= seconds) return rtf.format(-Math.floor(diff / seconds), unit);
  }
  return i18n.t('time.justNow');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return parseIso(iso).toLocaleDateString(lang(), { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return parseIso(iso).toLocaleString(lang());
}

export function labelColor(name: string): string {
  const found = LABEL_PALETTE.find((l) => l.name === name);
  return found?.color || '#607d8b';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return `oklch(0.62 0.12 ${h})`;
}

/** "0 B", "512 KB", "3.4 MB", "1.2 GB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

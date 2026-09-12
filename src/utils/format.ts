import i18n from '@/i18n';
import { LABEL_PALETTE } from '@/data/constants';

const lang = () => i18n.language || 'en';

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['minute', 60],
  ['hour', 3600],
  ['day', 86400],
];

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
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
  return new Date(iso).toLocaleDateString(lang(), { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(lang());
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

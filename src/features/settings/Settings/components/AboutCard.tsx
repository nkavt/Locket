import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { APP_VERSION } from '@/data/constants';
import { monoFontFamily } from '@/theme';

const electronVersion = navigator.userAgent.match(/Electron\/(\S+)/)?.[1];

export function AboutCard() {
  const { t } = useTranslation();
  const runtime = electronVersion ? `electron ${electronVersion}` : t('settings.about.browser');
  return (
    <SettingsCard title={t('settings.about.title')}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, fontSize: 13 }}>
        <Box sx={{ color: 'text.disabled' }}>{t('settings.about.version')}</Box>
        <Box sx={{ fontFamily: monoFontFamily }}>{APP_VERSION}</Box>
        <Box sx={{ color: 'text.disabled' }}>{t('settings.about.runtime')}</Box>
        <Box sx={{ fontFamily: monoFontFamily }}>{runtime}</Box>
        <Box sx={{ color: 'text.disabled' }}>{t('settings.about.platform')}</Box>
        <Box sx={{ fontFamily: monoFontFamily }}>
          {navigator.platform || t('settings.about.unknown')}
        </Box>
      </Box>
    </SettingsCard>
  );
}

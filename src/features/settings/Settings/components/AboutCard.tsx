import { Box, Button } from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { Icon } from '@/components/Icon';
import { APP_VERSION } from '@/data/constants';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';
import type { SystemInfo } from '@/types/electron-api';
import { formatAboutLine, formatPlatform } from '../../about';

/** Real OS and runtime versions from the main process; null in the browser build. */
function useSystemInfo(): SystemInfo | null {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  useEffect(() => {
    if (!window.locket?.system) return;
    let cancelled = false;
    void window.locket.system.info().then((i) => {
      if (!cancelled) setInfo(i);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}

export function AboutCard() {
  const { t } = useTranslation();
  const snack = useSnackbar();
  const info = useSystemInfo();

  const rows: [string, string][] = info
    ? [
        [t('settings.about.version'), APP_VERSION],
        [t('settings.about.runtime'), `Electron ${info.versions.electron}`],
        [t('settings.about.chromium'), info.versions.chrome],
        [t('settings.about.node'), info.versions.node],
        [t('settings.about.platform'), formatPlatform(info)],
      ]
    : [
        [t('settings.about.version'), APP_VERSION],
        [t('settings.about.runtime'), t('settings.about.browser')],
        [t('settings.about.platform'), t('settings.about.unknown')],
      ];

  const copy = () => {
    if (!info) return;
    void navigator.clipboard?.writeText(formatAboutLine(APP_VERSION, info));
    snack(t('settings.about.copied'));
  };

  return (
    <SettingsCard title={t('settings.about.title')}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, fontSize: 13 }}>
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <Box sx={{ color: 'text.disabled' }}>{label}</Box>
            <Box sx={{ fontFamily: monoFontFamily }}>{value}</Box>
          </Fragment>
        ))}
      </Box>
      {info && (
        <Button
          size="small"
          onClick={copy}
          startIcon={<Icon name="content_copy" size={16} />}
          sx={{ mt: 1.5, ml: -0.75 }}
        >
          {t('settings.about.copy')}
        </Button>
      )}
    </SettingsCard>
  );
}

import { Alert, Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { Icon } from '@/components/Icon';
import { SectionLabel } from '@/components/SectionLabel';
import { TextInput } from '@/components/ui';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';
import { useMcp } from '../../useMcp';
import type { SettingsFormValues } from '../Settings';

const formatTs = (iso: string) => new Date(iso).toLocaleTimeString();

export function McpServerCard() {
  const { state, setSettings } = useAppState();
  const { mcpPort } = state.settings;
  const snack = useSnackbar();
  const { t } = useTranslation();
  const mcp = useMcp();
  const [busy, setBusy] = useState(false);
  const {
    register,
    formState: { errors, isValid, dirtyFields },
  } = useFormContext<SettingsFormValues>();

  const running = mcp.status.running;

  // Mirror the real server state into app settings for anything else that reads it.
  useEffect(() => {
    if (state.settings.mcpRunning !== running) setSettings({ mcpRunning: running });
  }, [running, state.settings.mcpRunning, setSettings]);

  const start = async () => {
    setBusy(true);
    try {
      await mcp.start(mcpPort);
      snack(t('settings.mcp.started'), { severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      snack(t('settings.mcp.startFailed', { message }), { severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await mcp.stop();
      snack(t('settings.mcp.stoppedSnack'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title={t('settings.mcp.title')} subtitle={t('settings.mcp.subtitle')}>
      {!mcp.available && (
        <Alert severity="info" sx={{ marginBottom: 2 }}>
          {t('settings.mcp.unavailable')}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: running ? 'success.main' : 'text.disabled',
            animation: running ? 'pulseDot 2s infinite' : 'none',
          }}
        />
        <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>
          {running ? t('settings.mcp.running') : t('settings.mcp.stopped')}
        </Typography>
        {running && mcp.status.url && (
          <Box
            component="code"
            title={t('settings.mcp.connectHint')}
            sx={{
              fontFamily: monoFontFamily,
              fontSize: 12,
              background: 'action.hover',
              padding: '3px 8px',
              borderRadius: '4px',
              color: 'text.secondary',
            }}
          >
            {mcp.status.url}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ width: 180 }}>
          <TextInput
            label={t('settings.mcp.port')}
            size="small"
            disabled={running}
            {...register('port', {
              validate: (v) => {
                const n = Number(v);
                return Number.isInteger(n) && n >= 1024 && n <= 65535;
              },
            })}
            helperText={errors.port ? t('settings.mcp.portInvalid') : t('settings.mcp.portRange')}
            error={!!errors.port}
          />
        </Box>
        <Box sx={{ paddingTop: 0.5, display: 'flex', gap: 1 }}>
          {!running ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<Icon name="play_arrow" size={18} />}
              onClick={start}
              disabled={!mcp.available || busy || !!dirtyFields.port || !isValid}
            >
              {t('settings.mcp.start')}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<Icon name="stop" size={18} />}
              onClick={stop}
              disabled={busy}
            >
              {t('settings.mcp.stop')}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ marginTop: 2.25 }}>
        <SectionLabel sx={{ marginBottom: 0.75 }}>{t('settings.mcp.recentActivity')}</SectionLabel>
        <Box
          sx={{
            background: '#0d1117',
            color: '#c9d1d9',
            border: 1,
            borderColor: 'divider',
            borderRadius: '6px',
            padding: '10px 14px',
            minHeight: 130,
            maxHeight: 220,
            overflowY: 'auto',
            fontFamily: monoFontFamily,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          {mcp.logs.length === 0 ? (
            <Box sx={{ color: '#6e7681' }}>{t('settings.mcp.idle')}</Box>
          ) : (
            mcp.logs.map((l, i) => (
              <Box key={`${l.ts}-${i}`}>
                <Box component="span" sx={{ color: '#6e7681' }}>
                  {formatTs(l.ts)}
                </Box>
                <Box component="span" sx={{ color: '#79c0ff', mx: 1 }}>
                  ›
                </Box>
                <Box component="span">{l.line}</Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </SettingsCard>
  );
}

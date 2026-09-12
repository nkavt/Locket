import { Box, Button, Typography } from '@mui/material';
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
import type { SettingsFormValues } from '../Settings';

interface LogLine {
  ts: string;
  line: string;
}

const now = () => new Date().toLocaleTimeString();

// NOTE: the server itself is not implemented yet; this card simulates
// activity so the UI can be designed against it.
const SAMPLE_ACTIVITY = [
  'tools/list → 6 tools',
  'tools/call list_projects',
  'tools/call get_ticket lkt-2',
  'resources/list → 12 markdown resources',
  'tools/call create_comment lkt-3',
];

export function McpServerCard() {
  const { state, setSettings } = useAppState();
  const { mcpRunning, mcpPort } = state.settings;
  const snack = useSnackbar();
  const { t } = useTranslation();
  const {
    register,
    formState: { errors, isValid, dirtyFields },
  } = useFormContext<SettingsFormValues>();
  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    if (!mcpRunning) return;
    let i = 0;
    const id = window.setInterval(() => {
      setLogs((ls) => [
        ...ls.slice(-30),
        { ts: now(), line: SAMPLE_ACTIVITY[i % SAMPLE_ACTIVITY.length] },
      ]);
      i++;
    }, 2400);
    return () => window.clearInterval(id);
  }, [mcpRunning]);

  const start = () => {
    setSettings({ mcpRunning: true });
    setLogs([
      { ts: now(), line: `MCP server started on port ${mcpPort}` },
      { ts: now(), line: 'Listening for SSE connections…' },
    ]);
    snack(t('settings.mcp.started'), { severity: 'success' });
  };
  const stop = () => {
    setSettings({ mcpRunning: false });
    setLogs((ls) => [...ls, { ts: now(), line: 'MCP server stopped.' }]);
    snack(t('settings.mcp.stoppedSnack'));
  };

  return (
    <SettingsCard title={t('settings.mcp.title')} subtitle={t('settings.mcp.subtitle')}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: mcpRunning ? 'success.main' : 'text.disabled',
            animation: mcpRunning ? 'pulseDot 2s infinite' : 'none',
          }}
        />
        <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>
          {mcpRunning ? t('settings.mcp.running') : t('settings.mcp.stopped')}
        </Typography>
        {mcpRunning && (
          <Box
            component="code"
            sx={{
              fontFamily: monoFontFamily,
              fontSize: 12,
              background: 'action.hover',
              padding: '3px 8px',
              borderRadius: '4px',
              color: 'text.secondary',
            }}
          >
            http://127.0.0.1:{mcpPort}/mcp
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ width: 180 }}>
          <TextInput
            label={t('settings.mcp.port')}
            size="small"
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
          {!mcpRunning ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<Icon name="play_arrow" size={18} />}
              onClick={start}
              disabled={!!dirtyFields.port || !isValid}
            >
              {t('settings.mcp.start')}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<Icon name="stop" size={18} />}
              onClick={stop}
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
          {logs.length === 0 ? (
            <Box sx={{ color: '#6e7681' }}>{t('settings.mcp.idle')}</Box>
          ) : (
            logs.map((l, i) => (
              <Box key={i}>
                <Box component="span" sx={{ color: '#6e7681' }}>
                  {l.ts}
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

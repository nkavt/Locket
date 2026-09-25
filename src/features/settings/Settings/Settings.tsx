import { Box, Button, Typography } from '@mui/material';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { McpServerCard } from './components/McpServerCard';
import { StorageCard } from './components/StorageCard';
import { AboutCard } from './components/AboutCard';
import { Icon } from '@/components/Icon';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';

export interface SettingsFormValues {
  port: string;
}

const DEFAULT_PORT = 7821;

export function Settings() {
  const { state, setSettings } = useAppState();
  const { settings } = state;
  const snack = useSnackbar();
  const { t } = useTranslation();

  const form = useForm<SettingsFormValues>({
    mode: 'onChange',
    defaultValues: { port: String(settings.mcpPort || DEFAULT_PORT) },
  });
  const {
    reset,
    getValues,
    formState: { isValid, isDirty },
  } = form;

  // Keep the form in sync when persisted settings arrive from Electron,
  // without clobbering fields the user is editing.
  useEffect(() => {
    reset({ port: String(settings.mcpPort || DEFAULT_PORT) }, { keepDirtyValues: true });
  }, [settings.mcpPort, reset]);

  const handleSave = () => {
    if (!isValid) return;
    const port = Number(getValues('port'));
    setSettings({ mcpPort: port });
    reset({ port: String(port) }, { keepValues: true });
    snack(t('settings.saved'), { severity: 'success' });
  };

  const handleDiscard = () => reset({ port: String(settings.mcpPort || DEFAULT_PORT) });

  return (
    <FormProvider {...form}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ padding: '20px 28px 14px', borderBottom: 1, borderColor: 'divider' }}>
          <Typography component="h1" sx={{ m: 0, fontSize: 20, fontWeight: 500 }}>
            {t('settings.title')}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', marginTop: 0.5 }}>
            {t('settings.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px' }}>
          <Box sx={{ maxWidth: 720 }}>
            <McpServerCard />
            <StorageCard />
            <AboutCard />
          </Box>
        </Box>

        <Box
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            background: 'background.paper',
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.25,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', marginRight: 'auto' }}>
            {isDirty ? t('settings.unsaved') : t('settings.allSaved')}
          </Typography>
          <Button variant="text" onClick={handleDiscard} disabled={!isDirty}>
            {t('settings.discard')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!isDirty || !isValid}
            startIcon={<Icon name="save" size={18} />}
          >
            {t('settings.saveChanges')}
          </Button>
        </Box>
      </Box>
    </FormProvider>
  );
}

import { Box, Button } from '@mui/material';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/ui';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';
import type { SettingsFormValues } from '../Settings';

export function StorageCard() {
  const { resetData } = useAppState();
  const snack = useSnackbar();
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext<SettingsFormValues>();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <SettingsCard title={t('settings.storage.title')} subtitle={t('settings.storage.subtitle')}>
      <Box sx={{ marginBottom: 1.5 }}>
        <TextInput
          label={t('settings.storage.workspacePath')}
          size="small"
          fullWidth
          {...register('workspacePath', { validate: (v) => v.trim().length > 0 })}
          helperText={
            errors.workspacePath
              ? t('settings.storage.workspacePathEmpty')
              : t('settings.storage.workspacePathHint')
          }
          error={!!errors.workspacePath}
          sx={{ '& .MuiInputBase-input': { fontFamily: monoFontFamily, fontSize: 12.5 } }}
        />
      </Box>
      <Button
        variant="outlined"
        color="error"
        startIcon={<Icon name="restart_alt" size={18} />}
        onClick={() => setConfirmReset(true)}
      >
        {t('settings.storage.reset')}
      </Button>

      <ConfirmDialog
        open={confirmReset}
        title={t('settings.storage.resetConfirm.title')}
        message={t('settings.storage.resetConfirm.message')}
        confirmLabel={t('settings.storage.resetConfirm.confirm')}
        danger
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          snack(t('settings.storage.resetDone'), { severity: 'success' });
        }}
      />
    </SettingsCard>
  );
}

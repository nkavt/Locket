import { Button } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';

export function StorageCard() {
  const { resetData } = useAppState();
  const snack = useSnackbar();
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <SettingsCard title={t('settings.storage.title')} subtitle={t('settings.storage.subtitle')}>
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

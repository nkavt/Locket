import { Box, Button, Divider, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import type { AttachmentUsage } from '@/types/electron-api';
import { formatBytes } from '@/utils/format';

/** One line of the card: what it is and its state on the left, actions on the right. */
function Row({
  title,
  detail,
  children,
}: {
  title: string;
  detail: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{title}</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{detail}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>{children}</Box>
    </Box>
  );
}

/**
 * Image disk usage and the manual cleanup. Only in Electron, where images are files.
 * Measuring walks the whole attachments folder, so it runs when asked, not on open.
 */
function ImagesRow() {
  const { t } = useTranslation();
  const snack = useSnackbar();
  const [usage, setUsage] = useState<AttachmentUsage | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      snack((err as Error).message, { severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const calculate = () =>
    run(async () => {
      setUsage(await window.locket.attachments.usage());
    });

  const cleanUp = () =>
    run(async () => {
      const r = await window.locket.attachments.cleanUp();
      snack(
        r.removedFiles
          ? t('settings.storage.cleanedUp', {
              count: r.removedFiles,
              size: formatBytes(r.freedBytes),
            })
          : t('settings.storage.nothingToClean'),
        { severity: 'success' },
      );
      setUsage(await window.locket.attachments.usage());
    });

  const detail = !usage
    ? t('settings.storage.notCalculated')
    : [
        t('settings.storage.images', { count: usage.files, size: formatBytes(usage.bytes) }),
        usage.unusedFiles
          ? t('settings.storage.leftover', {
              count: usage.unusedFiles,
              size: formatBytes(usage.unusedBytes),
            })
          : t('settings.storage.noLeftover'),
      ].join(' · ');

  return (
    <Row title={t('settings.storage.imagesTitle')} detail={detail}>
      <Button size="small" variant="text" disabled={busy} onClick={() => void calculate()}>
        {usage ? t('settings.storage.recalculate') : t('settings.storage.calculate')}
      </Button>
      {!!usage?.unusedFiles && (
        <Button size="small" variant="outlined" disabled={busy} onClick={() => void cleanUp()}>
          {t('settings.storage.cleanUp')}
        </Button>
      )}
    </Row>
  );
}

export function StorageCard() {
  const { resetData } = useAppState();
  const snack = useSnackbar();
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const hasFiles = typeof window !== 'undefined' && !!window.locket?.attachments;

  return (
    <SettingsCard title={t('settings.storage.title')} subtitle={t('settings.storage.subtitle')}>
      {hasFiles && (
        <>
          <ImagesRow />
          <Divider />
        </>
      )}
      <Row title={t('settings.storage.reset')} detail={t('settings.storage.resetDetail')}>
        <Button size="small" variant="outlined" color="error" onClick={() => setConfirmReset(true)}>
          {t('settings.storage.resetAction')}
        </Button>
      </Row>

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

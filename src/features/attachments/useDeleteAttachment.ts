import { useTranslation } from 'react-i18next';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';

/** Delete one image of a ticket and say how it went. */
export function useDeleteAttachment(ticketId: string) {
  const { deleteAttachment } = useAppState();
  const snack = useSnackbar();
  const { t } = useTranslation();
  return async (name: string) => {
    try {
      await deleteAttachment(ticketId, name);
      snack(t('attachments.removed'), { severity: 'success' });
    } catch (err) {
      snack((err as Error).message, { severity: 'error' });
    }
  };
}

import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CommentItem } from './components/CommentItem';
import { CommentComposer } from './components/CommentComposer';
import { Icon } from '@/components/Icon';
import { ticketNames } from '@/features/attachments/names';
import { imageUsage } from '@/features/attachments/usage';
import { useDeleteAttachment } from '@/features/attachments/useDeleteAttachment';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import type { Ticket } from '@/data/types';

interface CommentsThreadProps {
  ticket: Ticket;
}

export function CommentsThread({ ticket }: CommentsThreadProps) {
  const { t } = useTranslation();
  const { addComment, deleteComment } = useAppState();
  const snack = useSnackbar();
  const comments = ticket.comments || [];
  const usedIn = imageUsage(
    ticket.description || '',
    comments.map((c) => c.body),
  );
  const removeImage = useDeleteAttachment(ticket.id);

  return (
    <Box sx={{ marginTop: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1.75 }}>
        <Icon name="forum" size={18} sx={{ color: 'text.secondary' }} />
        <Typography
          sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', letterSpacing: '0.02em' }}
        >
          {t('comments.title')}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{comments.length}</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, marginBottom: 2.25 }}>
        {comments.length === 0 && (
          <Typography
            sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic', padding: '8px 0' }}
          >
            {t('comments.empty')}
          </Typography>
        )}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            usedIn={usedIn}
            onDelete={() => deleteComment(ticket.id, c.id)}
            onRemoveAttachment={(name) => void removeImage(name)}
          />
        ))}
      </Box>

      <CommentComposer
        takenNames={ticketNames(ticket)}
        onSubmit={(body, attachments) =>
          addComment(ticket.id, body, undefined, attachments).catch((err: Error) => {
            snack(t('attachments.failed', { message: err.message }), { severity: 'error' });
            throw err;
          })
        }
      />
    </Box>
  );
}

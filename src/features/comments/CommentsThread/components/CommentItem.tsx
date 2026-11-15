import { Avatar, Box, IconButton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { Markdown } from '@/components/Markdown';
import { AttachmentGrid, type GridItem } from '@/features/attachments/AttachmentGrid';
import { referencedNames } from '@/features/attachments/files';
import { avatarColor, formatDateTime, initials, relativeTime } from '@/utils/format';
import type { Comment } from '@/data/types';

interface CommentItemProps {
  comment: Comment;
  /** Where an image is shown inline on the ticket, if anywhere: those cannot be deleted. */
  usedIn?: (name: string) => GridItem['usedIn'];
  onDelete: () => void;
  onRemoveAttachment?: (name: string) => void;
}

export function CommentItem({ comment, usedIn, onDelete, onRemoveAttachment }: CommentItemProps) {
  const { t } = useTranslation();
  // An image the body already shows inline isn't repeated as a thumbnail. It couldn't be
  // deleted from there anyway while the body uses it.
  const inline = referencedNames(comment.body);
  const attached = (comment.attachments ?? [])
    .filter((a) => !inline.has(a.name))
    .map((a): GridItem => ({ name: a.name, usedIn: usedIn?.(a.name) }));
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        '&:hover .comment-delete, &:focus-within .comment-delete': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      <Avatar sx={{ width: 32, height: 32, background: avatarColor(comment.author), fontSize: 13 }}>
        {initials(comment.author)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{comment.author}</Typography>
          <Typography
            sx={{ fontSize: 11.5, color: 'text.disabled' }}
            title={formatDateTime(comment.ts)}
          >
            {relativeTime(comment.ts)}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {/* Always mounted so it never changes the row's layout; shown on hover or focus.
              The negative margin keeps the ~30px button from making the header taller than its text. */}
          <IconButton
            className="comment-delete"
            size="small"
            onClick={onDelete}
            title={t('common.delete')}
            aria-label={t('common.delete')}
            sx={{ my: -0.75, opacity: 0, pointerEvents: 'none', transition: 'opacity 120ms' }}
          >
            <Icon name="delete_outline" size={18} />
          </IconButton>
        </Box>
        {comment.body && (
          <Box sx={{ mt: 0.5 }}>
            <Markdown source={comment.body} fontSize={13.5} imageMaxHeight={360} />
          </Box>
        )}
        {attached.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <AttachmentGrid
              size="small"
              items={attached}
              onRemove={onRemoveAttachment && ((item) => onRemoveAttachment(item.name))}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

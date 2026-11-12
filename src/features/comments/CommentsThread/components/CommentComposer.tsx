import { Avatar, Box, Button, IconButton, Tooltip } from '@mui/material';
import { useRef, useState, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { AttachmentGrid } from '@/features/attachments/AttachmentGrid';
import { usePendingAttachments } from '@/features/attachments/usePendingAttachments';
import { useCurrentUser } from '@/state/useCurrentUser';
import type { NewAttachment } from '@/types/electron-api';
import { avatarColor, initials } from '@/utils/format';

interface CommentComposerProps {
  /** Image names already on the ticket, so new ones get a free name. */
  takenNames?: Set<string>;
  /** Rejecting keeps the draft in place. */
  onSubmit: (body: string, attachments: NewAttachment[]) => Promise<void> | void;
}

export function CommentComposer({ takenNames, onSubmit }: CommentComposerProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const images = usePendingAttachments(draft, setDraft, textarea, takenNames);
  const currentUser = useCurrentUser();
  const { t } = useTranslation();

  const canSubmit = !!draft.trim() || images.pending.length > 0;

  const clear = () => {
    setDraft('');
    images.reset();
    setFocused(false);
  };

  const submit = async () => {
    if (!canSubmit) return;
    try {
      // Sent as typed: leading or trailing blank lines may be intentional.
      await onSubmit(draft, images.toSave());
      clear();
    } catch {
      // Keep the draft and images so nothing is lost; the caller reports the error.
    }
  };

  const insert = (text: string) => setDraft((d) => d + text);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Avatar sx={{ width: 32, height: 32, background: avatarColor(currentUser), fontSize: 13 }}>
        {initials(currentUser)}
      </Avatar>
      <Box
        sx={{ flex: 1 }}
        // Collapse only when focus leaves the whole composer, so toolbar
        // buttons stay clickable while the draft is still empty.
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          if (!draft && images.pending.length === 0) setFocused(false);
        }}
        {...images.dropProps}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: 1,
            borderStyle: images.dragging ? 'dashed' : 'solid',
            borderColor: focused || images.dragging ? 'primary.main' : 'divider',
            borderRadius: 2,
            transition: 'border-color 0.15s',
          }}
        >
          <textarea
            ref={textarea}
            aria-label={t('comments.newComment')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={images.onPaste}
            {...images.caretProps}
            onFocus={() => setFocused(true)}
            placeholder={images.dragging ? t('attachments.dropHere') : t('comments.placeholder')}
            style={{
              width: '100%',
              minHeight: focused ? 70 : 38,
              resize: 'vertical',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'inherit',
              padding: '10px 14px',
            }}
          />
          {images.pending.length > 0 && (
            <Box sx={{ padding: '0 14px 10px' }}>
              <AttachmentGrid size="small" {...images.grid} />
            </Box>
          )}
          {(focused || canSubmit) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                padding: '6px 10px',
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Tooltip title={t('comments.attachImage')}>
                <IconButton size="small" onClick={images.pick}>
                  <Icon name="image" size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('comments.bold')}>
                <IconButton size="small" onClick={() => insert('**bold**')}>
                  <Icon name="format_bold" size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('comments.code')}>
                <IconButton size="small" onClick={() => insert('`code`')}>
                  <Icon name="code" size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('comments.bulletedList')}>
                <IconButton
                  size="small"
                  onClick={() => setDraft((d) => (d ? d + '\n' : '') + '- ')}
                >
                  <Icon name="format_list_bulleted" size={18} />
                </IconButton>
              </Tooltip>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="text" onClick={clear}>
                {t('common.cancel')}
              </Button>
              <Button size="small" variant="contained" onClick={submit} disabled={!canSubmit}>
                {t('comments.submit')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

import {
  Box,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Markdown } from '@/components/Markdown';
import { Icon } from '@/components/Icon';
import { SectionLabel } from '@/components/SectionLabel';
import { AttachmentGrid, type GridItem } from '@/features/attachments/AttachmentGrid';
import {
  releasePreview,
  toNewAttachment,
  type PendingAttachment,
} from '@/features/attachments/files';
import { imageUsage } from '@/features/attachments/usage';
import { useImageInput, type ImageSource } from '@/features/attachments/useImageInput';
import { useInlineInsert, withoutReference } from '@/features/attachments/useInlineInsert';
import type { Attachment } from '@/data/types';
import type { NewAttachment } from '@/types/electron-api';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';

interface DescriptionEditorProps {
  value: string;
  onSave: (description: string) => void;
  /** Images on the ticket itself. */
  attachments?: Attachment[];
  /** Every image name on the ticket (comments included), so new ones get a free name. */
  takenNames?: Set<string>;
  /** The ticket's comments, which can show its images inline too. */
  commentBodies?: string[];
  /** Save images to the ticket right away (they do not wait for the description). */
  onAttach?: (images: NewAttachment[]) => Promise<void>;
  /** Delete one image (reports the outcome itself). */
  onRemoveAttachment?: (name: string) => void | Promise<void>;
}

/**
 * Markdown description card with a preview / edit toggle, plus the ticket's images.
 * Every image is listed as a named thumbnail under the text; a pasted one is also
 * written into the text where the caret is.
 */
export function DescriptionEditor({
  value,
  onSave,
  attachments = [],
  takenNames,
  commentBodies = [],
  onAttach,
  onRemoveAttachment,
}: DescriptionEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const snack = useSnackbar();
  const { t } = useTranslation();

  const { insert, insertAtCaret, caretProps, forget } = useInlineInsert(setDraft, textarea);

  const attach = async (images: PendingAttachment[], source: ImageSource) => {
    images.forEach(releasePreview);
    if (!onAttach) return;
    const names = images.map((a) => a.name);
    // A paste lands in the text right away; the upload catches up behind it.
    if (source === 'paste' && editing) insertAtCaret(names);
    try {
      await onAttach(images.map(toNewAttachment));
      snack(t('attachments.added', { count: images.length }), { severity: 'success' });
    } catch (err) {
      if (source === 'paste') setDraft((d) => names.reduce(withoutReference, d));
      snack(t('attachments.failed', { message: (err as Error).message }), { severity: 'error' });
    }
  };
  const images = useImageInput(
    (list, source) => void attach(list, source),
    () => takenNames ?? new Set(attachments.map((a) => a.name)),
  );

  const save = () => {
    if (draft !== value) {
      onSave(draft);
      snack(t('tickets.detail.descriptionSaved'), { severity: 'success' });
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);
  const startEditing = () => {
    setDraft(value);
    forget();
    setEditing(true);
  };

  // Every image is listed, inline or not, so its name is always there to reference.
  // One the text (or a comment) shows cannot be deleted until it is taken out.
  const usedIn = imageUsage(editing ? draft : value, commentBodies);
  const gridItems = attachments.map((a): GridItem => ({ name: a.name, usedIn: usedIn(a.name) }));

  return (
    <Box
      {...(onAttach ? images.dropProps : {})}
      sx={{
        marginTop: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderStyle: images.dragging ? 'dashed' : 'solid',
        borderColor: images.dragging ? 'primary.main' : 'divider',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '8px 12px',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <SectionLabel
          sx={{ fontWeight: 500, letterSpacing: '0.04em', color: 'text.secondary', fontSize: 12 }}
        >
          {t('tickets.detail.description')}
        </SectionLabel>
        <Box sx={{ flex: 1 }} />
        {onAttach && (
          <Tooltip title={t('attachments.attach')}>
            <IconButton size="small" aria-label={t('attachments.attach')} onClick={images.pick}>
              <Icon name="add_photo_alternate" size={18} />
            </IconButton>
          </Tooltip>
        )}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={editing ? 'edit' : 'preview'}
          onChange={(_, v) => {
            if (!v) return;
            if (v === 'edit') startEditing();
            else save();
          }}
        >
          <ToggleButton value="edit" sx={{ px: 1.25, py: 0.5, fontSize: 12 }}>
            <Icon name="edit" size={14} />
            <Box component="span" sx={{ ml: 0.5 }}>
              {t('common.edit')}
            </Box>
          </ToggleButton>
          <ToggleButton value="preview" sx={{ px: 1.25, py: 0.5, fontSize: 12 }}>
            <Icon name="visibility" size={14} />
            <Box component="span" sx={{ ml: 0.5 }}>
              {t('common.preview')}
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {editing ? (
        <Box sx={{ padding: 1.5 }}>
          <Box
            component="textarea"
            ref={textarea}
            aria-label={t('tickets.detail.description')}
            value={draft}
            autoFocus
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            onPaste={onAttach ? images.onPaste : undefined}
            {...caretProps}
            sx={{
              width: '100%',
              minHeight: 240,
              resize: 'vertical',
              border: 1,
              borderColor: 'divider',
              borderRadius: '6px',
              padding: '12px 14px',
              fontFamily: monoFontFamily,
              fontSize: 13,
              lineHeight: 1.6,
              bgcolor: 'action.hover',
              color: 'text.primary',
              outline: 'none',
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', marginTop: 1 }}>
            <Button variant="text" size="small" onClick={cancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" size="small" onClick={save}>
              {t('common.save')}
            </Button>
          </Box>
          <Typography
            sx={{ fontSize: 11, color: 'text.disabled', marginTop: 0.75, paddingLeft: 0.5 }}
          >
            {t('tickets.detail.descriptionHint')}
            {attachments.length > 0 && ` · ${t('attachments.hint')}`}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ padding: '18px 22px', minHeight: 100 }}>
          {value ? (
            <Markdown source={value} />
          ) : (
            <Typography sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: 14 }}>
              <Trans i18nKey="tickets.detail.descriptionEmpty" components={{ em: <em /> }} />
            </Typography>
          )}
        </Box>
      )}

      {gridItems.length > 0 && (
        <Box sx={{ padding: '12px 16px 14px', borderTop: 1, borderColor: 'divider' }}>
          <SectionLabel sx={{ fontSize: 11, color: 'text.secondary', marginBottom: 1 }}>
            {t('attachments.title')} · {gridItems.length}
          </SectionLabel>
          <AttachmentGrid
            items={gridItems}
            onInsert={editing ? (item) => insert(item.name) : undefined}
            onRemove={
              onRemoveAttachment
                ? (item) => !item.usedIn && void onRemoveAttachment(item.name)
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}

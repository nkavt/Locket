import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Markdown } from '@/components/Markdown';
import { Icon } from '@/components/Icon';
import { SectionLabel } from '@/components/SectionLabel';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';

interface DescriptionEditorProps {
  value: string;
  onSave: (description: string) => void;
}

/** Markdown description card with a preview / edit toggle. */
export function DescriptionEditor({ value, onSave }: DescriptionEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const snack = useSnackbar();
  const { t } = useTranslation();

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
    setEditing(true);
  };

  return (
    <Box
      sx={{
        marginTop: 3,
        background: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
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
            aria-label={t('tickets.detail.description')}
            value={draft}
            autoFocus
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
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
              background: 'action.hover',
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
    </Box>
  );
}

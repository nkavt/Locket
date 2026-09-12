import { Box, Typography } from '@mui/material';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface TitleEditorProps {
  value: string;
  onSave: (title: string) => void;
}

/** Click-to-edit heading. Enter or blur saves, Escape cancels. */
export function TitleEditor({ value, onSave }: TitleEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  };
  const cancel = () => setEditing(false);
  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  if (editing) {
    return (
      <Box
        component="input"
        aria-label={t('tickets.detail.titleField')}
        value={draft}
        autoFocus
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        sx={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 26,
          fontWeight: 500,
          background: 'action.hover',
          padding: '6px 10px',
          borderRadius: '6px',
          color: 'text.primary',
        }}
      />
    );
  }

  return (
    <Typography
      component="h1"
      onClick={startEditing}
      sx={{
        m: 0,
        fontSize: 26,
        fontWeight: 500,
        lineHeight: 1.25,
        padding: '6px 10px',
        borderRadius: '6px',
        cursor: 'text',
        transition: 'background 0.12s',
        '&:hover': { background: 'action.hover' },
      }}
    >
      {value}
    </Typography>
  );
}

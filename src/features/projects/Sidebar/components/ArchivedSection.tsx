import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';

interface ArchivedSectionProps {
  count: number;
  open: boolean;
  onToggle: () => void;
  /** The archived project rows, shown only while open. */
  children: ReactNode;
}

/** Collapsible "Archived · N" group at the end of the sidebar's project list. */
export function ArchivedSection({ count, open, onToggle, children }: ArchivedSectionProps) {
  const { t } = useTranslation();
  return (
    <Box component="section" aria-label={t('projects.archive.sectionLabel')}>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        sx={{
          // Lines up with the project rows: same padding, the chevron where the avatar sits.
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          width: '100%',
          padding: '7px 10px',
          marginBottom: '1px',
          border: 0,
          borderRadius: '6px',
          background: 'transparent',
          font: 'inherit',
          fontSize: 13,
          color: 'text.secondary',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background 0.12s',
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 },
        }}
      >
        <Box sx={{ width: 22, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
          <Icon
            name="chevron_right"
            size={18}
            sx={{
              color: 'text.disabled',
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>{t('projects.archive.section', { count })}</Box>
      </Box>
      {open && children}
    </Box>
  );
}

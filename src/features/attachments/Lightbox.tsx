import { Box, Dialog, IconButton, Typography } from '@mui/material';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { AttachmentPreview } from './AttachmentPreview';

export interface ViewerItem {
  name: string;
  /** Local preview for an image that is not saved yet. */
  url?: string;
}

interface LightboxProps {
  items: ViewerItem[];
  /** Index of the image on screen, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

const navButton = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.08)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
} as const;

/** Full-window image viewer. Arrow keys move between images, Esc closes. */
export function Lightbox({ items, index, onIndexChange }: LightboxProps) {
  const { t } = useTranslation();
  const open = index !== null && index < items.length;
  const item = open ? items[index] : null;
  const many = items.length > 1;

  const step = (by: number) => {
    if (index === null) return;
    onIndexChange((index + by + items.length) % items.length);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && many) step(1);
    if (e.key === 'ArrowLeft' && many) step(-1);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onIndexChange(null)}
      onKeyDown={onKeyDown}
      fullScreen
      aria-label={item ? item.name : undefined}
      slotProps={{ paper: { sx: { bgcolor: 'rgba(10,10,12,0.94)', backgroundImage: 'none' } } }}
    >
      {item && (
        <Box
          sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              padding: '10px 14px',
              color: '#fff',
            }}
          >
            <Typography sx={{ fontSize: 13, flex: 1, minWidth: 0 }} noWrap title={item.name}>
              {item.name}
            </Typography>
            {many && (
              <Typography sx={{ fontSize: 12, color: 'grey.400' }}>
                {t('attachments.position', { current: index! + 1, total: items.length })}
              </Typography>
            )}
            <IconButton
              aria-label={t('common.close')}
              onClick={() => onIndexChange(null)}
              sx={{ color: '#fff' }}
            >
              <Icon name="close" />
            </IconButton>
          </Box>
          <Box
            // Clicking the backdrop around the image closes the viewer.
            onClick={(e) => e.target === e.currentTarget && onIndexChange(null)}
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 72px 32px',
            }}
          >
            <AttachmentPreview key={item.name} item={item} variant="full" />
          </Box>
          {many && (
            <>
              <IconButton
                aria-label={t('attachments.previous')}
                onClick={() => step(-1)}
                sx={{ ...navButton, left: 16 }}
              >
                <Icon name="chevron_left" size={28} />
              </IconButton>
              <IconButton
                aria-label={t('attachments.next')}
                onClick={() => step(1)}
                sx={{ ...navButton, right: 16 }}
              >
                <Icon name="chevron_right" size={28} />
              </IconButton>
            </>
          )}
        </Box>
      )}
    </Dialog>
  );
}

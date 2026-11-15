import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { monoFontFamily } from '@/theme';
import { AttachmentPreview } from './AttachmentPreview';
import { Lightbox, type ViewerItem } from './Lightbox';

export interface GridItem extends ViewerItem {
  /** Where the image is shown inline; such an image cannot be deleted until it is taken out. */
  usedIn?: 'description' | 'comment' | 'text';
}

interface AttachmentGridProps {
  items: GridItem[];
  /** Shows a delete button on each tile (disabled for images that are in use). */
  onRemove?: (item: GridItem) => void;
  /** Shows an "insert into text" button on each tile. */
  onInsert?: (item: GridItem) => void;
  size?: 'small' | 'medium';
}

const tileAction = {
  width: 22,
  height: 22,
  padding: 0,
  background: 'rgba(0,0,0,0.7)',
  color: '#fff',
  '&:hover': { background: 'rgba(0,0,0,0.85)' },
  '&.Mui-disabled': { background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.45)' },
} as const;

/** Thumbnails of a ticket's or comment's images, each with its name. Click one to view it. */
export function AttachmentGrid({
  items,
  onRemove,
  onInsert,
  size = 'medium',
}: AttachmentGridProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  const [w, h] = size === 'small' ? [104, 68] : [136, 90];

  const act = (fn: (item: GridItem) => void, item: GridItem) => (e: MouseEvent) => {
    e.stopPropagation();
    fn(item);
  };

  return (
    <>
      <Box
        role="list"
        aria-label={t('attachments.title')}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}
      >
        {items.map((item, i) => (
          <Box
            key={item.name}
            role="listitem"
            sx={{
              position: 'relative',
              width: w,
              '&:hover .tile-actions, &:focus-within .tile-actions': { opacity: 1 },
            }}
          >
            <ButtonBase
              aria-label={t('attachments.view', { name: item.name })}
              onClick={() => setOpen(i)}
              sx={{
                width: '100%',
                height: h,
                borderRadius: '6px',
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <AttachmentPreview item={item} variant="thumb" />
            </ButtonBase>
            {/* The name is what markdown uses, so it is shown in full and can be selected. */}
            <Typography
              title={item.name}
              noWrap
              sx={{
                mt: 0.5,
                fontFamily: monoFontFamily,
                fontSize: 11,
                color: 'text.secondary',
                userSelect: 'text',
              }}
            >
              {item.name}
            </Typography>
            {(onInsert || onRemove) && (
              <Box
                className="tile-actions"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  display: 'flex',
                  gap: 0.5,
                  opacity: 0,
                  transition: 'opacity 0.12s',
                }}
              >
                {onInsert && (
                  <Tooltip title={t('attachments.insert')}>
                    <IconButton
                      size="small"
                      aria-label={t('attachments.insertNamed', { name: item.name })}
                      onClick={act(onInsert, item)}
                      sx={tileAction}
                    >
                      <Icon name="input" size={13} />
                    </IconButton>
                  </Tooltip>
                )}
                {onRemove && (
                  <Tooltip
                    title={
                      item.usedIn ? t(`attachments.inUse.${item.usedIn}`) : t('attachments.remove')
                    }
                  >
                    {/* A disabled button fires no events, so the tooltip hangs on a wrapper.
                        It is a flex box so the button doesn't sit on a text line (baseline
                        gap) and line up lower than the insert button. */}
                    <Box component="span" sx={{ display: 'flex' }}>
                      <IconButton
                        size="small"
                        aria-label={t('attachments.removeNamed', { name: item.name })}
                        disabled={!!item.usedIn}
                        onClick={act(onRemove, item)}
                        sx={tileAction}
                      >
                        <Icon name="delete_outline" size={13} />
                      </IconButton>
                    </Box>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
      <Lightbox items={items} index={open} onIndexChange={setOpen} />
    </>
  );
}

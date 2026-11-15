import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import type { ViewerItem } from './Lightbox';
import { useAttachmentUrl } from './useAttachmentUrl';

interface AttachmentPreviewProps {
  item: ViewerItem;
  /** `thumb` fills a grid tile; `full` fits the image inside the dark viewer. */
  variant: 'thumb' | 'full';
}

/** One stored (or pending) image with its loading and missing states. */
export function AttachmentPreview({ item, variant }: AttachmentPreviewProps) {
  const { t } = useTranslation();
  const src = useAttachmentUrl(item.name, item.url);
  const full = variant === 'full';

  if (src.status === 'loading') {
    return <CircularProgress size={full ? 40 : 16} sx={full ? { color: 'grey.300' } : undefined} />;
  }
  if (src.status === 'missing') {
    return full ? (
      <Typography sx={{ color: 'grey.300' }}>{t('attachments.missing')}</Typography>
    ) : (
      <Icon
        name="image"
        size={22}
        sx={{ color: 'text.disabled' }}
        aria-label={t('attachments.missing')}
      />
    );
  }
  return (
    <Box
      component="img"
      src={src.url}
      alt={item.name}
      draggable={!full ? false : undefined}
      sx={
        full
          ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1 }
          : // Anchored to the top: a tall screenshot's title or header is what identifies it.
            {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              display: 'block',
            }
      }
    />
  );
}

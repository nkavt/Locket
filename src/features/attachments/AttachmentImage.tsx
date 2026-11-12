import { Box, ButtonBase, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { Lightbox } from './Lightbox';
import { useAttachmentUrl } from './useAttachmentUrl';

interface AttachmentImageProps {
  name: string;
  alt?: string;
  title?: string;
}

/** An `![alt](name.png)` image of the ticket inside markdown. Click it to open the viewer. */
export function AttachmentImage({ name: file, alt, title }: AttachmentImageProps) {
  const { t } = useTranslation();
  const src = useAttachmentUrl(file);
  const [open, setOpen] = useState<number | null>(null);
  const name = alt || file;

  if (src.status === 'missing') {
    return (
      <Typography
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}
      >
        <Icon name="image" size={16} />
        {t('attachments.missingNamed', { name })}
      </Typography>
    );
  }
  if (src.status === 'loading') {
    return <Box component="span" sx={{ display: 'inline-block', minHeight: 40 }} />;
  }
  return (
    <>
      <ButtonBase
        aria-label={t('attachments.view', { name })}
        onClick={() => setOpen(0)}
        sx={{ display: 'inline-block', borderRadius: '6px', maxWidth: '100%' }}
      >
        <img src={src.url} alt={alt} title={title} />
      </ButtonBase>
      <Lightbox items={[{ name: file }]} index={open} onIndexChange={setOpen} />
    </>
  );
}

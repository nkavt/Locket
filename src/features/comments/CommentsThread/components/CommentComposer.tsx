import { Avatar, Box, Button, IconButton, Tooltip } from '@mui/material';
import { useState, type ClipboardEvent, type DragEvent, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useCurrentUser } from '@/state/useCurrentUser';
import { avatarColor, initials } from '@/utils/format';

interface CommentComposerProps {
  onSubmit: (body: string) => void;
}

interface ImageItem {
  name: string;
  dataUrl: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CommentComposer({ onSubmit }: CommentComposerProps) {
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [focused, setFocused] = useState(false);
  const currentUser = useCurrentUser();
  const { t } = useTranslation();

  const canSubmit = !!draft.trim() || images.length > 0;

  const clear = () => {
    setDraft('');
    setImages([]);
    setFocused(false);
  };

  const submit = () => {
    if (!canSubmit) return;
    let body = draft.trim();
    images.forEach((img) => {
      body += `\n\n![${img.name}](${img.dataUrl})`;
    });
    onSubmit(body);
    clear();
  };

  // Images are embedded as data URLs so they survive reloads (blob URLs would not).
  const addFiles = (files: Iterable<File>) => {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      void readAsDataUrl(f).then((dataUrl) =>
        setImages((arr) => [...arr, { name: f.name || 'pasted-image.png', dataUrl }]),
      );
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter((it) => it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const pickFiles = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = true;
    inp.onchange = () => inp.files && addFiles(inp.files);
    inp.click();
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
          if (!draft && images.length === 0) setFocused(false);
        }}
        onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <Box
          sx={{
            background: 'background.paper',
            border: 1,
            borderColor: focused ? 'primary.main' : 'divider',
            borderRadius: 2,
            transition: 'border-color 0.15s',
          }}
        >
          <textarea
            aria-label={t('comments.newComment')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={onPaste}
            onFocus={() => setFocused(true)}
            placeholder={t('comments.placeholder')}
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
          {images.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, padding: '0 14px 10px' }}>
              {images.map((img, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'relative',
                    width: 100,
                    height: 70,
                    borderRadius: '6px',
                    backgroundImage: `url(${img.dataUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <IconButton
                    size="small"
                    aria-label={t('comments.removeImage', { name: img.name })}
                    onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                    sx={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 18,
                      height: 18,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      '&:hover': { background: 'rgba(0,0,0,0.85)' },
                    }}
                  >
                    <Icon name="close" size={12} />
                  </IconButton>
                </Box>
              ))}
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
                <IconButton size="small" onClick={pickFiles}>
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

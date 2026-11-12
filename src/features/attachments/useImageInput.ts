import { useContext, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SnackbarContext } from '@/state/SnackbarContext';
import {
  ATTACHMENT_ACCEPT,
  filesFromTransfer,
  MAX_ATTACHMENT_BYTES,
  readImageFiles,
  type PendingAttachment,
} from './files';

export type ImageSource = 'paste' | 'drop' | 'pick';

/**
 * Paste, drop and file-picker handling shared by every editor that takes images.
 * Accepted images go to `onImages`, named so they do not clash with `taken()`;
 * the rest are reported in a snackbar.
 */
export function useImageInput(
  onImages: (images: PendingAttachment[], source: ImageSource) => void,
  taken: () => Set<string>,
) {
  const { t } = useTranslation();
  const snack = useContext(SnackbarContext);
  const [dragging, setDragging] = useState(false);

  const add = async (files: Iterable<File>, source: ImageSource) => {
    const { accepted, rejected } = await readImageFiles(files, new Set(taken()));
    if (accepted.length) onImages(accepted, source);
    for (const r of rejected) {
      snack?.(
        r.reason === 'size'
          ? t('attachments.tooLarge', { name: r.name, mb: MAX_ATTACHMENT_BYTES / 1024 / 1024 })
          : t('attachments.unsupported', { name: r.name }),
        { severity: 'warning' },
      );
    }
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  return {
    dragging,
    /** Spread onto the drop target. */
    dropProps: {
      onDragOver: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(true);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      },
      onDrop: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        void add(e.dataTransfer.files, 'drop');
      },
    },
    /** For a textarea: takes pasted images (the editor inserts them) and leaves pasted text alone. */
    onPaste: (e: ClipboardEvent) => {
      const files = filesFromTransfer(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      void add(files, 'paste');
    },
    /** Open the OS file picker. */
    pick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ATTACHMENT_ACCEPT;
      input.multiple = true;
      input.onchange = () => input.files && void add(input.files, 'pick');
      input.click();
    },
  };
}

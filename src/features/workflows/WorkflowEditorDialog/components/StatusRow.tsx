import { Box, IconButton, Popover, Tooltip, Typography, useTheme } from '@mui/material';
import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { StatusIcon } from '@/components/StatusIcon';
import { ColorPicker, FieldLabel, IconPicker, SelectInput, TextInput } from '@/components/ui';
import type { StatusCategory } from '@/data/types';
import { STATUS_CATEGORIES, STATUS_COLORS, STATUS_ICONS } from '@/data/workflows';
import { paletteColor } from '@/utils/tint';

export interface StatusDraft {
  /** Stable React key; new statuses have no `id` until saved. */
  key: string;
  id?: string;
  name: string;
  icon: string;
  color: string;
  category: StatusCategory;
}

interface StatusRowProps {
  status: StatusDraft;
  /** Tickets currently in this status (0 for new ones). */
  tickets: number;
  error?: string;
  /** Focus the name field (a row that was just added). */
  autoFocus?: boolean;
  canRemove: boolean;
  dragging: boolean;
  onChange: (patch: Partial<StatusDraft>) => void;
  onRemove: () => void;
  /** Keyboard reordering from the drag handle: -1 up, +1 down. */
  onMove: (delta: -1 | 1) => void;
  dragProps: {
    onDragStart: (e: DragEvent) => void;
    onDragEnter: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
}

/** One editable status: drag handle, icon and colour, name, category, tickets, delete. */
export function StatusRow({
  status,
  tickets,
  error,
  autoFocus,
  canRemove,
  dragging,
  onChange,
  onRemove,
  onMove,
  dragProps,
}: StatusRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [lookAnchor, setLookAnchor] = useState<HTMLElement | null>(null);
  const label = status.name || t('settings.workflows.editor.newStatus');
  // The icon picker tints with a real colour; a theme colour like "text.disabled" isn't one.
  const resolved = paletteColor(theme, status.color);
  const tint = resolved.startsWith('#') ? resolved : theme.palette.grey[600];

  const onHandleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(e.key === 'ArrowUp' ? -1 : 1);
    }
  };

  return (
    <Box
      onDragEnter={dragProps.onDragEnter}
      onDragOver={dragProps.onDragOver}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.75,
        px: 0.5,
        borderRadius: 1,
        opacity: dragging ? 0.4 : 1,
        bgcolor: dragging ? 'action.hover' : 'transparent',
      }}
    >
      <Tooltip title={t('settings.workflows.editor.drag', { name: label })}>
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('settings.workflows.editor.drag', { name: label })}
          draggable
          onDragStart={dragProps.onDragStart}
          onDragEnd={dragProps.onDragEnd}
          onKeyDown={onHandleKey}
          sx={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            color: 'text.disabled',
            borderRadius: 0.5,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Icon name="drag_indicator" size={20} />
        </Box>
      </Tooltip>

      <Tooltip title={t('settings.workflows.editor.look', { name: label })}>
        <IconButton
          aria-label={t('settings.workflows.editor.look', { name: label })}
          onClick={(e) => setLookAnchor(e.currentTarget)}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, width: 40, height: 40 }}
        >
          <StatusIcon status={status} size={20} />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!lookAnchor}
        anchorEl={lookAnchor}
        onClose={() => setLookAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        // Wide enough for every colour swatch on one row.
        slotProps={{ paper: { sx: { p: 2, width: 384 } } }}
      >
        <FieldLabel>{t('settings.workflows.editor.icon')}</FieldLabel>
        <IconPicker
          value={status.icon}
          onChange={(icon) => onChange({ icon })}
          suggestions={STATUS_ICONS}
          color={tint}
        />
        <FieldLabel>{t('settings.workflows.editor.color')}</FieldLabel>
        <ColorPicker
          value={status.color}
          onChange={(color) => onChange({ color })}
          colors={STATUS_COLORS}
        />
      </Popover>

      <TextInput
        size="small"
        value={status.name}
        autoFocus={autoFocus}
        placeholder={t('settings.workflows.editor.newStatus')}
        onChange={(e) => onChange({ name: e.target.value })}
        error={!!error}
        helperText={error}
        slotProps={{ htmlInput: { 'aria-label': t('settings.workflows.editor.statusName') } }}
        sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { height: 40 } }}
      />

      <SelectInput<StatusCategory>
        value={status.category}
        onChange={(e) => onChange({ category: e.target.value as StatusCategory })}
        inputProps={{ 'aria-label': t('settings.workflows.editor.category') }}
        sx={{ width: 140, height: 40 }}
        options={STATUS_CATEGORIES.map((c) => ({
          value: c,
          label: (
            <Box component="span" title={t(`settings.workflows.categoryHints.${c}`)}>
              {t(`settings.workflows.categories.${c}`)}
            </Box>
          ),
        }))}
      />

      <Typography
        sx={{
          width: 72,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          fontSize: 12,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {tickets > 0 && t('settings.workflows.editor.tickets', { count: tickets })}
      </Typography>

      <Tooltip title={t('settings.workflows.editor.remove', { name: label })}>
        <span>
          <IconButton
            aria-label={t('settings.workflows.editor.remove', { name: label })}
            onClick={onRemove}
            disabled={!canRemove}
            sx={{ width: 40, height: 40 }}
          >
            <Icon name="delete_outline" size={20} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

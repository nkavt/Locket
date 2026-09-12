import { Box, Menu, MenuItem } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { LabelChip } from '@/components/LabelChip';
import { LABEL_PALETTE } from '@/data/constants';

interface LabelPickerProps {
  value: string[];
  onChange: (labels: string[]) => void;
}

export function LabelPicker({ value, onChange }: LabelPickerProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const toggle = (label: string) =>
    onChange(value.includes(label) ? value.filter((x) => x !== label) : [...value, label]);

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', marginTop: 1.5 }}
    >
      {value.map((l) => (
        <LabelChip key={l} label={l} onRemove={() => toggle(l)} />
      ))}
      <Box
        component="button"
        type="button"
        onClick={(e: MouseEvent<HTMLButtonElement>) => setAnchor(e.currentTarget)}
        sx={{
          border: '1px dashed',
          borderColor: 'action.disabled',
          background: 'transparent',
          color: 'text.secondary',
          padding: '2px 9px',
          borderRadius: '11px',
          fontSize: 11.5,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontFamily: 'inherit',
        }}
      >
        <Icon name="add" size={12} /> {t('tickets.detail.addLabel')}
      </Box>

      <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}>
        {LABEL_PALETTE.map((l) => {
          const active = value.includes(l.name);
          return (
            <MenuItem key={l.name} onClick={() => toggle(l.name)} selected={active}>
              <Box
                sx={{ width: 10, height: 10, borderRadius: '50%', background: l.color, mr: 1.25 }}
              />
              <Box sx={{ flex: 1 }}>{l.name}</Box>
              {active && <Icon name="check" size={16} sx={{ color: 'primary.main', ml: 1 }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}

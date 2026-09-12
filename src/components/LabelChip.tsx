import { Box } from '@mui/material';
import { Icon } from './Icon';
import { labelColor } from '@/utils/format';
import { useTranslation } from 'react-i18next';

interface LabelChipProps {
  label: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export function LabelChip({ label, size = 'md', onRemove }: LabelChipProps) {
  const { t } = useTranslation();
  const color = labelColor(label);
  const small = size === 'sm';
  return (
    <Box
      sx={{
        fontSize: small ? 10.5 : 11.5,
        padding: small ? '2px 7px' : '3px 9px',
        borderRadius: '11px',
        background: color + '22',
        color,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {onRemove && (
        <Box
          component="span"
          role="button"
          aria-label={t('tickets.detail.removeLabel', { label })}
          onClick={onRemove}
          sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
        >
          <Icon name="close" size={12} />
        </Box>
      )}
    </Box>
  );
}

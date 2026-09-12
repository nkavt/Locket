import { forwardRef } from 'react';
import { Box, type BoxProps } from '@mui/material';
import { Icon } from '@/components/Icon';
import { OptionButton } from './OptionButton';

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons: ReadonlyArray<string>;
  color: string;
  iconSize?: number;
  buttonSize?: number;
  sx?: BoxProps['sx'];
}

export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  { value, onChange, icons, color, iconSize = 18, buttonSize, sx },
  ref,
) {
  return (
    <Box ref={ref} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, ...sx }}>
      {icons.map((name) => (
        <OptionButton
          key={name}
          shape="square"
          size={buttonSize}
          color={color}
          selected={value === name}
          onClick={() => onChange(name)}
        >
          <Icon name={name} size={iconSize} />
        </OptionButton>
      ))}
    </Box>
  );
});

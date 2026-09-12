import { forwardRef } from 'react';
import { Box, type BoxProps } from '@mui/material';
import { OptionButton } from './OptionButton';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors: ReadonlyArray<string>;
  size?: number;
  sx?: BoxProps['sx'];
}

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  { value, onChange, colors, size, sx },
  ref,
) {
  return (
    <Box ref={ref} sx={{ display: 'flex', gap: 0.75, ...sx }}>
      {colors.map((c) => (
        <OptionButton
          key={c}
          shape="circle"
          size={size}
          color={c}
          selected={value === c}
          onClick={() => onChange(c)}
          aria-label={`Select color ${c}`}
        />
      ))}
    </Box>
  );
});

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

/** The palette, plus the current colour as an extra swatch when it isn't one of them. */
export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  { value, onChange, colors, size, sx },
  ref,
) {
  const inPalette = colors.some((c) => c.toLowerCase() === value.toLowerCase());
  const swatches = !value || inPalette ? colors : [...colors, value];
  return (
    <Box ref={ref} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, ...sx }}>
      {swatches.map((c) => (
        <OptionButton
          key={c}
          shape="circle"
          size={size}
          color={c}
          selected={value.toLowerCase() === c.toLowerCase()}
          onClick={() => onChange(c)}
          aria-label={`Select color ${c}`}
        />
      ))}
    </Box>
  );
});

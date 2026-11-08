import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Box, type BoxProps } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import type { Theme } from '@mui/material/styles';
import { tintBg, tintBorder, tintText } from '@/utils/tint';

export type OptionButtonShape = 'square' | 'circle' | 'pill';

export interface OptionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  selected: boolean;
  color?: string;
  shape?: OptionButtonShape;
  size?: number;
  sx?: BoxProps['sx'];
  children?: ReactNode;
}

const RADIUS: Record<OptionButtonShape, string> = {
  square: '6px',
  circle: '50%',
  pill: '12px',
};

function shapeStyles(
  shape: OptionButtonShape,
  selected: boolean,
  color: string | undefined,
  size: number | undefined,
): SystemStyleObject<Theme> {
  if (shape === 'circle') {
    return {
      width: size ?? 28,
      height: size ?? 28,
      padding: 0,
      border: 2,
      borderColor: selected ? 'text.primary' : 'transparent',
      bgcolor: color ?? 'transparent',
    };
  }

  if (shape === 'pill') {
    return {
      fontSize: 12,
      padding: '4px 10px',
      bgcolor: (t) => (selected && color ? tintBg(t, color) : t.palette.action.hover),
      color: (t) => (selected && color ? tintText(t, color) : t.palette.text.secondary),
      border: 1,
      borderColor: (t) => (selected && color ? tintBorder(t, color) : t.palette.divider),
      fontWeight: 500,
    };
  }

  return {
    width: size ?? 32,
    height: size ?? 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: (t) => (selected && color ? tintBg(t, color) : t.palette.action.hover),
    color: (t) => (selected && color ? tintText(t, color) : t.palette.text.secondary),
    border: selected ? 2 : 1,
    borderColor: (t) =>
      selected ? (color ? tintText(t, color) : t.palette.primary.main) : t.palette.divider,
  };
}

export const OptionButton = forwardRef<HTMLButtonElement, OptionButtonProps>(function OptionButton(
  { selected, color, shape = 'square', size, sx, children, type = 'button', ...rest },
  ref,
) {
  return (
    <Box
      ref={ref}
      component="button"
      type={type}
      {...rest}
      sx={{
        ...shapeStyles(shape, selected, color, size),
        borderRadius: RADIUS[shape],
        cursor: 'pointer',
        fontFamily: 'inherit',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
});

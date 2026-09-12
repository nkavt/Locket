import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Box, type BoxProps } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import type { Theme } from '@mui/material/styles';

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
      background: color ?? 'transparent',
    };
  }

  if (shape === 'pill') {
    return {
      fontSize: 12,
      padding: '4px 10px',
      background: selected && color ? color + '22' : 'action.hover',
      color: selected && color ? color : 'text.secondary',
      border: 1,
      borderColor: selected && color ? color + '55' : 'divider',
      fontWeight: 500,
    };
  }

  return {
    width: size ?? 32,
    height: size ?? 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: selected && color ? color + '22' : 'action.hover',
    color: selected && color ? color : 'text.secondary',
    border: selected ? 2 : 1,
    borderColor: selected ? (color ?? 'primary.main') : 'divider',
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

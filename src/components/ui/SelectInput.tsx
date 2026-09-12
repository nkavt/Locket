import { forwardRef, type ReactNode } from 'react';
import { Box, MenuItem, Select, type SelectProps } from '@mui/material';
import { Icon } from '@/components/Icon';

export interface SelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: string;
}

export interface SelectInputProps<T extends string = string> extends Omit<
  SelectProps<T>,
  'children'
> {
  options: ReadonlyArray<SelectOption<T>>;
}

function SelectInputInner<T extends string>(
  { options, size = 'small', inputRef, ...rest }: SelectInputProps<T>,
  ref: React.Ref<HTMLInputElement>,
) {
  return (
    <Select<T> {...rest} size={size} inputRef={ref ?? inputRef}>
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {opt.icon && <Icon name={opt.icon} size={16} />}
            {opt.label}
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}

export const SelectInput = forwardRef(SelectInputInner) as <T extends string>(
  props: SelectInputProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => ReturnType<typeof SelectInputInner>;

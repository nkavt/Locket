import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

export type TextInputProps = Omit<TextFieldProps, 'multiline' | 'rows' | 'minRows' | 'maxRows'>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { fullWidth = true, inputRef, ...rest },
  ref,
) {
  return <TextField {...rest} fullWidth={fullWidth} inputRef={ref ?? inputRef} />;
});

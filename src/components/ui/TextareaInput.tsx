import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

export type TextareaInputProps = Omit<TextFieldProps, 'multiline'>;

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  function TextareaInput({ fullWidth = true, rows = 3, inputRef, ...rest }, ref) {
    return (
      <TextField {...rest} multiline rows={rows} fullWidth={fullWidth} inputRef={ref ?? inputRef} />
    );
  },
);

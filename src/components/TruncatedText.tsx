import { Box, Tooltip, type SxProps, type Theme } from '@mui/material';
import { useState } from 'react';

interface TruncatedTextProps {
  children: string;
  sx?: SxProps<Theme>;
}

/** Single line cut with an ellipsis. Hovering it shows the full text, but only when it is cut. */
export function TruncatedText({ children, sx }: TruncatedTextProps) {
  const [truncated, setTruncated] = useState(false);
  return (
    <Tooltip title={truncated ? children : ''} placement="right" describeChild>
      <Box
        onMouseOver={(e) => setTruncated(e.currentTarget.scrollWidth > e.currentTarget.clientWidth)}
        sx={[
          { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

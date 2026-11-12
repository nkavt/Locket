import { forwardRef, useMemo, useState } from 'react';
import { Box, InputAdornment, type BoxProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { MaterialSymbol } from '@/components/MaterialSymbol';
import { isMaterialSymbol, MATERIAL_SYMBOL_NAMES } from '@/data/projectIcons';
import { MAX_ICON_RESULTS, searchIcons } from './iconSearch';
import { OptionButton } from './OptionButton';
import { TextInput } from './TextInput';

export interface IconPickerProps {
  /** The selected icon name. */
  value: string;
  onChange: (icon: string) => void;
  /** Shown while the search is empty. */
  suggestions: ReadonlyArray<string>;
  color: string;
  iconSize?: number;
  buttonSize?: number;
  sx?: BoxProps['sx'];
}

/** Pick any Material Symbols icon: a few suggestions, and a search over all of them. */
export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  { value, onChange, suggestions, color, iconSize = 18, buttonSize, sx },
  ref,
) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchIcons(query), [query]);

  const searching = query.trim().length > 0;
  // Keep the current pick visible even when it isn't one of the suggestions.
  const shown = searching
    ? matches.slice(0, MAX_ICON_RESULTS)
    : isMaterialSymbol(value) && !suggestions.includes(value)
      ? [value, ...suggestions]
      : suggestions;

  return (
    <Box ref={ref} sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      <TextInput
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('projects.form.iconSearch', { count: MATERIAL_SYMBOL_NAMES.length })}
        slotProps={{
          htmlInput: { 'aria-label': t('projects.form.iconSearchLabel') },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Icon name="search" size={18} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Box
        role="listbox"
        aria-label={t('projects.form.icon')}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 156, overflowY: 'auto' }}
      >
        {shown.map((name) => (
          <OptionButton
            key={name}
            role="option"
            aria-selected={value === name}
            aria-label={name}
            title={name.replace(/_/g, ' ')}
            shape="square"
            size={buttonSize}
            color={color}
            selected={value === name}
            onClick={() => onChange(name)}
          >
            <MaterialSymbol name={name} size={iconSize} />
          </OptionButton>
        ))}
      </Box>
      {searching && (
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
          {matches.length === 0
            ? t('projects.form.iconNoMatch')
            : matches.length > MAX_ICON_RESULTS
              ? t('projects.form.iconMore', { shown: MAX_ICON_RESULTS, count: matches.length })
              : null}
        </Box>
      )}
    </Box>
  );
});

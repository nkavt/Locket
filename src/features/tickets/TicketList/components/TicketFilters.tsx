import { Box, InputAdornment } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { SelectInput, TextInput, type SelectOption } from '@/components/ui';
import { useTicketOptions } from '../../useTicketOptions';
import type { TicketFilterState } from '../../utils';

interface TicketFiltersProps {
  value: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
}

export function TicketFilters({ value, onChange }: TicketFiltersProps) {
  const { t } = useTranslation();
  const { statuses, priorities } = useTicketOptions();
  const STATUS_OPTIONS: SelectOption[] = [
    { value: 'all', label: t('tickets.filters.allStatuses') },
    ...statuses,
  ];
  const PRIORITY_OPTIONS: SelectOption[] = [
    { value: 'all', label: t('tickets.filters.allPriorities') },
    ...priorities,
  ];
  const set = (patch: Partial<TicketFilterState>) => onChange({ ...value, ...patch });
  return (
    <Box
      sx={{
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flex: 1, maxWidth: 360 }}>
        <TextInput
          size="small"
          placeholder={t('tickets.filters.searchPlaceholder')}
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon name="search" size={18} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <SelectInput
        value={value.status}
        onChange={(e) => set({ status: e.target.value })}
        options={STATUS_OPTIONS}
      />
      <SelectInput
        value={value.priority}
        onChange={(e) => set({ priority: e.target.value })}
        options={PRIORITY_OPTIONS}
      />
    </Box>
  );
}

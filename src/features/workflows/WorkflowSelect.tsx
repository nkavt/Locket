import { FormHelperText, Box } from '@mui/material';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldLabel, SelectInput } from '@/components/ui';
import { useWorkflows } from '@/state/useAppState';

interface WorkflowSelectProps {
  value: string;
  onChange: (workflowId: string) => void;
}

/** Pick a project's workflow; the hint says what it decides and where to edit workflows. */
export const WorkflowSelect = forwardRef<HTMLInputElement, WorkflowSelectProps>(
  function WorkflowSelect({ value, onChange }, ref) {
    const { t } = useTranslation();
    const workflows = useWorkflows();
    const options = workflows.map((w) => ({
      value: w.id,
      label: `${w.name} · ${w.statuses.map((s) => s.name).join(', ')}`,
    }));
    return (
      <Box>
        <FieldLabel>{t('projects.form.workflow')}</FieldLabel>
        <SelectInput
          ref={ref}
          fullWidth
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ 'aria-label': t('projects.form.workflow') }}
          // Plain text so a long status list ends in an ellipsis before the arrow.
          renderValue={(id) => options.find((o) => o.value === id)?.label ?? ''}
          options={options}
        />
        <FormHelperText sx={{ mx: 1.75 }}>{t('projects.form.workflowHint')}</FormHelperText>
      </Box>
    );
  },
);

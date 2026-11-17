import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatusCategory, Workflow } from '@/data/types';
import {
  DEFAULT_STATUS_COLOR,
  DEFAULT_STATUS_ICON,
  DEFAULT_WORKFLOW,
  statusNameIssues,
  type StatusInput,
} from '@/data/workflows';

export interface StatusDraft {
  /** Stable React key; new statuses have no `id` until saved. */
  key: string;
  id?: string;
  name: string;
  icon: string;
  color: string;
  category: StatusCategory;
}

/** Drag-to-reorder state the rows hook into. */
export interface DragReorder {
  /** Key of the row being dragged, if any. */
  key: string | null;
  start: (key: string) => void;
  /** The dragged row passed over `key`: move it there. */
  enter: (key: string) => void;
  end: () => void;
}

let draftKey = 0;
const nextKey = () => `draft-${++draftKey}`;

const toDrafts = (w: Workflow | null): StatusDraft[] =>
  (w?.statuses ?? DEFAULT_WORKFLOW.statuses).map((s) => ({
    key: nextKey(),
    // A new workflow copies the default statuses' look but gets its own ids on save.
    ...(w ? s : { ...s, id: undefined }),
  }));

/**
 * The editable status list of a workflow editor: rows, their name errors, and the edits
 * (add, change, remove, reorder by keys or by dragging). Starts from `workflow` on mount.
 */
export function useStatusDrafts(workflow: Workflow | null) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(() => toDrafts(workflow));
  /** A just-added row, whose name field takes focus. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const errors = useMemo(() => {
    const issues = statusNameIssues(rows.map((r) => r.name));
    const out: Record<string, string> = {};
    rows.forEach((r, i) => {
      const issue = issues[i];
      if (issue?.kind === 'blank') out[r.key] = t('settings.workflows.editor.blankName');
      if (issue?.kind === 'duplicate') {
        out[r.key] = t('settings.workflows.editor.duplicateName', { name: issue.name });
      }
    });
    return out;
  }, [rows, t]);

  const move = (from: number, to: number) =>
    setRows((list) => {
      if (from < 0 || to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  const indexOf = (key: string) => rows.findIndex((r) => r.key === key);

  const add = () => {
    const key = nextKey();
    setFocusKey(key);
    setRows((list) => [
      ...list,
      { key, name: '', icon: DEFAULT_STATUS_ICON, color: DEFAULT_STATUS_COLOR, category: 'todo' },
    ]);
  };
  const patch = (key: string, change: Partial<StatusDraft>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const remove = (key: string) => setRows((list) => list.filter((r) => r.key !== key));
  /** Keyboard reordering: -1 up, +1 down. */
  const shift = (key: string, delta: -1 | 1) => move(indexOf(key), indexOf(key) + delta);

  const drag: DragReorder = {
    key: dragKey,
    start: setDragKey,
    enter: (key) => {
      if (dragKey && dragKey !== key) move(indexOf(dragKey), indexOf(key));
    },
    end: () => setDragKey(null),
  };

  /** The rows as the service takes them. */
  const toInput = (): StatusInput[] =>
    rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      icon: r.icon,
      color: r.color,
      category: r.category,
    }));

  return {
    rows,
    errors,
    valid: rows.length > 0 && Object.keys(errors).length === 0,
    focusKey,
    add,
    patch,
    remove,
    shift,
    drag,
    toInput,
  };
}

import { useShallow } from 'zustand/react/shallow';

import { IconButton, UiIcon } from '~/shared/ui';

import { redo, undo, useHistoryStore } from '../model/history';
import styles from './undo-redo-buttons.module.css';

export function UndoRedoButtons() {
  const { canUndo, canRedo } = useHistoryStore(useShallow((state) => state));
  return (
    <div className={styles.group}>
      <IconButton label="Undo" disabled={!canUndo} onClick={undo}>
        <UiIcon name="undo" />
      </IconButton>
      <IconButton label="Redo" disabled={!canRedo} onClick={redo}>
        <UiIcon name="redo" />
      </IconButton>
    </div>
  );
}

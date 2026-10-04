import { useShallow } from 'zustand/react/shallow';

import { UiIcon } from '~/shared/ui';

import { useHistoryStore, redo, undo } from '../model/history';
import styles from './undo-redo-buttons.module.css';

export function UndoRedoButtons() {
  const { canUndo, canRedo } = useHistoryStore(useShallow((state) => state));
  return (
    <div className={styles.group}>
      <button type="button" className="eq-ib" aria-label="Undo" disabled={!canUndo} onClick={undo}>
        <UiIcon name="undo" />
      </button>
      <button type="button" className="eq-ib" aria-label="Redo" disabled={!canRedo} onClick={redo}>
        <UiIcon name="redo" />
      </button>
    </div>
  );
}

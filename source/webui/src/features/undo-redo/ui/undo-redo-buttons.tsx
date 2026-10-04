import { shallowEqual, useStore } from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { historyStore, redo, undo } from '../model/history';
import styles from './undo-redo-buttons.module.css';

export const UndoRedoButtons = () => {
  const { canUndo, canRedo } = useStore(historyStore, (state) => state, shallowEqual);
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
};

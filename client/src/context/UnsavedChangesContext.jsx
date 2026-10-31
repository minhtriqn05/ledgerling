import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button/Button.jsx';
import Modal from '../components/Modal/Modal.jsx';
import styles from './UnsavedChanges.module.css';

// "You have unsaved changes": a form tells this guard it is dirty with useUnsavedChanges(dirty). While one is:
//  - leaving for another page inside the app asks first, in a dialog (useBlocker of React Router, it needs a data router: see main.jsx)
//  - closing or reloading the tab asks too, with the browser's own question (beforeunload)
// Without a guard (a unit test of one form) the hook does nothing.

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesGuard({ children }) {
  const { t } = useTranslation();
  const [dirtyCount, setDirtyCount] = useState(0);
  const dirty = dirtyCount > 0;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = ''; // older browsers only show the question with this
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const addDirty = useCallback(() => {
    setDirtyCount((count) => count + 1);
    return () => setDirtyCount((count) => count - 1);
  }, []);
  const value = useMemo(() => ({ addDirty }), [addDirty]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {blocker.state === 'blocked' && (
          <Modal key="unsaved" title={t('unsaved.title')} onClose={() => blocker.reset()}>
            <p className={styles.text}>{t('unsaved.text')}</p>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => blocker.reset()} data-autofocus>
                {t('unsaved.stay')}
              </Button>
              <Button variant="danger" onClick={() => blocker.proceed()}>
                {t('unsaved.leave')}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </UnsavedChangesContext.Provider>
  );
}

// For a form: useUnsavedChanges(name !== savedName). It counts as long as `dirty` is true and the form is on screen.
export function useUnsavedChanges(dirty) {
  const addDirty = useContext(UnsavedChangesContext)?.addDirty;

  useEffect(() => {
    if (!dirty || !addDirty) return undefined;
    return addDirty();
  }, [dirty, addDirty]);
}

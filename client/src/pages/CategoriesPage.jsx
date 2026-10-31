import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCategories, deleteCategory } from '../api/categories.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import SegmentedControl from '../components/SegmentedControl/SegmentedControl.jsx';
import Button from '../components/Button/Button.jsx';
import Alert from '../components/Alert/Alert.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import CategoryCard from './categories/CategoryCard.jsx';
import CategoryForm from './categories/CategoryForm.jsx';
import styles from './CategoriesPage.module.css';

// Design: CategoriesPreview in pages/styleGuide. The list is on the left (Expense / Income switch + cards),
// the "New category" / "Edit category" form on the right (below the list on smaller screens).

// Same order as the API: by name, ignoring upper / lower case.
function sortByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // "Try again" changes it, which runs the effect again
  const [activeType, setActiveType] = useState('expense');
  // The form on the right: which category it edits (null = a new one). A new `key` rebuilds it (see openForm).
  const [form, setForm] = useState({ key: 0, category: null, focus: false });
  const toast = useToast();

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  // Opens the form empty (category = null) or filled in with a category to edit.
  // The new key makes React build a fresh form. focus: put the cursor in the Name field
  // (on phones the browser also scrolls down to the form). The first form has focus: false,
  // so opening the page never jumps.
  function openForm(category, focus = true) {
    setForm((current) => ({ key: current.key + 1, category, focus }));
  }

  function changeType(type) {
    setActiveType(type);
  }

  // The form calls this with the category the API returned (new or updated).
  function handleSaved(saved) {
    toast.success(form.category ? t('categories.updated') : t('categories.added'));
    setCategories((list) => sortByName([...list.filter((c) => c._id !== saved._id), saved]));
    setActiveType(saved.type); // show the list it belongs to
    openForm(null);
  }

  // A card calls this once its delete is confirmed.
  async function handleDelete(category) {
    try {
      await deleteCategory(category._id);
      setCategories((list) => list.filter((c) => c._id !== category._id));
      toast.success(t('categories.deleted'));
      // If it was open in the form, the form goes back to "New category".
      if (form.category?._id === category._id) openForm(null, false);
    } catch (err) {
      toast.error(getErrorMessage(err)); // e.g. "Category still has transactions"
    }
  }

  const ready = !loading && !loadError;
  const expenseCount = categories.filter((c) => c.type === 'expense').length;
  const incomeCount = categories.filter((c) => c.type === 'income').length;
  const visible = categories.filter((c) => c.type === activeType);

  // The counts appear once the list has loaded.
  const typeOptions = [
    { value: 'expense', label: ready ? `${t('common.expense')} · ${expenseCount}` : t('common.expense') },
    { value: 'income', label: ready ? `${t('common.income')} · ${incomeCount}` : t('common.income') },
  ];

  // The left column shows one of four states: loading, error, empty or the cards.
  function renderList() {
    if (loading) return <LoadingState skeleton="cards">{t('categories.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    if (visible.length === 0) {
      return (
        <EmptyState icon="categories" title={t(`categories.empty.${activeType}`)} text={t(`categories.emptyText.${activeType}`)}>
          <Button icon="plus" onClick={() => openForm(null)}>
            {t('categories.new')}
          </Button>
        </EmptyState>
      );
    }

    return (
      <ul className={styles.grid}>
        {visible.map((category, index) => (
          <Reveal as="li" key={category._id} index={index}>
            <CategoryCard category={category} onEdit={openForm} onDelete={handleDelete} />
          </Reveal>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.categories')} subtitle={t('categories.subtitle')}>
        <Button icon="plus" onClick={() => openForm(null)}>
          {t('categories.new')}
        </Button>
      </PageHeader>

      <div className={styles.layout}>
        <section className={styles.listColumn} aria-label={t('categories.yours')}>
          <div className={styles.listHeader}>
            <SegmentedControl label={t('categories.typeLabel')} options={typeOptions} value={activeType} onChange={changeType} />
          </div>
          {renderList()}
        </section>

        <CategoryForm
          key={form.key}
          category={form.category}
          defaultType={activeType}
          autoFocus={form.focus}
          onSaved={handleSaved}
          onCancel={() => openForm(null)}
        />
      </div>
    </div>
  );
}

import PreviewShell, { AddButton, CardHeader, Topbar } from './PreviewShell.jsx';
import Icon from './icons.jsx';
import { categories } from './sampleData.js';
import { formatVnd } from '../../utils/format.js';
import ui from './ui.module.css';
import styles from './CategoriesPreview.module.css';

// Static mock of the Categories page: category cards + the "New category" form.

const palette = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7', '--chart-8'];
const selectedColor = '--chart-4';

export default function CategoriesPreview() {
  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');
  const expenseTotal = expense.reduce((sum, c) => sum + c.amount, 0);

  return (
    <PreviewShell active="categories">
      <Topbar title="Categories" subtitle="Group your money the way you think about it.">
        <AddButton label="New category" />
      </Topbar>

      <div className={styles.layout}>
        <section className={styles.listColumn}>
          <div className={styles.listHeader}>
            <div className={ui.segmented}>
              <button type="button" className={`${ui.segment} ${ui.segmentActive}`}>
                Expense · {expense.length}
              </button>
              <button type="button" className={ui.segment}>
                Income · {income.length}
              </button>
            </div>
            <span className={ui.muted}>October 2026</span>
          </div>

          <div className={styles.grid}>
            {expense.map((c) => {
              const share = Math.round((c.amount / expenseTotal) * 100);
              return (
                <article key={c.id} className={`${ui.card} ${styles.categoryCard}`} style={{ '--tone': `var(${c.color})` }}>
                  <div className={styles.cardTop}>
                    <span className={ui.avatar}>{c.name[0]}</span>
                    <span className={styles.cardActions}>
                      <button type="button" className={ui.iconBtn} aria-label={`Edit ${c.name}`}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button type="button" className={`${ui.iconBtn} ${ui.iconBtnDanger}`} aria-label={`Delete ${c.name}`}>
                        <Icon name="trash" size={16} />
                      </button>
                    </span>
                  </div>
                  <h4 className={styles.categoryName}>{c.name}</h4>
                  <p className={styles.categoryMeta}>
                    {c.count} {c.count === 1 ? 'transaction' : 'transactions'}
                  </p>
                  <p className={styles.categoryAmount}>{formatVnd(c.amount)}</p>
                  <div className={ui.progress} aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </div>
                  <span className={styles.categoryShare}>{share}% of spending</span>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={styles.side}>
          <article className={ui.card}>
            <CardHeader icon="plus" tone={ui.toneSky} title="New category" subtitle="Name, type and color" />
            <div className={styles.form}>
              <label className={ui.field}>
                <span className={ui.label}>Name</span>
                <input className={ui.input} defaultValue="Coffee" />
              </label>

              <div className={ui.field}>
                <span className={ui.label}>Type</span>
                <div className={styles.typeToggle}>
                  <button type="button" className={`${ui.segment} ${ui.segmentExpense}`}>
                    Expense
                  </button>
                  <button type="button" className={ui.segment}>
                    Income
                  </button>
                </div>
              </div>

              <div className={ui.field}>
                <span className={ui.label}>Color</span>
                <div className={styles.swatches} role="radiogroup" aria-label="Color">
                  {palette.map((token, index) => {
                    const selected = token === selectedColor;
                    return (
                      <button
                        key={token}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`Color ${index + 1}`}
                        className={`${styles.swatch} ${selected ? styles.swatchSelected : ''}`}
                        style={{ '--tone': `var(${token})` }}
                      >
                        {selected && <Icon name="check" size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.previewRow}>
                <span className={ui.label}>Preview</span>
                <span className={ui.chip} style={{ '--tone': `var(${selectedColor})` }}>
                  <i className={ui.dot} />
                  Coffee
                </span>
              </div>

              <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnBlock}`}>
                Create category
              </button>
            </div>
          </article>

          <div className={`${ui.alert} ${ui.alertError}`} role="alert">
            <Icon name="alert" size={18} />
            <span>
              <strong>Can't delete "Food".</strong> It still has 24 transactions. Move or delete them first.
            </span>
          </div>
        </aside>
      </div>
    </PreviewShell>
  );
}

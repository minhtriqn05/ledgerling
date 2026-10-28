import PreviewShell, { AddButton, MonthPicker, Topbar } from './PreviewShell.jsx';
import Icon from './icons.jsx';
import { summary, transactions, categories } from './sampleData.js';
import { formatDate, formatDayMonth, formatSignedVnd, formatVnd } from '../../utils/format.js';
import ui from './ui.module.css';
import styles from './TransactionsPreview.module.css';

// Static mock of the Transactions page and its "Add transaction" dialog.

function SummaryCard({ tone, icon, label, value, valueClass }) {
  return (
    <div className={`${styles.summaryCard} ${tone}`}>
      <span className={`${ui.tile} ${styles.summaryTile}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.summaryText}>
        <span>{label}</span>
        <strong className={valueClass}>{value}</strong>
      </div>
    </div>
  );
}

// The real dialog opens over the page; here it is drawn on a dimmed panel.
function AddTransactionDialog() {
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <section>
      <p className={styles.stageLabel}>"Add transaction" dialog (opens over the page)</p>
      <div className={styles.stage}>
        <div className={styles.dialog} role="dialog" aria-label="Add transaction (preview)">
          <div className={styles.dialogHeader}>
            <h4 className={ui.cardTitle}>Add transaction</h4>
            <button type="button" className={ui.iconBtn} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className={styles.typeToggle}>
            <button type="button" className={`${ui.segment} ${ui.segmentExpense}`}>
              <Icon name="arrowUpRight" size={16} />
              Expense
            </button>
            <button type="button" className={ui.segment}>
              <Icon name="arrowDownLeft" size={16} />
              Income
            </button>
          </div>

          <label className={ui.field}>
            <span className={ui.label}>Amount</span>
            <span className={styles.amountBox}>
              <input className={styles.amountInput} defaultValue="185.000" inputMode="numeric" />
              <span>₫</span>
            </span>
          </label>

          <div className={ui.field}>
            <span className={ui.label}>Category</span>
            <div className={styles.categoryPicker} role="radiogroup" aria-label="Category">
              {expenseCategories.map((c) => {
                const selected = c.name === 'Food';
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`${ui.chip} ${styles.chipOption} ${selected ? styles.chipSelected : ''}`}
                    style={{ '--tone': `var(${c.color})` }}
                  >
                    {selected ? <Icon name="check" size={14} /> : <i className={ui.dot} />}
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={ui.field}>
              <span className={ui.label}>Date</span>
              <input className={ui.input} type="date" defaultValue="2026-10-25" />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Note</span>
              <input className={ui.input} defaultValue="Lunch with team" />
            </label>
          </div>

          <div className={styles.dialogActions}>
            <button type="button" className={`${ui.btn} ${ui.btnSecondary}`}>
              Cancel
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`}>
              Save transaction
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TransactionsPreview() {
  const net = summary.income - summary.expense;

  return (
    <div className={styles.stack}>
      <PreviewShell active="transactions">
        <Topbar title="Transactions" subtitle={`October 2026 · ${summary.transactionCount} transactions`}>
          <MonthPicker />
          <AddButton />
        </Topbar>

        <section className={styles.summary}>
          <SummaryCard
            tone={ui.toneIncome}
            icon="arrowDownLeft"
            label="Income"
            value={formatSignedVnd(summary.income, 'income')}
            valueClass={ui.income}
          />
          <SummaryCard
            tone={ui.toneExpense}
            icon="arrowUpRight"
            label="Expense"
            value={formatSignedVnd(summary.expense, 'expense')}
            valueClass={ui.expense}
          />
          <SummaryCard tone={ui.toneSky} icon="wallet" label="Net" value={formatVnd(net)} valueClass={styles.net} />
        </section>

        <article className={ui.card}>
          <div className={styles.filters}>
            <span className={`${ui.inputWrap} ${styles.search}`}>
              <Icon name="search" size={18} />
              <input className={ui.input} placeholder="Search notes" aria-label="Search notes" />
            </span>
            <div className={ui.segmented}>
              <button type="button" className={`${ui.segment} ${ui.segmentActive}`}>
                All
              </button>
              <button type="button" className={ui.segment}>
                Income
              </button>
              <button type="button" className={ui.segment}>
                Expense
              </button>
            </div>
            <select className={`${ui.input} ${styles.categorySelect}`} defaultValue="all" aria-label="Category">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`${ui.tableWrap} ${styles.tableArea}`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th className={ui.alignRight}>Amount</th>
                  <th className={ui.alignRight}>
                    <span className={ui.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className={styles.txCell}>
                        <span className={ui.avatar} style={{ '--tone': `var(${t.color})` }}>
                          {t.category[0]}
                        </span>
                        <span className={styles.txNote}>{t.note}</span>
                      </span>
                    </td>
                    <td>
                      <span className={ui.chip} style={{ '--tone': `var(${t.color})` }}>
                        <i className={ui.dot} />
                        {t.category}
                      </span>
                    </td>
                    <td className={ui.muted}>{formatDate(t.date)}</td>
                    <td className={`${ui.alignRight} ${ui.amount} ${t.type === 'income' ? ui.income : ui.expense}`}>
                      {formatSignedVnd(t.amount, t.type)}
                    </td>
                    <td className={ui.alignRight}>
                      <span className={styles.rowActions}>
                        <button type="button" className={ui.iconBtn} aria-label={`Edit ${t.note}`}>
                          <Icon name="edit" size={18} />
                        </button>
                        <button type="button" className={`${ui.iconBtn} ${ui.iconBtnDanger}`} aria-label={`Delete ${t.note}`}>
                          <Icon name="trash" size={18} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* On phones the table becomes a simple list; tapping a row opens the edit dialog. */}
          <ul className={styles.mobileList}>
            {transactions.map((t) => (
              <li key={t.id} className={styles.mobileRow}>
                <span className={ui.avatar} style={{ '--tone': `var(${t.color})` }}>
                  {t.category[0]}
                </span>
                <span className={styles.mobileText}>
                  <strong>{t.note}</strong>
                  <span>
                    {t.category} · {formatDayMonth(t.date)}
                  </span>
                </span>
                <span className={`${ui.amount} ${t.type === 'income' ? ui.income : ui.expense}`}>
                  {formatSignedVnd(t.amount, t.type)}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.pager}>
            <span className={ui.muted}>
              Showing 1–{transactions.length} of {summary.transactionCount}
            </span>
            <div className={styles.pages}>
              <button type="button" className={styles.pageButton} aria-label="Previous page">
                <Icon name="chevronLeft" size={16} />
              </button>
              {[1, 2, 3, 4, 5, 6].map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`${styles.pageButton} ${page === 1 ? styles.pageActive : ''}`}
                >
                  {page}
                </button>
              ))}
              <button type="button" className={styles.pageButton} aria-label="Next page">
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          </div>
        </article>
      </PreviewShell>

      <AddTransactionDialog />
    </div>
  );
}

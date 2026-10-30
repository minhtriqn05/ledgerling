import { formatDateDMY, formatDayMonth, formatSignedVnd } from '../../utils/format.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './TransactionList.module.css';

// Marks a transaction that a recurring rule created
function RecurringLabel() {
  return (
    <span className={styles.recurring}>
      <Icon name="repeat" size={12} />
      Recurring
    </span>
  );
}

// The tags of one transaction as small buttons: a click filters the list by that tag.
function TagChips({ tags = [], onTagClick }) {
  return tags.map((tag) => (
    <button
      key={tag}
      type="button"
      className={styles.tag}
      aria-label={`Filter by tag ${tag}`}
      onClick={() => onTagClick(tag)}
    >
      #{tag}
    </button>
  ));
}

// The month's transactions: a table on wide screens, a simple list on phones (≤640px, see the css).
// Design: TransactionsPreview in pages/styleGuide.
// On the phone list a tap opens the edit dialog (which also has the Delete button).
// onTagClick(tag) is called when a tag chip is clicked.
export default function TransactionList({ transactions, onEdit, onDelete, onTagClick }) {
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th>Tags</th>
              <th className={styles.alignRight}>Amount</th>
              <th className={styles.alignRight}>
                <span className={styles.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id}>
                <td className={styles.muted}>{formatDateDMY(t.date)}</td>
                <td>
                  <span className={styles.chip} style={{ '--tone': t.category.color }}>
                    <i className={styles.dot} />
                    {t.category.name}
                  </span>
                  {t.recurringRuleId && <RecurringLabel />}
                </td>
                <td className={styles.note}>{t.note || <span className={styles.muted}>—</span>}</td>
                <td>
                  <span className={styles.tags}>
                    <TagChips tags={t.tags} onTagClick={onTagClick} />
                  </span>
                </td>
                <td className={`${styles.alignRight} ${styles.amount} ${styles[t.type]}`}>
                  {formatSignedVnd(t.amount, t.type)}
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.rowActions}>
                    <IconButton icon="edit" label={`Edit ${t.note || t.category.name}`} onClick={() => onEdit(t)} />
                    <IconButton
                      icon="trash"
                      label={`Delete ${t.note || t.category.name}`}
                      danger
                      onClick={() => onDelete(t)}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.mobileList}>
        {transactions.map((t) => (
          <li key={t._id}>
            <button type="button" className={styles.mobileRow} onClick={() => onEdit(t)}>
              <span className={styles.avatar} style={{ '--tone': t.category.color }} aria-hidden="true">
                {t.category.name.charAt(0).toUpperCase()}
              </span>
              <span className={styles.mobileText}>
                <strong>{t.note || t.category.name}</strong>
                <span>
                  {t.category.name} · {formatDayMonth(t.date)}
                  {t.recurringRuleId && <RecurringLabel />}
                </span>
              </span>
              <span className={`${styles.amount} ${styles[t.type]}`}>{formatSignedVnd(t.amount, t.type)}</span>
            </button>
            {/* Outside the row button: a button cannot hold other buttons */}
            {t.tags?.length > 0 && (
              <span className={`${styles.tags} ${styles.mobileTags}`}>
                <TagChips tags={t.tags} onTagClick={onTagClick} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

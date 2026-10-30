import { useEffect, useRef } from 'react';
import { formatDateDMY, formatDayMonth, formatSignedVnd } from '../../utils/format.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
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

// The "select all" box: checked when every row is selected, "mixed" (a dash) when only some are.
function SelectAll({ label, checked, indeterminate, onChange }) {
  const ref = useRef(null);
  // `indeterminate` is a property of the element, not an HTML attribute, so it is set here
  useEffect(() => {
    ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.check}
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

// The month's transactions: a table on wide screens, a simple list on phones (≤640px, see the css).
// Design: TransactionsPreview in pages/styleGuide.
// On the phone list a tap opens the edit dialog (which also has the Delete button).
// onTagClick(tag) is called when a tag chip is clicked.
// Selection (bulk actions) is on when onToggle is given: selectedIds is a Set of transaction ids,
// onToggle(id) flips one row and onToggleAll(checked) selects or clears every row shown.
export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  onTagClick,
  selectedIds = new Set(),
  onToggle,
  onToggleAll,
}) {
  const selectable = Boolean(onToggle);
  const selectedCount = transactions.filter((t) => selectedIds.has(t._id)).length;
  const allSelected = transactions.length > 0 && selectedCount === transactions.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const selectAll = (
    <SelectAll label="Select all on this page" checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} />
  );

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable && <th className={styles.checkCell}>{selectAll}</th>}
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
              <tr key={t._id} className={selectedIds.has(t._id) ? styles.selectedRow : undefined}>
                {selectable && (
                  <td className={styles.checkCell}>
                    <input
                      type="checkbox"
                      className={styles.check}
                      aria-label={`Select ${t.note || t.category.name}`}
                      checked={selectedIds.has(t._id)}
                      onChange={() => onToggle(t._id)}
                    />
                  </td>
                )}
                <td className={styles.muted}>{formatDateDMY(t.date)}</td>
                <td>
                  <span className={styles.chip} style={{ '--tone': t.category.color }}>
                    <CategoryMark icon={t.category.icon}>
                      <i className={styles.dot} />
                    </CategoryMark>
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

      <div className={styles.mobileList}>
        {selectable && (
          <label className={styles.mobileSelectAll}>
            {selectAll}
            <span>Select all</span>
          </label>
        )}
        <ul className={styles.mobileItems}>
          {transactions.map((t) => (
            <li key={t._id} className={selectedIds.has(t._id) ? styles.selectedRow : undefined}>
              <div className={styles.mobileItem}>
                {selectable && (
                  <input
                    type="checkbox"
                    className={styles.check}
                    aria-label={`Select ${t.note || t.category.name}`}
                    checked={selectedIds.has(t._id)}
                    onChange={() => onToggle(t._id)}
                  />
                )}
                <button type="button" className={styles.mobileRow} onClick={() => onEdit(t)}>
                  <span
                    className={`${styles.avatar} ${t.category.icon ? styles.avatarIcon : ''}`}
                    style={{ '--tone': t.category.color }}
                    aria-hidden="true"
                  >
                    {t.category.icon || t.category.name.charAt(0).toUpperCase()}
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
              </div>
              {/* Outside the row button: a button cannot hold other buttons */}
              {t.tags?.length > 0 && (
                <span className={`${styles.tags} ${styles.mobileTags} ${selectable ? styles.mobileTagsSelectable : ''}`}>
                  <TagChips tags={t.tags} onTagClick={onTagClick} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

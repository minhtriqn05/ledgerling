import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateDMY, formatDayMonth, formatSignedVnd } from '../../utils/format.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import Icon from '../../components/Icon.jsx';
import Reveal from '../../components/Motion/Reveal.jsx';
import styles from './TransactionList.module.css';

// Marks a transaction that a recurring rule created
function RecurringLabel() {
  const { t } = useTranslation();

  return (
    <span className={styles.recurring}>
      <Icon name="repeat" size={12} />
      {t('transactions.recurringLabel')}
    </span>
  );
}

// The tags of one transaction as small buttons: a click filters the list by that tag.
function TagChips({ tags = [], onTagClick }) {
  const { t } = useTranslation();

  return tags.map((tag) => (
    <button
      key={tag}
      type="button"
      className={styles.tag}
      aria-label={t('transactions.filterByTag', { tag })}
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
// A click on a row (or a tap on the phone list) calls onOpen(transaction), which opens the details drawer.
// Without onOpen (old callers) the row opens the edit dialog.
// onTagClick(tag) is called when a tag chip is clicked.
// Selection (bulk actions) is on when onToggle is given: selectedIds is a Set of transaction ids,
// onToggle(id) flips one row and onToggleAll(checked) selects or clears every row shown.
export default function TransactionList({
  transactions,
  onOpen,
  onEdit,
  onDelete,
  onTagClick,
  selectedIds = new Set(),
  onToggle,
  onToggleAll,
}) {
  const { t } = useTranslation();
  const selectable = Boolean(onToggle);
  const open = onOpen ?? onEdit;
  const selectedCount = transactions.filter((t) => selectedIds.has(t._id)).length;
  const allSelected = transactions.length > 0 && selectedCount === transactions.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const selectAll = (
    <SelectAll label={t('transactions.selectAllOnPage')} checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} />
  );

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable && <th className={styles.checkCell}>{selectAll}</th>}
              <th>{t('common.date')}</th>
              <th>{t('common.category')}</th>
              <th>{t('common.note')}</th>
              <th>{t('common.tags')}</th>
              <th className={styles.alignRight}>{t('common.amount')}</th>
              <th className={styles.alignRight}>
                <span className={styles.srOnly}>{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item, index) => (
              <Reveal
                as="tr"
                key={item._id}
                index={index}
                className={`${styles.row} ${selectedIds.has(item._id) ? styles.selectedRow : ''}`}
                data-testid="transaction-row"
                onClick={(event) => {
                  // Buttons, tag chips and checkboxes in the row do their own thing
                  if (!event.target.closest('button, input, a, label')) open(item);
                }}
              >
                {selectable && (
                  <td className={styles.checkCell}>
                    <input
                      type="checkbox"
                      className={styles.check}
                      aria-label={t('common.selectName', { name: item.note || item.category.name })}
                      checked={selectedIds.has(item._id)}
                      onChange={() => onToggle(item._id)}
                    />
                  </td>
                )}
                <td className={styles.muted}>{formatDateDMY(item.date)}</td>
                <td>
                  <span className={styles.chip} style={{ '--tone': item.category.color }}>
                    <CategoryMark category={item.category} />
                    {item.category.name}
                  </span>
                  {item.recurringRuleId && <RecurringLabel />}
                </td>
                {/* The note is a real button too, so the details also open from the keyboard */}
                <td className={styles.note}>
                  <button
                    type="button"
                    className={styles.noteButton}
                    aria-label={t('transactions.openDetails', { name: item.note || item.category.name })}
                    onClick={() => open(item)}
                  >
                    {item.note || <span className={styles.muted}>—</span>}
                  </button>
                </td>
                <td>
                  <span className={styles.tags}>
                    <TagChips tags={item.tags} onTagClick={onTagClick} />
                  </span>
                </td>
                <td className={`${styles.alignRight} ${styles.amount} ${styles[item.type]}`}>
                  {formatSignedVnd(item.amount, item.type)}
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.rowActions}>
                    <IconButton needsNetwork icon="edit" label={t('common.editName', { name: item.note || item.category.name })} onClick={() => onEdit(item)} />
                    <IconButton needsNetwork
                      icon="trash"
                      label={t('common.deleteName', { name: item.note || item.category.name })}
                      danger
                      onClick={() => onDelete(item)}
                    />
                  </span>
                </td>
              </Reveal>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {selectable && (
          <label className={styles.mobileSelectAll}>
            {selectAll}
            <span>{t('transactions.selectAll')}</span>
          </label>
        )}
        <ul className={styles.mobileItems}>
          {transactions.map((item, index) => (
            <Reveal as="li" key={item._id} index={index} className={selectedIds.has(item._id) ? styles.selectedRow : undefined}>
              <div className={styles.mobileItem}>
                {selectable && (
                  <input
                    type="checkbox"
                    className={styles.check}
                    aria-label={t('common.selectName', { name: item.note || item.category.name })}
                    checked={selectedIds.has(item._id)}
                    onChange={() => onToggle(item._id)}
                  />
                )}
                <button type="button" className={styles.mobileRow} onClick={() => open(item)}>
                  <CategoryMark category={item.category} size="lg" />
                  <span className={styles.mobileText}>
                    <strong>{item.note || item.category.name}</strong>
                    <span>
                      {item.category.name} · {formatDayMonth(item.date)}
                      {item.recurringRuleId && <RecurringLabel />}
                    </span>
                  </span>
                  <span className={`${styles.amount} ${styles[item.type]}`}>{formatSignedVnd(item.amount, item.type)}</span>
                </button>
              </div>
              {/* Outside the row button: a button cannot hold other buttons */}
              {item.tags?.length > 0 && (
                <span className={`${styles.tags} ${styles.mobileTags} ${selectable ? styles.mobileTagsSelectable : ''}`}>
                  <TagChips tags={item.tags} onTagClick={onTagClick} />
                </span>
              )}
            </Reveal>
          ))}
        </ul>
      </div>
    </>
  );
}

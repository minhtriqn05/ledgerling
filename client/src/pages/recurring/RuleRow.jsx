import { formatDate, formatSignedVnd } from '../../utils/format.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './RuleRow.module.css';

const FREQUENCY_LABELS = { weekly: 'Weekly', monthly: 'Monthly' };

// What the "Next run" column says: a rule that is off or past its end date has no next run.
function nextRunText(rule) {
  if (rule.ended) return 'Ended';
  if (!rule.active) return 'Paused';
  return formatDate(rule.nextRunDate);
}

// One rule in the list: category dot + name, note, amount, frequency, next run, Active switch, edit and delete.
// `toggling` is true while the switch waits for the API.
export default function RuleRow({ rule, toggling, onToggle, onEdit, onDelete }) {
  const { category } = rule;
  const name = rule.note || category.name;

  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <span className={styles.category}>
          <CategoryMark icon={category.icon}>
            <i className={styles.dot} style={{ background: category.color }} aria-hidden="true" />
          </CategoryMark>
          {category.name}
        </span>
        {rule.note && <span className={styles.note}>{rule.note}</span>}
      </div>

      <span className={`${styles.amount} ${styles[category.type]}`}>{formatSignedVnd(rule.amount, category.type)}</span>

      <span className={styles.frequency}>{FREQUENCY_LABELS[rule.frequency]}</span>

      <span className={styles.nextRun}>
        <span className={styles.caption}>Next run</span>
        {nextRunText(rule)}
      </span>

      <button
        type="button"
        role="switch"
        className={styles.switch}
        aria-checked={rule.active}
        aria-label={`Active: ${name}`}
        disabled={toggling}
        onClick={() => onToggle(rule)}
      >
        <span className={styles.knob} />
      </button>

      <span className={styles.actions}>
        <IconButton icon="edit" label={`Edit ${name}`} onClick={() => onEdit(rule)} />
        <IconButton icon="trash" label={`Delete ${name}`} danger onClick={() => onDelete(rule)} />
      </span>
    </li>
  );
}

import { useTranslation } from 'react-i18next';
import { formatDate, formatSignedVnd } from '../../utils/format.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import Reveal from '../../components/Motion/Reveal.jsx';
import styles from './RuleRow.module.css';

// What the "Next run" column says: a rule that is off or past its end date has no next run.
function nextRunText(rule, t) {
  if (rule.ended) return t('recurring.ended');
  if (!rule.active) return t('recurring.paused');
  return formatDate(rule.nextRunDate);
}

// One rule in the list: category dot + name, note, amount, frequency, next run, Active switch, edit and delete.
// `toggling` is true while the switch waits for the API.
export default function RuleRow({ rule, index = 0, toggling, onToggle, onEdit, onDelete }) {
  const { t } = useTranslation();
  const { category } = rule;
  const name = rule.note || category.name;

  return (
    <Reveal as="li" index={index} className={styles.row}>
      <div className={styles.main}>
        <span className={styles.category}>
          <CategoryMark category={category} size="md" />
          {category.name}
        </span>
        {rule.note && <span className={styles.note}>{rule.note}</span>}
      </div>

      <span className={`${styles.amount} ${styles[category.type]}`}>{formatSignedVnd(rule.amount, category.type)}</span>

      <span className={styles.frequency}>{t(`recurring.${rule.frequency}`)}</span>

      <span className={styles.nextRun}>
        <span className={styles.caption}>{t('recurring.nextRun')}</span>
        {nextRunText(rule, t)}
      </span>

      <button
        type="button"
        role="switch"
        className={styles.switch}
        aria-checked={rule.active}
        aria-label={t('recurring.active', { name })}
        disabled={toggling}
        onClick={() => onToggle(rule)}
      >
        <span className={styles.knob} />
      </button>

      <span className={styles.actions}>
        <IconButton icon="edit" label={t('common.editName', { name })} onClick={() => onEdit(rule)} />
        <IconButton icon="trash" label={t('common.deleteName', { name })} danger onClick={() => onDelete(rule)} />
      </span>
    </Reveal>
  );
}

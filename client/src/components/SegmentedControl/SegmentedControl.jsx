import styles from './SegmentedControl.module.css';

// A row of pill buttons where exactly one option is selected (like tabs or radio buttons).
// options: [{ value, label, tone }] – the optional tone ('income' or 'expense') colors the selected option's text.
// `label` names the group for screen readers; `block` makes it full width with equal parts.
export default function SegmentedControl({ options, value, onChange, label, block = false, disabled = false }) {
  return (
    <div className={`${styles.group} ${block ? styles.block : ''}`} role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        const classes = [styles.option, selected ? styles.selected : '', selected && option.tone ? styles[option.tone] : '']
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={option.value}
            type="button"
            className={classes}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

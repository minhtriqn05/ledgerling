import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import Popover from '../Popover/Popover.jsx';
import styles from './Select.module.css';

const EASE = [0.22, 0.61, 0.36, 1];

// options: [{ value, label, lang? }] or groups [{ group: 'Expense', options: [...] }] (both can be mixed).
// Returns the options in one list, each with its group name ('' when it has none).
export function flattenOptions(options) {
  return options.flatMap((item) =>
    item.options ? item.options.map((option) => ({ ...option, group: item.group })) : [{ ...item, group: '' }]
  );
}

// The next option whose label starts with what was typed, searching from the one after `from`.
export function findByText(flat, text, from) {
  const wanted = text.toLocaleLowerCase();
  for (let step = 1; step <= flat.length; step += 1) {
    const index = (((from + step) % flat.length) + flat.length) % flat.length;
    if (String(flat[index].label).toLocaleLowerCase().startsWith(wanted)) return index;
  }
  return -1;
}

// A drop-down list drawn by Ledgerling instead of the browser's <select>.
// The button is a "combobox": the keyboard focus stays on it while the arrow keys move a highlight through the
// list (aria-activedescendant). Enter or Space picks, Escape closes, typing a letter jumps to an option.
// A soft pill slides behind the highlighted option, and the chosen one gets a check mark.
// The label comes from a <label htmlFor={id}> next to it, or from the `label` prop (aria-label).
// variant: 'field' (like a text input) or 'pill' (rounded, e.g. the language switcher).
export default function Select({
  id,
  value,
  onChange,
  options,
  label,
  icon = null,
  variant = 'field',
  disabled = false,
  className = '',
  'data-testid': testId,
}) {
  const ownId = useId();
  const triggerId = id ?? ownId;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef(null);
  const typed = useRef({ text: '', timer: null });
  const flat = useMemo(() => flattenOptions(options), [options]);
  const selectedIndex = flat.findIndex((option) => option.value === value);
  const selected = flat[selectedIndex];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const optionId = (index) => `${listId}-${index}`;

  useEffect(() => () => clearTimeout(typed.current.timer), []);

  // The highlighted option stays in view when the list scrolls (jsdom has no scrollIntoView)
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  function openList(index = selectedIndex) {
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(index) {
    setOpen(false);
    if (flat[index] && flat[index].value !== value) onChange(flat[index].value);
  }

  function typeAhead(key) {
    const memory = typed.current;
    clearTimeout(memory.timer);
    memory.text += key;
    memory.timer = setTimeout(() => {
      memory.text = '';
    }, 600);
    // The first letter moves past the current option (typing it again goes to the next one);
    // more letters keep the current option if it still matches.
    const current = open ? active : selectedIndex;
    const found = findByText(flat, memory.text, memory.text.length === 1 ? current : current - 1);
    if (found >= 0) openList(found);
  }

  function handleKeyDown(event) {
    const { key } = event;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault();
        openList();
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        typeAhead(key);
      }
      return;
    }

    const last = flat.length - 1;
    const moves = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + 5, last),
      PageUp: Math.max(active - 5, 0),
    };
    if (key in moves) {
      event.preventDefault();
      setActive(moves[key]);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (key === 'Escape') {
      // Inside a dialog, Escape must close the list and not the dialog
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (key === 'Tab') {
      setOpen(false);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      typeAhead(key);
    }
  }

  // Space "clicks" a button when the key goes up; it was already handled when it went down
  function handleKeyUp(event) {
    if (event.key === ' ') event.preventDefault();
  }

  // The options grouped for display, each with its index in the flat list
  const groups = [];
  flat.forEach((option, index) => {
    const current = groups[groups.length - 1];
    if (current && current.name === option.group) current.items.push({ option, index });
    else groups.push({ name: option.group, items: [{ option, index }] });
  });

  return (
    <div className={`${styles.select} ${styles[variant]} ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        value={value}
        data-value={value}
        data-testid={testId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => setOpen(false)}
      >
        {icon}
        <span className={styles.value} lang={selected?.lang}>
          {selected?.label}
        </span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>

      {/* onMouseDown: a click in the list must not move the focus away from the button (that closes the list) */}
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        matchWidth
        className={styles.panel}
        onMouseDown={(event) => event.preventDefault()}
      >
        <LayoutGroup id={listId}>
          <ul id={listId} role="listbox" className={styles.list} aria-labelledby={triggerId}>
            {groups.map((group, groupIndex) => {
              const items = group.items.map(({ option, index }) => {
                const isSelected = index === selectedIndex;
                const isActive = index === active;
                return (
                  <li
                    key={String(option.value)}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    lang={option.lang}
                    className={`${styles.option} ${isActive ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
                    onPointerMove={() => !isActive && setActive(index)}
                    onClick={() => choose(index)}
                  >
                    {isActive && <motion.span layoutId="highlight" className={styles.highlight} transition={{ duration: 0.16, ease: EASE }} />}
                    <span className={styles.optionLabel}>{option.label}</span>
                    {isSelected && (
                      <motion.span
                        className={styles.check}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.18, ease: EASE }}
                      >
                        <Check size={16} aria-hidden="true" />
                      </motion.span>
                    )}
                  </li>
                );
              });
              if (!group.name) return items;
              const headingId = `${listId}-group-${groupIndex}`;
              return (
                <li key={`group-${groupIndex}`} role="presentation">
                  <div id={headingId} className={styles.groupLabel}>
                    {group.name}
                  </div>
                  <ul role="group" aria-labelledby={headingId} className={styles.groupList}>
                    {items}
                  </ul>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </Popover>
    </div>
  );
}

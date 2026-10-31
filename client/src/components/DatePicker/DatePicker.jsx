import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { formatMonth, todayInput } from '../../utils/vnDate.js';
import { formatLongDay, weekdayLabels } from '../../utils/reports.js';
import { addDays, addMonths, clampDay, isOutside, monthDays, weekdayIndex } from '../../utils/datePicker.js';
import Popover from '../Popover/Popover.jsx';
import styles from './DatePicker.module.css';

const EASE = [0.22, 0.61, 0.36, 1];

// The month grid slides left or right, the way the month changed
const slide = {
  enter: (direction) => ({ x: direction * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction * -28, opacity: 0 }),
};

// A date field drawn by Ledgerling instead of the browser's <input type="date">.
// The button shows the day in the user's language ("25 Oct 2026"); a click opens a month calendar under it.
// value / onChange use "YYYY-MM-DD" ('' = no date), like the input it replaces. min / max limit the days.
// clearable adds a "Clear" button for optional dates.
// Keyboard in the calendar: arrows move by a day or a week, Home / End go to the start / end of the week,
// Page Up / Page Down change the month, Enter picks, Escape closes.
export default function DatePicker({ id, value, onChange, min, max, clearable = false, placeholder, disabled = false, className = '' }) {
  const { t } = useTranslation();
  const ownId = useId();
  const triggerId = id ?? ownId;
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const focusDay = useRef(false); // true when the focused day must take the keyboard focus after the next render
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(''); // the month on screen, "YYYY-MM"
  const [focused, setFocused] = useState(''); // the day that holds the keyboard focus in the grid
  const [direction, setDirection] = useState(0);
  const today = todayInput();

  useEffect(() => {
    if (!open || !focusDay.current) return;
    focusDay.current = false;
    panelRef.current?.querySelector(`[data-month="${view}"] [data-day="${focused}"]`)?.focus();
  }, [open, view, focused]);

  function openCalendar() {
    const start = clampDay(value || today, min, max);
    setFocused(start);
    setView(start.slice(0, 7));
    setDirection(0);
    focusDay.current = true;
    setOpen(true);
  }

  function close({ returnFocus = false } = {}) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(day) {
    if (day !== value) onChange(day);
    close({ returnFocus: true });
  }

  function showMonth(month) {
    if (month === view) return;
    setDirection(month > view ? 1 : -1);
    setView(month);
  }

  // The arrow buttons change the month; the focus stays on the button
  function shiftMonth(delta) {
    const day = clampDay(addMonths(focused, delta), min, max);
    setFocused(day);
    showMonth(addMonths(`${view}-01`, delta).slice(0, 7));
  }

  function moveTo(day) {
    const next = clampDay(day, min, max);
    focusDay.current = true;
    setFocused(next);
    showMonth(next.slice(0, 7));
  }

  function handleGridKeyDown(event) {
    const moves = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekdayIndex(focused)),
      End: () => addDays(focused, 6 - weekdayIndex(focused)),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    moveTo(moves[event.key]());
  }

  function handlePanelKeyDown(event) {
    if (event.key !== 'Escape') return;
    // Inside a dialog, Escape must close the calendar and not the dialog
    event.preventDefault();
    event.stopPropagation();
    close({ returnFocus: true });
  }

  // Tab out of the calendar closes it (a click outside is handled by the Popover)
  function handlePanelBlur(event) {
    const next = event.relatedTarget;
    if (next && !panelRef.current?.contains(next) && next !== triggerRef.current) close();
  }

  const minMonth = min?.slice(0, 7);
  const maxMonth = max?.slice(0, 7);

  return (
    <div className={`${styles.picker} ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        value={value}
        data-value={value}
        disabled={disabled}
        onClick={() => (open ? close() : openCalendar())}
      >
        <CalendarDays size={18} className={styles.icon} aria-hidden="true" />
        <span className={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value) : (placeholder ?? t('datePicker.placeholder'))}
        </span>
      </button>

      {/* onMouseDown: a click on the calendar keeps the keyboard focus where it is */}
      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => close()}
        className={styles.panel}
        role="dialog"
        aria-label={t('datePicker.dialog')}
        onMouseDown={(event) => event.preventDefault()}
      >
        <div ref={panelRef} data-view={view} onKeyDown={handlePanelKeyDown} onBlur={handlePanelBlur}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('picker.previousMonth')}
              disabled={Boolean(minMonth && view <= minMonth)}
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className={styles.title} aria-live="polite">
              {view && formatMonth(view)}
            </span>
            <button
              type="button"
              className={styles.nav}
              aria-label={t('picker.nextMonth')}
              disabled={Boolean(maxMonth && view >= maxMonth)}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {weekdayLabels().map((weekday, index) => (
              <span key={index}>{weekday}</span>
            ))}
          </div>

          <div className={styles.viewport}>
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={view}
                data-month={view}
                className={styles.days}
                role="group"
                aria-label={view ? formatMonth(view) : undefined}
                onKeyDown={handleGridKeyDown}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: EASE }}
              >
                {view &&
                  monthDays(view).map((day) => {
                    const classes = [styles.day];
                    if (day.slice(0, 7) !== view) classes.push(styles.otherMonth);
                    if (day === today) classes.push(styles.today);
                    if (day === value) classes.push(styles.selected);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={classes.join(' ')}
                        data-day={day}
                        tabIndex={day === focused ? 0 : -1}
                        aria-label={formatLongDay(day)}
                        aria-pressed={day === value}
                        aria-current={day === today ? 'date' : undefined}
                        disabled={isOutside(day, min, max)}
                        onClick={() => choose(day)}
                      >
                        {Number(day.slice(8))}
                      </button>
                    );
                  })}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={styles.footer}>
            {clearable && value && (
              <button type="button" className={styles.link} onClick={() => choose('')}>
                {t('datePicker.clear')}
              </button>
            )}
            <button type="button" className={styles.link} disabled={isOutside(today, min, max)} onClick={() => choose(today)}>
              {t('datePicker.today')}
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}

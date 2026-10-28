import Icon from './icons.jsx';
import ui from './ui.module.css';
import styles from './LoginPreview.module.css';

// Static mock of the Login page. Register uses the same layout with an extra "Name" field.

const weekBars = [30, 62, 22, 44, 100, 54, 34]; // bar heights in % of the tallest day

export default function LoginPreview() {
  return (
    <div className={styles.frame}>
      <section className={styles.visual}>
        <div className={styles.brand}>
          <span className={styles.logo}>L</span>
          Ledgerling
        </div>

        <div className={styles.pitch}>
          <h3 className={styles.headline}>Know where your money goes.</h3>
          <p className={styles.lead}>Track income and expenses in a calm, simple way.</p>
        </div>

        <div className={styles.floating} aria-hidden="true">
          <div className={`${styles.floatCard} ${styles.floatSaved}`}>
            <span className={`${ui.tile} ${ui.toneIncome}`}>
              <Icon name="sprout" size={18} />
            </span>
            <div>
              <span className={styles.floatLabel}>Saved in October</span>
              <strong className={ui.income}>+7.900.000&nbsp;₫</strong>
            </div>
          </div>

          <div className={`${styles.floatCard} ${styles.floatWeek}`}>
            <span className={styles.floatLabel}>This week</span>
            <strong>1.855.000&nbsp;₫</strong>
            <div className={styles.miniBars}>
              {weekBars.map((height, index) => (
                <span key={index} className={height === 100 ? styles.miniPeak : ''} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.form}>
          <div>
            <h3 className={styles.title}>Welcome back</h3>
            <p className={styles.subtitle}>Log in to keep tracking your spending.</p>
          </div>

          <label className={ui.field}>
            <span className={ui.label}>Email</span>
            <span className={ui.inputWrap}>
              <Icon name="mail" size={18} />
              <input className={ui.input} type="email" defaultValue="minhanh@example.com" />
            </span>
          </label>

          <label className={ui.field}>
            <span className={ui.label}>Password</span>
            <span className={ui.inputWrap}>
              <Icon name="lock" size={18} />
              <input className={`${ui.input} ${ui.inputWithAction}`} type="password" defaultValue="secret123" />
              <button type="button" className={`${ui.iconBtn} ${ui.inputAction}`} aria-label="Show password">
                <Icon name="eye" size={18} />
              </button>
            </span>
          </label>

          <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnBlock}`}>
            Log in
          </button>

          <p className={styles.switch}>
            New to Ledgerling? <span className={styles.link}>Create an account</span>
          </p>
        </div>
      </section>
    </div>
  );
}

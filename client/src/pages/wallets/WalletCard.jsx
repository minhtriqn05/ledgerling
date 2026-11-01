import { useTranslation } from 'react-i18next';
import { formatNumber, formatSignedVnd, formatVnd } from '../../utils/format.js';
import { walletIcon } from '../../utils/wallets.js';
import IconButton from '../../components/IconButton/IconButton.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './WalletCard.module.css';

// One wallet, drawn like a real card: dark in both themes (data-tone), lit in the color of the wallet.
// The default wallet cannot be archived or deleted, so those buttons are not there. An archived wallet can only come back.
export default function WalletCard({ wallet, onEdit, onArchive, onRestore, onDelete }) {
  const { t } = useTranslation();
  const moneyIn = wallet.income + wallet.transfersIn;
  const moneyOut = wallet.expense + wallet.transfersOut;

  return (
    <article className={`${styles.card} ${wallet.archived ? styles.archived : ''}`} style={{ '--tone': wallet.color }} data-tone="noir" data-testid="wallet-card">
      <div className={styles.top}>
        <span className={styles.tile} aria-hidden="true">
          <Icon name={walletIcon(wallet.type)} size={20} />
        </span>
        <div className={styles.names}>
          <h2 className={styles.name}>{wallet.name}</h2>
          <span className={styles.type}>
            {t(`wallets.type.${wallet.type}`)}
            {wallet.isDefault && <b className={styles.badge}>{t('wallets.defaultBadge')}</b>}
          </span>
        </div>
        <div className={styles.actions}>
          <IconButton needsNetwork icon="edit" label={t('common.editName', { name: wallet.name })} onClick={() => onEdit(wallet)} />
          {!wallet.isDefault &&
            (wallet.archived ? (
              <IconButton needsNetwork icon="repeat" label={t('wallets.restoreName', { name: wallet.name })} onClick={() => onRestore(wallet)} />
            ) : (
              <IconButton needsNetwork icon="archive" label={t('wallets.archiveName', { name: wallet.name })} onClick={() => onArchive(wallet)} />
            ))}
          {!wallet.isDefault && (
            <IconButton needsNetwork icon="trash" danger label={t('common.deleteName', { name: wallet.name })} onClick={() => onDelete(wallet)} />
          )}
        </div>
      </div>

      <div className={styles.balance}>
        <span className="eyebrow">{t('common.balance')}</span>
        <strong data-testid="wallet-balance">
          {formatNumber(wallet.balance)}
          <small>&nbsp;₫</small>
        </strong>
        <span className={styles.started}>{t('wallets.startedWith', { amount: formatVnd(wallet.initialBalance) })}</span>
      </div>

      <div className={styles.flows}>
        <span>
          <em>{t('wallets.moneyIn')}</em>
          <b className={moneyIn > 0 ? styles.in : ''}>{moneyIn > 0 ? formatSignedVnd(moneyIn, 'income') : formatVnd(0)}</b>
        </span>
        <span>
          <em>{t('wallets.moneyOut')}</em>
          <b>{moneyOut > 0 ? formatSignedVnd(moneyOut, 'expense') : formatVnd(0)}</b>
        </span>
      </div>
    </article>
  );
}

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWallets } from '../../api/wallets.js';
import { useLoad } from '../../hooks/useLoad.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { formatVnd } from '../../utils/format.js';
import { activeWallets, totalBalance, walletIcon } from '../../utils/wallets.js';
import Button from '../../components/Button/Button.jsx';
import CollapsibleCard from '../../components/CollapsibleCard/CollapsibleCard.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import styles from './WalletsCard.module.css';

// "Your wallets" card: the money in all the wallets together, and how much each one holds.
// It loads its own data, so a failed request only affects this card.
export default function WalletsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: wallets, loading, error, reload, refresh } = useLoad(getWallets, []);
  useLiveRefresh(['wallets', 'transactions'], refresh);

  function renderBody() {
    if (loading) return <LoadingState skeleton="rows" count={2}>{t('wallets.loading')}</LoadingState>;
    if (error) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>{t('wallets.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      );
    }

    return (
      <>
        <p className={styles.total}>
          <span className="eyebrow">{t('wallets.totalAll')}</span>
          <strong data-testid="wallets-total">{formatVnd(totalBalance(wallets))}</strong>
        </p>
        <ul className={styles.list}>
          {activeWallets(wallets).map((wallet) => (
            <li key={wallet._id} className={styles.row} style={{ '--tone': wallet.color }}>
              <span className={styles.tile} aria-hidden="true">
                <Icon name={walletIcon(wallet.type)} size={16} />
              </span>
              <span className={styles.name}>{wallet.name}</span>
              <span className={styles.amount}>{formatVnd(wallet.balance)}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <CollapsibleCard
      id="dashboard.wallets"
      icon="wallet"
      tone="sky"
      title={t('wallets.yours')}
      actions={
        <Button variant="secondary" size="sm" onClick={() => navigate('/wallets')}>
          {t('common.viewAll')}
        </Button>
      }
    >
      {renderBody()}
    </CollapsibleCard>
  );
}

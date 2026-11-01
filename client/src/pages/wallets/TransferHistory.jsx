import { useTranslation } from 'react-i18next';
import { formatDate, formatVnd } from '../../utils/format.js';
import Button from '../../components/Button/Button.jsx';
import CollapsibleCard from '../../components/CollapsibleCard/CollapsibleCard.jsx';
import Icon from '../../components/Icon.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import Pager from '../transactions/Pager.jsx';
import styles from './TransferHistory.module.css';

// The transfers, newest first. state: what useLoad(getTransfers) gives. Its own states: loading, error, none yet, the rows.
// canTransfer: there are two wallets to move money between; without them the empty card says so.
export default function TransferHistory({ state, canTransfer, onPage, onDelete }) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = state;

  function renderBody() {
    if (loading) return <LoadingState skeleton="rows" count={2}>{t('wallets.transfer.loading')}</LoadingState>;
    if (error) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>{t('wallets.transfer.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      );
    }
    if (data.items.length === 0) {
      return <p className={styles.note}>{canTransfer ? t('wallets.transfer.empty') : t('wallets.transfer.needTwo')}</p>;
    }

    return (
      <>
        <ul className={styles.list}>
          {data.items.map((transfer) => (
            <li key={transfer._id} className={styles.row}>
              <span className={styles.route}>
                <span className={styles.wallet} style={{ '--tone': transfer.from.color }}>
                  <i aria-hidden="true" />
                  {transfer.from.name}
                </span>
                <Icon name="arrowRight" size={14} />
                <span className={styles.wallet} style={{ '--tone': transfer.to.color }}>
                  <i aria-hidden="true" />
                  {transfer.to.name}
                </span>
              </span>
              <span className={styles.meta}>
                {formatDate(transfer.date)}
                {transfer.note && ` · ${transfer.note}`}
              </span>
              <strong className={styles.amount}>{formatVnd(transfer.amount)}</strong>
              <IconButton
                needsNetwork
                icon="trash"
                danger
                label={t('wallets.transfer.deleteName', { from: transfer.from.name, to: transfer.to.name })}
                onClick={() => onDelete(transfer)}
              />
            </li>
          ))}
        </ul>
        {data.meta.totalPages > 1 && <Pager meta={data.meta} onPage={onPage} countKey="wallets.transfer.count" />}
      </>
    );
  }

  return (
    <CollapsibleCard id="wallets.transfers" icon="transfer" tone="teal" title={t('wallets.transfer.history')} subtitle={t('wallets.transfer.historySubtitle')}>
      <p className={styles.explain}>{t('wallets.transfer.notCounted')}</p>
      {renderBody()}
    </CollapsibleCard>
  );
}

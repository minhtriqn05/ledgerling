import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getTransfers, getWallets, updateWallet } from '../api/wallets.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import { useLoad } from '../hooks/useLoad.js';
import { formatNumber, formatPercent } from '../utils/format.js';
import { activeWallets, totalBalance } from '../utils/wallets.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Button from '../components/Button/Button.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Reveal from '../components/Motion/Reveal.jsx';
import WalletCard from './wallets/WalletCard.jsx';
import WalletFormDialog from './wallets/WalletFormDialog.jsx';
import DeleteWalletDialog from './wallets/DeleteWalletDialog.jsx';
import TransferDialog from './wallets/TransferDialog.jsx';
import DeleteTransferDialog from './wallets/DeleteTransferDialog.jsx';
import TransferHistory from './wallets/TransferHistory.jsx';
import styles from './WalletsPage.module.css';

const TRANSFERS_PER_PAGE = 10;

// The wallets as cards (every user has Cash), the wallets that are archived, and the history of the transfers.
// A transfer moves money between two wallets and is not income or expense. Plan: docs/plans/bonus-wallets.md.
export default function WalletsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const wallets = useLoad(getWallets, []);
  const [transferPage, setTransferPage] = useState(1);
  const transfers = useLoad(() => getTransfers({ page: transferPage, limit: TRANSFERS_PER_PAGE }), [transferPage]);
  // The open dialog: null, { form: wallet } (wallet = null for a new one), { transfer: true }, { deleteWallet: wallet } or { deleteTransfer: transfer }
  const [dialog, setDialog] = useState(null);

  // A transaction changes a balance, and another device may change anything: the numbers change in place
  function refreshAll() {
    wallets.refresh();
    transfers.refresh();
  }
  useLiveRefresh(['wallets', 'transactions'], refreshAll);

  const list = wallets.data ?? [];
  const active = activeWallets(list);
  const archived = list.filter((wallet) => wallet.archived);
  const ready = !wallets.loading && !wallets.error;
  const canTransfer = ready && active.length >= 2;

  function handleFormSaved() {
    toast.success(dialog.form ? t('wallets.updated') : t('wallets.added'));
    setDialog(null);
    refreshAll();
  }

  function handleTransferred() {
    toast.success(t('wallets.transfer.done'));
    setDialog(null);
    // The newest transfer is on the first page
    if (transferPage !== 1) setTransferPage(1);
    refreshAll();
  }

  function handleWalletDeleted() {
    toast.success(t('wallets.deleted'));
    setDialog(null);
    refreshAll();
  }

  function handleTransferDeleted() {
    toast.success(t('wallets.transfer.deleted'));
    setDialog(null);
    // The last row of a page: go back one page, which loads it
    if (transfers.data?.items.length === 1 && transferPage > 1) setTransferPage(transferPage - 1);
    refreshAll();
  }

  async function setArchived(wallet, value) {
    try {
      await updateWallet(wallet._id, { archived: value });
      toast.success(value ? t('wallets.archived') : t('wallets.restored'));
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // The total, and a thin bar with how it is split: one piece per wallet that holds money
  function renderTotal() {
    const total = totalBalance(list);
    const holding = list.filter((wallet) => wallet.balance > 0);
    const held = holding.reduce((sum, wallet) => sum + wallet.balance, 0);

    return (
      <section className={styles.total} aria-label={t('wallets.totalAll')}>
        <div className={styles.totalNumber}>
          <span className="eyebrow">{t('wallets.totalAll')}</span>
          <strong data-testid="wallets-total">
            {formatNumber(total)}
            <small>&nbsp;₫</small>
          </strong>
        </div>
        {holding.length > 0 && (
          <div className={styles.split}>
            <span className={styles.splitBar} aria-hidden="true">
              {holding.map((wallet) => (
                <i key={wallet._id} style={{ flexGrow: wallet.balance, background: wallet.color }} />
              ))}
            </span>
            <ul className={styles.splitLegend}>
              {holding.map((wallet) => (
                <li key={wallet._id}>
                  <i style={{ background: wallet.color }} aria-hidden="true" />
                  {wallet.name}
                  <b>{formatPercent(Math.round((wallet.balance / held) * 100))}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  function renderCards(items) {
    return (
      <ul className={styles.grid}>
        {items.map((wallet, index) => (
          <Reveal as="li" key={wallet._id} index={index}>
            <WalletCard
              wallet={wallet}
              onEdit={(w) => setDialog({ form: w })}
              onArchive={(w) => setArchived(w, true)}
              onRestore={(w) => setArchived(w, false)}
              onDelete={(w) => setDialog({ deleteWallet: w })}
            />
          </Reveal>
        ))}
      </ul>
    );
  }

  // The page shows one of three states: loading, error or the wallets. There is always at least the Cash wallet.
  function renderContent() {
    if (wallets.loading) return <LoadingState skeleton="cards">{t('wallets.loading')}</LoadingState>;
    if (wallets.error) return <ErrorState message={wallets.error} onRetry={wallets.reload} />;

    return (
      <>
        {renderCards(active)}

        <TransferHistory
          state={transfers}
          canTransfer={canTransfer}
          onPage={setTransferPage}
          onDelete={(transfer) => setDialog({ deleteTransfer: transfer })}
        />

        {archived.length > 0 && (
          <section className={styles.archived} aria-labelledby="wallets-archived">
            <div>
              <h2 id="wallets-archived" className={styles.archivedTitle}>
                {t('wallets.archivedTitle')}
              </h2>
              <p className={styles.archivedHint}>{t('wallets.archivedHint')}</p>
            </div>
            {renderCards(archived)}
          </section>
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        icon="wallet"
        title={t('nav.wallets')}
        subtitle={ready ? `${t('wallets.subtitle')} · ${t('wallets.count', { count: list.length })}` : t('wallets.subtitle')}
        stats={ready ? renderTotal() : null}
      >
        <Button
          needsNetwork
          variant="secondary"
          icon="transfer"
          disabled={!canTransfer}
          title={ready && !canTransfer ? t('wallets.transfer.needTwo') : undefined}
          onClick={() => setDialog({ transfer: true })}
        >
          {t('wallets.transfer.open')}
        </Button>
        <Button needsNetwork icon="plus" disabled={!ready} onClick={() => setDialog({ form: null })}>
          {t('wallets.new')}
        </Button>
      </PageHeader>

      {renderContent()}

      <AnimatePresence>
        {dialog && 'form' in dialog && (
          <WalletFormDialog key="form" wallet={dialog.form} onSaved={handleFormSaved} onClose={() => setDialog(null)} />
        )}
        {dialog?.transfer && (
          <TransferDialog key="transfer" wallets={active} onSaved={handleTransferred} onClose={() => setDialog(null)} />
        )}
        {dialog?.deleteWallet && (
          <DeleteWalletDialog key="delete-wallet" wallet={dialog.deleteWallet} onDeleted={handleWalletDeleted} onClose={() => setDialog(null)} />
        )}
        {dialog?.deleteTransfer && (
          <DeleteTransferDialog key="delete-transfer" transfer={dialog.deleteTransfer} onDeleted={handleTransferDeleted} onClose={() => setDialog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

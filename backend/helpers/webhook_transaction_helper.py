import time

import plaid
from plaid.model.transactions_sync_request import TransactionsSyncRequest


class WebhookTransactionsHelper:

    @staticmethod
    def handle_sync_updates_available(access_token, client, next_cursor, account_ids, db=None, user=None, Transaction=None):
        cursor = next_cursor

        added = []
        modified = []
        removed = []
        has_more = True

        try:
            while has_more:
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor=cursor,
                )
                response = client.transactions_sync(request).to_dict()
                cursor = response['next_cursor']

                if cursor == '':
                    time.sleep(2)
                    continue

                added.extend(response['added'])
                modified.extend(response['modified'])
                removed.extend(response['removed'])
                has_more = response['has_more']

            print(f"\n{'='*60}")
            print(f"SYNC RESULTS")
            print(f"   Added:    {len(added)}")
            print(f"   Modified: {len(modified)}")
            print(f"   Removed:  {len(removed)}")
            print(f"{'='*60}\n")

            for txn in added:
                account_name = account_ids.get(txn['account_id'], 'Unknown Account')
                amount = txn['amount']
                name = txn.get('merchant_name') or txn.get('name') or 'Unknown'
                date = txn['date']

                if amount < 0:
                    print(f"  +${-amount:.2f} deposited into {account_name} ({name}) on {date}")
                else:
                    print(f"  -${amount:.2f} spent from {account_name} ({name}) on {date}")

                if db and user and Transaction:
                    existing = Transaction.query.filter_by(
                        user_id=user.id,
                        amount=abs(amount),
                        day=date,
                        company=name,
                    ).first()
                    if not existing:
                        db.session.add(Transaction(
                            user_id=user.id,
                            amount=abs(amount),
                            day=date,
                            company=name,
                        ))

            if db:
                db.session.commit()

            print(f"\nSynced {len(added)} new transactions")

        except plaid.ApiException as e:
            print(f"Plaid API error during sync: {e}")

        return added, modified, removed, cursor

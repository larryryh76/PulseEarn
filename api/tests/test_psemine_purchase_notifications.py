"""Regression checks for authoritative PSEmine purchase notifications.

Purchase events are emitted by backend handlers only after their corresponding
server-side state writes. These checks protect the notification lifecycle from
being accidentally removed or moved ahead of the persisted transition.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import test_final_gates as tfg  # noqa: E402

SOURCE = tfg._read(tfg.INDEX_SRC)


def handler(name):
    return tfg._handler_body(SOURCE, name)


class TestPSEMinePurchaseNotifications(unittest.TestCase):
    def test_new_intent_notifies_only_after_purchase_record_is_written(self):
        body = handler("mine_create_purchase")
        write = body.index("db.collection('psemine_purchases').document(purchase_id).set(payload)")
        notice = body.index("notif_purchase_started_")
        self.assertGreater(notice, write)
        self.assertIn("type='purchase'", body[notice:notice + 900])
        self.assertIn("'status': 'awaiting_payment'", body[notice:notice + 900])
        self.assertIn("No payment is confirmed yet", body[notice:notice + 900])

    def test_uncertain_submission_warns_user_not_to_pay_again(self):
        body = handler("mine_mark_purchase_uncertain")
        write = body.index("'status': 'submission_uncertain'")
        notice = body.index("notif_purchase_uncertain_")
        self.assertGreater(notice, write)
        self.assertIn("Do not send another payment", body[notice:notice + 900])

    def test_returned_hash_notifies_verification_pending_not_activation(self):
        body = handler("mine_report_purchase_submission")
        write = body.index("'status': 'transaction_submitted'")
        notice = body.index("notif_purchase_submitted_")
        self.assertGreater(notice, write)
        self.assertIn("tool is not active yet", body[notice:notice + 900])

    def test_activation_notification_remains_after_verified_transaction_commit(self):
        body = handler("verify_psemine_tool_purchase")
        commit = body.index("commit_purchase_activation(transaction)")
        notice = body.index("notif_id=f\"notif_purchase_{purchase_id}\"")
        self.assertGreater(notice, commit)
        self.assertIn("Payment verified on BNB Smart Chain", body[notice:notice + 1200])


if __name__ == "__main__":
    unittest.main()

"""Regression checks for the PSEmine campaign receiving-wallet admin control.

These are source-contract tests: api/index.py imports Flask/Firebase at module
scope, so the tests deliberately verify the route contract without booting
production services or touching real funds.
"""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
API_SOURCE = (ROOT / "api" / "index.py").read_text(encoding="utf-8")
ADMIN_SOURCE = (ROOT / "src" / "pages" / "admin" / "AdminPSEMine.tsx").read_text(encoding="utf-8")


class TestPSEMineReceiverWalletAdmin(unittest.TestCase):
    def setUp(self):
        start = API_SOURCE.index("@app.route('/api/admin/mine/campaign/action'")
        self.route = API_SOURCE[start:]
        next_route = self.route.find("\n@app.route(", 1)
        if next_route >= 0:
            self.route = self.route[:next_route]

    def test_wallet_change_uses_super_admin_gated_campaign_action(self):
        self.assertIn("@verify_token\ndef admin_campaign_action()", self.route)
        self.assertIn("if not is_admin(uid)", self.route)
        self.assertIn("if action == 'set_receiver_wallet':", self.route)

    def test_wallet_address_is_validated_and_zero_address_rejected(self):
        wallet_action = self.route.split("if action == 'set_receiver_wallet':", 1)[1].split("if action == 'schedule':", 1)[0]
        self.assertIn("len(receiver_address) != 42", wallet_action)
        self.assertIn("receiver_address.startswith('0x')", wallet_action)
        self.assertIn("receiver_address.lower() == '0x' + ('0' * 40)", wallet_action)

    def test_wallet_change_updates_campaign_and_writes_audit_record(self):
        wallet_action = self.route.split("if action == 'set_receiver_wallet':", 1)[1].split("if action == 'schedule':", 1)[0]
        self.assertIn('"receiverWalletAddress": receiver_address', wallet_action)
        self.assertIn("PSEMINE_RECEIVER_WALLET_UPDATED", wallet_action)
        self.assertIn("previousReceiverWalletAddress", wallet_action)
        self.assertIn("newReceiverWalletAddress", wallet_action)
        self.assertIn('"existingQuotesPreserved": True', wallet_action)

    def test_all_quote_paths_fail_closed_without_the_single_admin_wallet(self):
        self.assertIn("def _configured_psemine_receiver_wallet(campaign):", API_SOURCE)
        self.assertIn("receiver_wallet = _configured_psemine_receiver_wallet(camp_data)", API_SOURCE)
        self.assertIn("receiver_wallet = _configured_psemine_receiver_wallet(_legacy_campaign)", API_SOURCE)
        self.assertGreaterEqual(API_SOURCE.count("RECEIVER_WALLET_NOT_CONFIGURED"), 2)
        self.assertIn("'destinationAddress': receiver_wallet", API_SOURCE)
        self.assertNotIn("PSEMINE_PAYMENT_ADDRESS", API_SOURCE)
        self.assertNotIn("0x8b32A461d3106B3356e9A389DfeB74aC084c8F33", API_SOURCE)
        self.assertIn("expected_destination = q_data.get('receiverWallet')", API_SOURCE)
        self.assertIn("legacy_destination = order.get('destinationAddress')", API_SOURCE)

    def test_bootstrap_campaign_never_invents_a_receiving_wallet(self):
        self.assertGreaterEqual(API_SOURCE.count("'receiverWalletAddress': ''"), 2)
        self.assertIn("def _is_valid_psemine_receiver_wallet(value):", API_SOURCE)
        self.assertIn("address.lower() != '0x' + ('0' * 40)", API_SOURCE)

    def test_legacy_quote_amount_matches_the_eight_decimal_ui_amount(self):
        self.assertIn("bnb_amount = round(gbp_price / bnb_gbp_price, 8)", API_SOURCE)
        self.assertIn("Decimal(str(bnb_amount)) * Decimal('1000000000000000000')", API_SOURCE)

    def test_admin_has_a_visible_config_section_with_explicit_confirmation(self):
        self.assertIn("{ id: 'settings', label: 'Configuration' }", ADMIN_SOURCE)
        self.assertIn("activeSection === 'settings'", ADMIN_SOURCE)
        self.assertIn("action: 'set_receiver_wallet'", ADMIN_SOURCE)
        self.assertIn("walletAcknowledged", ADMIN_SOURCE)
        self.assertIn("new quotes only", ADMIN_SOURCE)

    def test_wallet_change_is_not_misrepresented_as_user_payout_wallet(self):
        self.assertIn("not a user's personal payout wallet", ADMIN_SOURCE)
        self.assertIn("distinct from payout destinations", ADMIN_SOURCE)

    def test_admin_overview_reports_verified_tool_income_and_running_tools(self):
        overview_start = API_SOURCE.index("@app.route('/api/admin/psemine/overview'")
        overview_end = API_SOURCE.index("@app.route('/api/admin/psemine/orders'", overview_start)
        overview = API_SOURCE[overview_start:overview_end]
        self.assertIn("'status', '==', 'confirmed'", overview)
        self.assertIn("totalToolIncomeGbp", overview)
        self.assertIn("verificationSource", overview)
        self.assertIn("bsc_rpc_receipt", overview)
        self.assertIn("Total tool income", ADMIN_SOURCE)
        self.assertIn("Real on-chain confirmed tool payments only", ADMIN_SOURCE)
        self.assertIn("priceGbp", overview)
        self.assertIn("psemine_orders", overview)
        self.assertIn("income_complete", overview)
        self.assertIn("Never present a partial sum as lifetime income.", overview)
        self.assertIn("activeMiningSessions", overview)
        self.assertIn("activeToolOwnerships", overview)
        self.assertIn("label=\"Active mining sessions\"", ADMIN_SOURCE)
        self.assertIn("label=\"Total tool income\"", ADMIN_SOURCE)
        self.assertIn("overviewStat('totalToolIncomeGbp')", ADMIN_SOURCE)


if __name__ == "__main__":
    unittest.main()

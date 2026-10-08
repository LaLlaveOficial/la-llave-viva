import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('llave_changes', Path(__file__).parents[1] / 'deploy/google-ads-066/llave_changes.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ExecutorTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'GOOGLE_ADS_MCP_STORAGE_PATH': self.folder.name})
        self.env.start()
        self.change = {'action': 'campaign_status', 'campaignId': '7', 'value': 'PAUSED'}
        self.before = {'campaign': 'customers/3149885754/campaigns/7', 'name': 'La Llave', 'value': 'ENABLED'}
        self.after = {**self.before, 'value': 'PAUSED'}
    def tearDown(self):
        self.env.stop()
        self.folder.cleanup()
    def test_validation_never_changes_account(self):
        with patch.object(module, 'current', return_value=self.before), patch.object(module, 'mutate') as mutate:
            r = module.execute(self.change, None, '', 'validate')
            self.assertEqual(r['status'], 'validated')
            mutate.assert_called_once_with(self.change, self.before, True)
            self.assertEqual(list(Path(self.folder.name).iterdir()), [])
    def test_stale_snapshot_never_mutates(self):
        with patch.object(module, 'current', return_value=self.after), patch.object(module, 'mutate') as mutate:
            with self.assertRaisesRegex(ValueError, 'estado cambió'):
                module.execute(self.change, self.before, '9', 'execute')
            mutate.assert_not_called()
    def test_success_is_verified_and_retry_never_mutates_again(self):
        with patch.object(module, 'current', side_effect=[self.before, self.after, self.after]), patch.object(module, 'mutate') as mutate:
            self.assertEqual(module.execute(self.change, self.before, '9', 'execute')['status'], 'verified')
            self.assertEqual(module.execute(self.change, self.before, '9', 'execute')['status'], 'verified')
            mutate.assert_called_once_with(self.change, self.before, False)
    def test_lost_response_never_retries_uncertain_execution(self):
        with patch.object(module, 'current', return_value=self.before), patch.object(module, 'mutate', side_effect=RuntimeError('lost response')) as mutate:
            with self.assertRaisesRegex(ValueError, 'No se confirmó'):
                module.execute(self.change, self.before, '9', 'execute')
            self.assertEqual(module.execute(self.change, self.before, '9', 'execute')['status'], 'uncertain')
            self.assertEqual(mutate.call_count, 1)
    def test_cannot_reuse_approved_id_with_different_change(self):
        with patch.object(module, 'current', side_effect=[self.before,self.after,self.before]), patch.object(module, 'mutate'):
            module.execute(self.change, self.before, '9', 'execute')
            with self.assertRaisesRegex(ValueError, 'cambiar una propuesta'):
                module.execute({**self.change,'value':'ENABLED'}, self.before, '9', 'execute')
    def test_rejects_foreign_account_and_unknown_payload_fields(self):
        with self.assertRaises(ValueError):
            module.normalize({'action':'ad_status','campaignId':'7','value':'PAUSED','resource':'customers/123/adGroupAds/1~2'})
        with self.assertRaises(ValueError):
            module.normalize({**self.change,'operations':[{}]})

if __name__ == '__main__': unittest.main()

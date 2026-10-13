import base64
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('wan_worker', Path(__file__).parents[1] / 'deploy/studio066-wan/handler.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerContract(unittest.TestCase):
    def valid(self, **updates):
        return {'prompt': 'Two women run along a wet street.', 'image_base64': base64.b64encode(b'reference').decode(), **updates}

    def test_untrusted_parameters_rejected_before_gpu(self):
        for update in ({'image_url': 'http://localhost/secret'}, {'duration': 20}, {'seed': True},
                       {'orientation': '../../etc'}, {'image_base64': 'not base64!'}, {'prompt': ''}):
            with self.subTest(update=update), self.assertRaises(ValueError):
                worker.validate_input(self.valid(**update))

    def test_profiles_have_native_dimensions_and_frame_count(self):
        for orientation, size in (('portrait', '704*1280'), ('landscape', '1280*704')):
            for duration in (3, 5):
                params = worker.validate_input(self.valid(orientation=orientation, duration=duration))
                cmd = worker.build_command(params, Path('/tmp/input.png'), Path('/tmp/output.mp4'))
                self.assertEqual(cmd[cmd.index('--size') + 1], size)
                self.assertEqual(cmd[cmd.index('--frame_num') + 1], str(24 * duration + 1))

    def test_prompt_remains_one_argument(self):
        params = worker.validate_input(self.valid(prompt='$(touch /tmp/unsafe); `id`'))
        cmd = worker.build_command(params, Path('/tmp/input.png'), Path('/tmp/output.mp4'))
        self.assertEqual(cmd[cmd.index('--prompt') + 1], params['prompt'])

    def test_invalid_job_does_not_start_generation(self):
        self.assertIn('error', worker.handler({'input': {'image_url': 'https://example.com'}}))


if __name__ == '__main__':
    unittest.main()

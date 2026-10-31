"""Credential checks using generated values; Docker checks are opt-in."""

import importlib.util
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'opsx' / 'ci_database_env.py'
COMPOSE = ROOT / 'opsx' / 'docker-compose.yml'
spec = importlib.util.spec_from_file_location('ci_database_env', SCRIPT)
ci_env = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci_env)


class CiCredentialsTests(unittest.TestCase):
    def test_password_is_encoded_and_round_trips(self):
        password = secrets.token_hex(20) + ':@/#$%'
        url = urlsplit(ci_env.database_url(password, 'localhost'))
        self.assertTrue(unquote(url.password) == password)
        self.assertEqual(url.hostname, 'localhost')

    def test_missing_secret_fails_without_emitting_credentials(self):
        env = {**os.environ, 'CI_POSTGRES_PASSWORD': ''}
        result = subprocess.run([sys.executable, str(SCRIPT), '--check'], env=env,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('Falta el secreto CI_POSTGRES_PASSWORD', result.stdout)

    def test_multiline_secret_is_rejected(self):
        password = secrets.token_hex(20) + '\nextra'
        result = subprocess.run([sys.executable, str(SCRIPT), '--check'],
                                env={**os.environ, 'CI_POSTGRES_PASSWORD': password},
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertTrue(password not in result.stdout)

    def test_export_masks_all_representations_and_separates_hosts(self):
        password = secrets.token_hex(20) + ':@/#$%'
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / 'github-env'
            result = subprocess.run([sys.executable, str(SCRIPT)],
                                    env={**os.environ, 'CI_POSTGRES_PASSWORD': password,
                                         'GITHUB_ENV': str(target)},
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertTrue(all(line.startswith('::add-mask::')
                                for line in result.stdout.splitlines()))
            raw_values = dict(line.split('=', 1) for line in target.read_text().splitlines())
            values = {
                key: ci_env.workflow_unescape(value)
                for key, value in raw_values.items()
            }
            self.assertIn('%25', raw_values['POSTGRES_PASSWORD'])
            self.assertEqual(urlsplit(values['DATABASE_URL']).hostname, 'localhost')
            self.assertEqual(urlsplit(values['COMPOSE_DATABASE_URL']).hostname, 'postgres')
            self.assertTrue(values['POSTGRES_PASSWORD'] == password)
            for key in ('DATABASE_URL', 'COMPOSE_DATABASE_URL'):
                self.assertTrue(unquote(urlsplit(values[key]).password) == password)
                self.assertTrue('::add-mask::' + ci_env.workflow_escape(values[key])
                                in result.stdout)

    def test_workflow_requires_secret_before_starting_database(self):
        workflow = (ROOT / '.github/workflows/ci.yml').read_text()
        self.assertIn('needs: credentials-check', workflow)
        self.assertIn('POSTGRES_PASSWORD: ${{ secrets.CI_POSTGRES_PASSWORD }}', workflow)
        self.assertIn('config --quiet', workflow)
        self.assertNotIn('pull_request_target:', workflow)
        self.assertNotRegex(workflow, r'postgresql(?:\+psycopg)?://[^\s]+:[^\s]+@')

    def test_templates_are_empty_and_compose_has_no_password_fallback(self):
        compose = COMPOSE.read_text()
        self.assertIn('${POSTGRES_PASSWORD:?', compose)
        self.assertIn('${DATABASE_URL:?', compose)
        self.assertNotIn('${POSTGRES_PASSWORD:-', compose)
        for relative in ('.env.example', 'backend/.env.example'):
            values = dict(line.split('=', 1) for line in (ROOT / relative).read_text().splitlines()
                          if line and not line.startswith('#'))
            self.assertEqual(values['DATABASE_URL'], '')
            if 'POSTGRES_PASSWORD' in values:
                self.assertEqual(values['POSTGRES_PASSWORD'], '')


@unittest.skipUnless(os.environ.get('RUN_DOCKER_CREDENTIAL_TESTS') == '1',
                     'Set RUN_DOCKER_CREDENTIAL_TESTS=1 for Compose checks')
class ComposeCredentialsTests(unittest.TestCase):
    def config(self, password, database_url):
        env = {**os.environ, 'POSTGRES_PASSWORD': password, 'DATABASE_URL': database_url}
        return subprocess.run(['docker', 'compose', '--env-file', os.devnull,
                               '-f', str(COMPOSE), 'config', '--quiet'],
                              env=env, capture_output=True, text=True)

    def test_missing_and_empty_variables_fail(self):
        for key in ('POSTGRES_PASSWORD', 'DATABASE_URL'):
            for present in (False, True):
                env = {**os.environ, 'POSTGRES_PASSWORD': secrets.token_hex(20),
                       'DATABASE_URL': ci_env.database_url(secrets.token_hex(20), 'postgres')}
                if present:
                    env[key] = ''
                else:
                    env.pop(key, None)
                with patch.dict(os.environ, env, clear=True):
                    result = subprocess.run(['docker', 'compose', '--env-file', os.devnull,
                                             '-f', str(COMPOSE), 'config', '--quiet'],
                                            capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(key, result.stderr)

    def test_private_credentials_validate_without_output(self):
        password = secrets.token_hex(20)
        result = self.config(password, ci_env.database_url(password, 'postgres'))
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, '')
        self.assertTrue(password not in result.stderr)


if __name__ == '__main__':
    unittest.main()

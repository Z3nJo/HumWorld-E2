"""Opt-in rotation test on a uniquely named, disposable PostgreSQL volume."""

import os
from pathlib import Path
import secrets
import subprocess
import time
import unittest
import uuid
from urllib.parse import quote


@unittest.skipUnless(os.environ.get('RUN_POSTGRES_ROTATION_TEST') == '1',
                     'Set RUN_POSTGRES_ROTATION_TEST=1 for disposable PostgreSQL')
class PostgreSQLRotationTests(unittest.TestCase):
    def test_rotation_preserves_data_and_revokes_previous_password(self):
        name = 'humworld-credential-check-' + uuid.uuid4().hex
        volume = name + '-data'
        previous = secrets.token_hex(32)
        updated = secrets.token_hex(32) + ':@/#$%'
        database_host = ''

        def docker(*args, input_text=None, password=None):
            env = {**os.environ}
            if password is not None:
                env.update(POSTGRES_PASSWORD=password, PGPASSWORD=password)
            return subprocess.run(['docker', *args], input=input_text, env=env,
                                  capture_output=True, text=True)

        def query(sql, *, password=None, tcp=False):
            args = ['exec', '-i']
            if password is not None:
                args += ['-e', 'PGPASSWORD']
            args += [name, 'psql', '-w', '-U', 'humworld', '-d', 'humworld_test',
                     '-v', 'ON_ERROR_STOP=1', '-At']
            if tcp:
                args += ['-h', database_host]
            return docker(*args, input_text=sql, password=password)

        created_volume = False
        created_container = False
        try:
            result = docker('volume', 'create', '--label', 'humworld.test=credentials', volume)
            self.assertEqual(result.returncode, 0, 'Could not create isolated test volume')
            created_volume = True
            result = docker('run', '-d', '--name', name, '--label', 'humworld.test=credentials',
                            '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=humworld',
                            '-e', 'POSTGRES_DB=humworld_test',
                            '--mount', f'type=volume,source={volume},target=/var/lib/postgresql/data',
                            'postgres:16-alpine', password=previous)
            self.assertEqual(result.returncode, 0, 'Could not start isolated PostgreSQL')
            created_container = True
            address = docker('inspect', '--format',
                             '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', name)
            self.assertEqual(address.returncode, 0)
            database_host = address.stdout.strip()
            self.assertTrue(bool(database_host), 'Missing isolated container network address')
            for _ in range(60):
                if query('SELECT 1', password=previous, tcp=True).returncode == 0:
                    break
                time.sleep(0.5)
            else:
                self.fail('Isolated PostgreSQL did not become ready')
            self.assertEqual(query('CREATE TABLE credential_reference (id integer PRIMARY KEY); '
                                   'INSERT INTO credential_reference VALUES (1);').returncode, 0)
            # Generated input and the fixed suffix cannot contain SQL quoting characters.
            self.assertEqual(query(f"ALTER ROLE humworld PASSWORD '{updated}';").returncode, 0)
            self.assertEqual(docker('restart', name).returncode, 0)
            for _ in range(60):
                if query('SELECT 1', password=updated, tcp=True).returncode == 0:
                    break
                time.sleep(0.5)
            else:
                self.fail('Could not authenticate after rotation/restart')
            preserved = query('SELECT count(*) FROM credential_reference', password=updated, tcp=True)
            self.assertEqual(preserved.returncode, 0)
            self.assertEqual(preserved.stdout.strip(), '1')
            revoked = query('SELECT 1', password=previous, tcp=True)
            self.assertNotEqual(revoked.returncode, 0)
            self.assertIn('password authentication failed', revoked.stderr)
            if os.environ.get('RUN_INTEGRATED_CREDENTIAL_TESTS') == '1':
                self.assertEqual(query('DROP TABLE credential_reference').returncode, 0)
                root = Path(__file__).resolve().parents[2]
                connection = (f'postgresql://humworld:{quote(updated, safe="")}@'
                              f'{database_host}:5432/humworld_test')
                verification_env = {**os.environ, 'DATABASE_URL': connection}
                verification = subprocess.run(
                    ['docker', 'run', '--rm', '--network', f'container:{name}',
                     '-e', 'DATABASE_URL', '-e', 'CAPTURE_SCHEDULER_ENABLED=false',
                     '-e', 'PYTHONDONTWRITEBYTECODE=1',
                     '--mount', f'type=bind,source={root},target=/repo',
                     '-w', '/repo/backend', 'opsx-backend:latest', 'sh', '-c',
                     'alembic upgrade head && python /repo/opsx/sync_contracts.py --check '
                     '&& pytest -q -p no:cacheprovider'],
                    env=verification_env, capture_output=True, text=True)
                # Do not emit unfiltered process output, including failure tracebacks.
                sanitized = (verification.stdout + verification.stderr).replace(connection, '[REDACTED_URL]')
                sanitized = sanitized.replace(quote(updated, safe=''), '[REDACTED]')
                sanitized = sanitized.replace(updated, '[REDACTED]')
                print(sanitized, flush=True)
                self.assertEqual(verification.returncode, 0,
                                 'Backend/contract checks failed in isolated database')
        finally:
            # Names are generated here, never supplied by a user or environment variable.
            if created_container:
                docker('rm', '-f', name)
            if created_volume:
                docker('volume', 'rm', volume)


if __name__ == '__main__':
    unittest.main()

"""Check backup streaming without rotating or stopping the real database."""

import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    'rotate_database', Path(__file__).resolve().parents[1] / 'rotate_local_database.py')
rotation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rotation)


class PrivateBackupTests(unittest.TestCase):
    def test_streams_binary_archive_and_validates_from_stdin(self):
        archive = b'PGDMP\x00\xff\r\n'
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'backup.dump'

            def execute(command, **kwargs):
                if 'pg_dump' in command:
                    self.assertNotIn('-f', command)
                    kwargs['stdout'].write(archive)
                else:
                    self.assertIn('pg_restore', command)
                    self.assertEqual(kwargs['stdin'].read(), archive)
                    self.assertIs(kwargs['stdout'], subprocess.DEVNULL)
                return subprocess.CompletedProcess(command, 0)

            with patch.object(rotation.subprocess, 'run', side_effect=execute) as runner:
                rotation.create_private_backup('test_user', 'test_database', target)
            self.assertEqual(runner.call_count, 2)
            self.assertEqual(target.read_bytes(), archive)
            if os.name != 'nt':
                self.assertEqual(target.stat().st_mode & 0o777, 0o600)

    def test_existing_file_or_symlink_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'backup.dump'
            target.write_bytes(b'preserve')
            with patch.object(rotation.subprocess, 'run') as runner:
                with self.assertRaises(FileExistsError):
                    rotation.create_private_backup('test_user', 'test_database', target)
            runner.assert_not_called()
            self.assertEqual(target.read_bytes(), b'preserve')

    def test_dump_failure_prevents_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(rotation.subprocess, 'run',
                              return_value=subprocess.CompletedProcess([], 1)) as runner:
                with self.assertRaisesRegex(RuntimeError, 'Database backup failed'):
                    rotation.create_private_backup('test_user', 'test_database',
                                                   Path(directory) / 'backup.dump')
            self.assertEqual(runner.call_count, 1)

    def test_invalid_archive_stops_rotation(self):
        with tempfile.TemporaryDirectory() as directory:
            def execute(command, **kwargs):
                if 'pg_dump' in command:
                    kwargs['stdout'].write(b'invalid')
                    return subprocess.CompletedProcess(command, 0)
                return subprocess.CompletedProcess(command, 1)

            with patch.object(rotation.subprocess, 'run', side_effect=execute):
                with self.assertRaisesRegex(RuntimeError, 'Backup validation failed'):
                    rotation.create_private_backup('test_user', 'test_database',
                                                   Path(directory) / 'backup.dump')


if __name__ == '__main__':
    unittest.main()

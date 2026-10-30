"""Rotate the local Compose database after explicit operator confirmation.

Creates an ignored backup and .env, never prints credentials or database records.
Requires the existing humworld-postgres and humworld-backend containers.
"""

import argparse
from datetime import UTC, datetime
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
from urllib.parse import quote, unquote, urlsplit
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
COUNTS = ('SELECT (SELECT count(*) FROM noticia), (SELECT count(*) FROM termino), '
          '(SELECT count(*) FROM configuracion), (SELECT count(*) FROM noticia_pais);')


def run(args, *, env=None, input_text=None, label='Docker command'):
    result = subprocess.run(args, env=env, input=input_text, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'{label} failed; credentials and raw output withheld.')
    return result.stdout


def container_info(name):
    return json.loads(run(['docker', 'inspect', name], label='Read container configuration'))[0]


def environment(info):
    return dict(item.split('=', 1) for item in info['Config']['Env'] if '=' in item)


def create_private_backup(user, database, backup):
    """Stream the archive into an exclusively created private local file."""
    descriptor = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'wb') as stream:
        dumped = subprocess.run(
            ['docker', 'exec', 'humworld-postgres', 'pg_dump', '-U', user,
             '-d', database, '-Fc'], stdout=stream, stderr=subprocess.PIPE)
    if dumped.returncode or backup.stat().st_size == 0:
        raise RuntimeError('Database backup failed; backend remains paused.')
    with backup.open('rb') as stream:
        validated = subprocess.run(
            ['docker', 'exec', '-i', 'humworld-postgres', 'pg_restore', '--list'],
            stdin=stream, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if validated.returncode:
        raise RuntimeError('Backup validation failed; backend remains paused.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirm', action='store_true')
    args = parser.parse_args()
    if not args.confirm:
        parser.error('Explicit --confirm is required; read the rotation guide first.')
    target = ROOT / '.env'
    if target.exists():
        raise RuntimeError('Existing .env detected; use the documented interactive rotation to preserve it.')
    db_info = container_info('humworld-postgres')
    backend_info = container_info('humworld-backend')
    db_env, backend_env = environment(db_info), environment(backend_info)
    user, database = db_env['POSTGRES_USER'], db_env['POSTGRES_DB']
    old_url = urlsplit(backend_env['DATABASE_URL'])
    old_password = unquote(old_url.password or '')
    if not old_password:
        raise RuntimeError('Cannot verify revocation without the previous application credential.')
    if user != old_url.username or database != old_url.path.lstrip('/'):
        raise RuntimeError('Database and backend identifiers differ; use interactive rotation.')
    if any(character in user + database for character in '\r\n\''):
        raise RuntimeError('Identifiers require manual dotenv quoting.')
    new_password = secrets.token_hex(32)
    scheduler = backend_env.get('CAPTURE_SCHEDULER_ENABLED', 'true')
    stamp = datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')
    backup = ROOT / f'.env.rotation-backup-{stamp}.dump'
    compose = ['docker', 'compose', '--env-file', str(target), '-f',
               str(ROOT / 'opsx/docker-compose.yml')]

    def query(sql, *, password=None, host=None):
        command = ['docker', 'exec', '-i']
        private_env = dict(os.environ)
        if password is not None:
            private_env['PGPASSWORD'] = password
            command += ['-e', 'PGPASSWORD']
        command += ['humworld-postgres', 'psql', '-w', '-U', user, '-d', database,
                    '-v', 'ON_ERROR_STOP=1', '-At']
        if host:
            command += ['-h', host]
        return subprocess.run(command, env=private_env, input=sql,
                              capture_output=True, text=True)

    run(['docker', 'stop', 'humworld-backend'], label='Pause backend')
    before = query(COUNTS)
    if before.returncode:
        raise RuntimeError('Cannot record reference counts; backend remains paused.')
    create_private_backup(user, database, backup)
    connection = (f'postgresql://{quote(user, safe="")}:{new_password}@postgres:5432/'
                  f'{quote(database, safe="")}')
    # Save new credentials before changing the role, so recovery remains possible.
    with target.open('x', encoding='utf-8') as stream:
        stream.write(f"POSTGRES_USER='{user}'\nPOSTGRES_DB='{database}'\n")
        stream.write(f"POSTGRES_PASSWORD='{new_password}'\nDATABASE_URL='{connection}'\n")
        stream.write(f'CAPTURE_SCHEDULER_ENABLED={scheduler}\n')
    role = '"' + user.replace('"', '""') + '"'
    rotated = query('SET log_statement = none; SET log_min_error_statement = panic; '
                    f"ALTER ROLE {role} PASSWORD '{new_password}';")
    if rotated.returncode:
        raise RuntimeError('Role rotation failed; backup and private .env retained, backend paused.')
    paused_env = {**os.environ, 'CAPTURE_SCHEDULER_ENABLED': 'false'}
    # Prevent inherited shell settings from overriding the new private credentials.
    for key in ('POSTGRES_PASSWORD', 'DATABASE_URL', 'POSTGRES_USER', 'POSTGRES_DB'):
        paused_env.pop(key, None)
    run([*compose, 'config', '--quiet'], env=paused_env, label='Validate private Compose')
    run([*compose, 'up', '-d', '--build', '--force-recreate'], env=paused_env,
        label='Recreate integrated services')
    for _ in range(90):
        try:
            with urlopen('http://localhost:3000/api/v1/config', timeout=2) as response:
                if response.status == 200:
                    break
        except OSError:
            pass
        time.sleep(1)
    else:
        raise RuntimeError('Backend readiness failed; private .env and backup retained.')
    accepted = query('SELECT 1;', password=new_password, host='postgres')
    rejected = query('SELECT 1;', password=old_password, host='postgres')
    if accepted.returncode or rejected.returncode == 0 or 'password authentication failed' not in rejected.stderr:
        raise RuntimeError('Network authentication/revocation check failed; scheduler remains paused.')
    after = query(COUNTS)
    if after.returncode or before.stdout != after.stdout:
        raise RuntimeError('Reference counts differ; scheduler remains paused for investigation.')
    today = datetime.now(UTC).date().isoformat()
    for path in ('http://localhost:5173/', 'http://localhost:3000/api/openapi.json',
                 f'http://localhost:3000/api/v1/dashboards?fecha_desde={today}&fecha_hasta={today}'):
        with urlopen(path, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError('Integrated HTTP smoke check failed.')
    resumed_env = dict(paused_env)
    resumed_env['CAPTURE_SCHEDULER_ENABLED'] = scheduler
    run([*compose, 'up', '-d', '--force-recreate', '--no-deps', 'backend'],
        env=resumed_env, label='Restore scheduler setting')
    print('Rotation completed: new credential accepted, previous credential rejected.')
    print('Reference counts preserved for noticia, termino, configuracion and noticia_pais.')
    print('Frontend, configuration, dashboard and OpenAPI HTTP checks passed.')
    print(f'Private environment: {target.name}; ignored backup: {backup.name}')
    print(f'Scheduler setting restored: {scheduler}')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Runtime errors above contain only fixed, credential-free diagnostics.
        if isinstance(error, RuntimeError):
            print(str(error))
        else:
            print('Rotation interrupted; inspect service state privately. No credentials printed.')
        raise SystemExit(1) from None

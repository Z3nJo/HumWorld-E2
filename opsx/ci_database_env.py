"""Prepare masked PostgreSQL URLs for GitHub Actions without stored passwords."""

import argparse
import os
from pathlib import Path
from urllib.parse import quote


def database_url(password: str, host: str) -> str:
    return f"postgresql://humworld:{quote(password, safe='')}@{host}:5432/humworld_test"


def workflow_escape(value: str) -> str:
    return value.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def workflow_unescape(value: str) -> str:
    """Inverse of GitHub Actions environment-file decoding."""
    return value.replace('%0D', '\r').replace('%0A', '\n').replace('%25', '%')


def write_github_env(stream, key: str, value: str) -> None:
    stream.write(f'{key}={workflow_escape(value)}\n')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    password = os.environ.get('CI_POSTGRES_PASSWORD', '')
    if not password:
        print('::error::Falta el secreto CI_POSTGRES_PASSWORD; configura GitHub Actions Secrets.')
        return 1
    if '\n' in password or '\r' in password:
        print('::error::CI_POSTGRES_PASSWORD debe contener una sola linea.')
        return 1
    if args.check:
        print('Secreto de PostgreSQL disponible.')
        return 0
    env_path = os.environ.get('GITHUB_ENV')
    if not env_path:
        print('::error::Falta GITHUB_ENV; este comando requiere el entorno de GitHub Actions.')
        return 1
    runner_url = database_url(password, 'localhost')
    compose_url = database_url(password, 'postgres')
    for value in (password, quote(password, safe=''), runner_url, compose_url):
        print(f'::add-mask::{workflow_escape(value)}', flush=True)
    with Path(env_path).open('a', encoding='utf-8') as stream:
        write_github_env(stream, 'DATABASE_URL', runner_url)
        write_github_env(stream, 'COMPOSE_DATABASE_URL', compose_url)
        write_github_env(stream, 'POSTGRES_PASSWORD', password)
        write_github_env(stream, 'POSTGRES_USER', 'humworld')
        write_github_env(stream, 'POSTGRES_DB', 'humworld_test')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

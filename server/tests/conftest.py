import contextlib
import shutil
import socket
import subprocess
from collections.abc import Iterator
from pathlib import Path

import pytest


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def postgres_bin(name: str) -> str | None:
    direct = shutil.which(name)
    if direct:
        return direct

    pg_config = shutil.which("pg_config")
    if not pg_config:
        return None

    result = subprocess.run(
        [pg_config, "--bindir"],
        check=True,
        capture_output=True,
        text=True,
    )
    candidate = Path(result.stdout.strip()) / name
    return str(candidate) if candidate.exists() else None


@pytest.fixture(scope="session")
def disposable_postgres_url(tmp_path_factory: pytest.TempPathFactory) -> Iterator[str]:
    initdb = postgres_bin("initdb")
    pg_ctl = postgres_bin("pg_ctl")
    if not initdb or not pg_ctl:
        pytest.skip("PostgreSQL server binaries are not available")

    data_dir = tmp_path_factory.mktemp("postgres-data")
    log_path = tmp_path_factory.mktemp("postgres-log") / "postgres.log"
    port = find_free_port()

    subprocess.run(
        [initdb, "-D", str(data_dir), "-A", "trust", "-U", "pfm_test"],
        check=True,
        capture_output=True,
        text=True,
    )

    subprocess.run(
        [
            pg_ctl,
            "-D",
            str(data_dir),
            "-l",
            str(log_path),
            "-o",
            f"-F -h 127.0.0.1 -p {port}",
            "-w",
            "start",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    try:
        yield f"postgresql+asyncpg://pfm_test@127.0.0.1:{port}/postgres"
    finally:
        with contextlib.suppress(subprocess.CalledProcessError):
            subprocess.run(
                [pg_ctl, "-D", str(data_dir), "-m", "fast", "-w", "stop"],
                check=True,
                capture_output=True,
                text=True,
            )

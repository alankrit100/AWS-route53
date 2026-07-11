#!/usr/bin/env bash
set -e

# Install Rust (needed to build pydantic-core on some platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
export PATH="$HOME/.cargo/bin:$PATH"

# Install Python dependencies
pip install -r requirements.txt

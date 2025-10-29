#!/usr/bin/env bash

set -e

IP=$(hostname -I | awk '{print $1}')
DEV_URL="http://$IP:5173"

echo "🟡 Iniciando frontend em modo de desenvolvimento"
pnpm run dev -- --host 0.0.0.0 &

echo "🟡 Compilando backend para Windows"
cd src-tauri
cargo xwin build --target x86_64-pc-windows-msvc
cd ..

EXE_DIR="$(pwd)/src-tauri/target/x86_64-pc-windows-msvc/debug"
EXE_FILE=$(find "$EXE_DIR" -maxdepth 1 -type f -name "*.exe" | head -n 1)

if [ -z "$EXE_FILE" ]; then
  echo "🔴 Erro: Nenhum executável encontrado em $EXE_DIR"
  exit 1
fi

EXE_PATH_WIN="$(wslpath -w "$EXE_FILE")"

echo "🟡 Iniciando aplicação no Windows em modo de desenvolvimento"
# powershell.exe -Command "set TAURI_DEV_SERVER_URL=$DEV_URL; Start-Process '$EXE_PATH_WIN'"
powershell.exe -Command "& { \$env:TAURI_DEV_SERVER_URL='$DEV_URL'; Start-Process -FilePath '$EXE_PATH_WIN' }"


echo "🟢 Aplicação executando em modo desenvolvimento no Windows"

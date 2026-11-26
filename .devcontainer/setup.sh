#!/usr/bin/env bash
# Prepares a GitHub Codespace (or any fresh machine) to run Double Zero:
# installs packages, writes .env with a random admin password, creates and seeds the database.
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci
npx prisma generate

if [ ! -f .env ]; then
  password="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 16)"
  if [ -n "${CODESPACE_NAME:-}" ]; then
    site="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  else
    site="http://localhost:3000"
  fi
  cat > .env <<ENV
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="${site}"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
ADMIN_EMAIL="owner@doublezero.local"
ADMIN_PASSWORD="${password}"
ENV
  cat > CODESPACE-LOGIN.txt <<TXT
Double Zero — test site
=======================

Website:    ${site}
Dashboard:  ${site}/admin

Dashboard login
  Email:    owner@doublezero.local
  Password: ${password}

This is a private test copy with its own database. Payments are demo-only.
The site starts automatically; if not, run:  npm run dev
TXT
fi

npx prisma db push --skip-generate
npm run db:seed
echo
cat CODESPACE-LOGIN.txt

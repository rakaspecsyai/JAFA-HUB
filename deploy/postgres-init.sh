#!/bin/sh
set -eu
: "${POSTGRES_APP_PASSWORD:?Tetapkan password aplikasi}"

psql --no-psqlrc --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password POSTGRES_APP_PASSWORD
CREATE ROLE jafa LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
ALTER DATABASE jafa OWNER TO jafa;
ALTER SCHEMA public OWNER TO jafa;
REVOKE ALL ON DATABASE jafa FROM PUBLIC;
SQL

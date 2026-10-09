#!/usr/bin/env sh
# Перенос данных раздела «Техника» из БД Cement CRM в БД Perevozki.
#
# Cement CRM только читается (pg_dump --data-only четырёх таблиц техники).
# Таблицы в Perevozki называются так же, поэтому маппинг не нужен.
# Импорт выполняется одной транзакцией и отказывается работать, если в Perevozki
# уже есть машины, ходки или расходы. Стандартные категории из init-миграции
# заменяются категориями из Cement (вместе с их id).
#
# Запуск из корня Perevozki, когда `docker compose up -d db` уже поднят и миграции применены:
#   SOURCE_DB_CONTAINER=cement-crm-db-1 SOURCE_DB_USER=cement SOURCE_DB_NAME=cement \
#     sh scripts/import-from-cement.sh
set -eu

: "${SOURCE_DB_CONTAINER:?укажите контейнер Postgres Cement CRM (docker ps)}"
SOURCE_DB_USER="${SOURCE_DB_USER:-cement}"
SOURCE_DB_NAME="${SOURCE_DB_NAME:-cement}"
TARGET_SERVICE="${TARGET_SERVICE:-db}"

mkdir -p backups
dump="backups/cement-equipment-$(date +%Y%m%d-%H%M%S).sql"

echo "1/3 Экспорт из ${SOURCE_DB_CONTAINER} (только чтение) → ${dump}"
docker exec "$SOURCE_DB_CONTAINER" pg_dump -U "$SOURCE_DB_USER" -d "$SOURCE_DB_NAME" \
  --data-only --no-owner --no-privileges \
  --table='"EquipmentVehicle"' --table='"EquipmentExpenseCategory"' \
  --table='"EquipmentTrip"' --table='"EquipmentExpense"' > "$dump"

echo "2/3 Импорт в Perevozki (сервис ${TARGET_SERVICE}) одной транзакцией"
{
  cat <<'SQL'
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "EquipmentVehicle") OR EXISTS (SELECT 1 FROM "EquipmentTrip") OR EXISTS (SELECT 1 FROM "EquipmentExpense") THEN
    RAISE EXCEPTION 'В Perevozki уже есть данные техники — импорт отменён';
  END IF;
END $$;
DELETE FROM "EquipmentExpenseCategory";
SQL
  cat "$dump"
  # pg_dump очищает search_path — возвращаем его для служебных запросов ниже.
  cat <<'SQL'
SET search_path TO public;
SELECT setval(pg_get_serial_sequence('"EquipmentVehicle"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "EquipmentVehicle";
SELECT setval(pg_get_serial_sequence('"EquipmentExpenseCategory"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "EquipmentExpenseCategory";
SELECT setval(pg_get_serial_sequence('"EquipmentTrip"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "EquipmentTrip";
SELECT setval(pg_get_serial_sequence('"EquipmentExpense"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "EquipmentExpense";
COMMIT;
SQL
} | docker compose exec -T "$TARGET_SERVICE" sh -c 'psql -q -o /dev/null -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "3/3 Проверка количества записей в Perevozki"
docker compose exec -T "$TARGET_SERVICE" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT (SELECT count(*) FROM \"EquipmentVehicle\") AS vehicles,
       (SELECT count(*) FROM \"EquipmentTrip\") AS trips,
       (SELECT count(*) FROM \"EquipmentExpenseCategory\") AS categories,
       (SELECT count(*) FROM \"EquipmentExpense\") AS expenses;"'
echo "Готово. Дамп сохранён в ${dump} (в git не попадает)."

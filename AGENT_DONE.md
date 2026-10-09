# Perevozki — выполнено

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Текущее состояние проекта

Bootstrap: создан отдельный репозиторий, система записок для агентов и анализ источника
(раздел «Техника» Cement CRM). Кода приложения ещё нет — перенос начинается следующим этапом.

## Уже реализовано

- [x] Репозиторий `Serega000777/perevozki` склонирован в `C:\AI\projects\Perevozki`, remote — только он
- [x] `.gitignore` (секреты, `.env*`, дампы), `.gitattributes` (LF), `.env.example`
- [x] `AGENTS.md` (протокол handoff), `CLAUDE.md`, `AGENT_DONE.md`, `AGENT_TODO.md`, `README.md`
- [x] Анализ источника: [`docs/cement-source-analysis.md`](docs/cement-source-analysis.md)

## Перенесено из Cement CRM

Пока ничего — только анализ.

### Результаты исследования (факты)

- Источник: GitHub `Serega000777/cement`, ветка `agent/mvp-foundation`, коммит `1f1779a`
  (2026-09-14). `main` там содержит только init-коммит.
- Локальная `C:\AI\projects\crm-cement` отстаёт от GitHub на 4 коммита (HEAD `9e0ae40`).
- «Машины» в Cement CRM = раздел **«Техника»**: таблицы `EquipmentVehicle`, `EquipmentTrip`,
  `EquipmentExpenseCategory`, `EquipmentExpense`; 15 эндпоинтов `/api/equipment/*`; экран
  `Equipment.tsx` с вкладками Авто / Ходки / Расходы / Аналитика.
- FK на цементные таблицы нет. Общие зависимости: `auth.ts` (initData), часть `validation.ts`,
  `api.ts`, error handler, `User`, бот, стили.
- Фото, документов, водителей, ТО, напоминаний, поиска в источнике нет (проверено grep).

## Созданные/изменённые файлы

- `.gitignore`, `.gitattributes`, `.env.example`, `README.md`
- `AGENTS.md`, `CLAUDE.md`, `AGENT_DONE.md`, `AGENT_TODO.md`
- `docs/cement-source-analysis.md`

## База данных

Ещё не создана.

## Что проверено

- [x] `git rev-parse --show-toplevel` → `C:/AI/projects/Perevozki`
- [x] `git remote -v` → только `https://github.com/Serega000777/perevozki.git`
- [x] Удалённый репозиторий был пустым (`gh repo view` → `isEmpty: true`), публичный

## Git

Последний рабочий commit: см. `git log` (bootstrap + docs)

Текущая ветка: `main`

## Известные проблемы

- На машине владельца в корне диска есть посторонний пустой репозиторий `C:\.git`
  (без коммитов, `worktree = C:/`). Пока у Perevozki есть свой `.git`, он не мешает.
  Не трогали — решение за владельцем.

## Важные архитектурные решения

- Perevozki — отдельный репозиторий без каких-либо ссылок на код Cement CRM.
- Сначала перенос 1:1 (M1), потом чистка (M2), улучшения (M3), VPS (M4).

## Что НЕ трогать

- Cement CRM (`C:\AI\projects\crm-cement`, GitHub `Serega000777/cement`, его VPS и БД) — read-only.
- `C:\.git` и другие проекты в `C:\AI\projects\`.

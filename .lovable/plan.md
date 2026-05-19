# Admin Backend Wiring & Consolidation Plan

This is a large, multi-area effort. Executing in 6 focused phases with zero deletion of active features.

## Phase 1 — Marketing & Automations Backend
- **Migration**: create `automation_settings` table (singleton) with `abandoned_cart_delay_hours` (default 2), `abandoned_cart_enabled`.
- **Migration**: function `process_abandoned_carts()` — scans `cart_items` older than configured delay, not converted to orders. For each user: insert `crm_deals` row with `source_type='shop_abandoned_cart'`, `title='נטישת עגלה'`, attempt email enqueue via `enqueue_email` (if email infra exists), mark cart row as `abandoned_notified_at`.
- **Migration**: function `process_pending_newsletter_campaigns()` — iterates `newsletter_campaigns` status='scheduled' where send_at<=now(), enqueues per-recipient sends, marks status='sent'.
- **Migration**: pg_cron schedules (every 15 min for carts, every 5 min for newsletters).
- **UI**: New tab inside `AutomationsManager` (or new card) — "הגדרות נטישת עגלה" form (delay hours + enabled switch) backed by `automation_settings`.

## Phase 2 — CRM Kanban Channels
- Edit `DealsKanban.tsx`:
  - Remove `marketplace_bump_request` and `marketplace_upgrade` source badges + filter chips.
  - Add badges/filters: `custom_beat_request` → "בקשת מקצב בהתאמה אישית", `cpi_encoding_error` → "שגיאת קידוד CPI".
- **Migration**: trigger on `shop_orders` after update — if `status='paid'` and `cpi_status='error'`, insert deal with `source_type='cpi_encoding_error'`.
- **Migration**: ALTER `admin_tasks` ADD `related_deal_id uuid`, `related_order_id uuid`, `related_pro_id uuid` (nullable, no FK strictness to avoid breakage).
- **UI**: `TaskEditDialog` — add 3 optional selectors (deal / order / pro) populated from light queries.

## Phase 3 — Inventory & Logistics
- **Migration**: RPC `process_received_purchase_order(p_order_id uuid)` — loops `supplier_order_items`, `UPDATE shop_products SET stock = stock + qty WHERE id = product_id`. Trigger on `supplier_orders` AFTER UPDATE when `status` transitions to 'received' → calls RPC.
- **Migration**: extend existing refund function — for each `order_items` row of physical product, `stock = stock + qty`.

## Phase 4 — SSoT Consolidation
- `MusicProsManager.tsx`: replace any `subscription_tier` text read/write with `global_subscription_tier_id` joined to `subscription_tiers`.
- `NewsletterManager.tsx`: segment filters query against `subscription_tiers` via the FK, not legacy text.
- Embed `RolesPermissionsManager` as a tab inside `UsersManager` (keep `/admin/crm/roles` route as redirect / preserved alias — no deletion).
- `admin.customers.$customerId.tsx`: add manual points panel (+/- with reason) → inserts into existing economy ledger table (will inspect actual table name) with `reason` + `admin_id`.

## Phase 5 — Global Audit Log + Storage Explorer
- **Migration**: `system_audit_logs (id, user_id, user_type, action, entity, entity_id, details jsonb, created_at)`. RLS: only admins SELECT.
- **UI**: new admin route `/admin/audit-log` with filterable read-only table; sidebar link under Dashboard pillar.
- **UI**: `/admin/commerce/storage-explorer` — server fn listing objects per bucket (audio, shorts, cpis) with size; "find orphans" compares against referenced URLs in `shorts`, `cpi_files`, `academy_lessons`, etc.; safe delete with confirm.

## Phase 6 — UI Cohesion
- `UsersManager.tsx` + `MusicProsManager.tsx`: strip `bg-amber-*` / amber gradients → `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `border-border`.

## Technical Notes
- All schema in single migration per phase, RLS preserved.
- Sidebar (`AdminSidebar.tsx`): add new entries (audit-log, storage-explorer) inside appropriate pillars without removing existing items.
- No table or component deletion. Orphan route `/admin/crm/roles` kept as alias.
- Hebrew RTL labels exactly as specified.

## Scope / Effort
Substantial: ~5 migrations, ~12 file edits, ~3 new files. Will execute sequentially after approval.

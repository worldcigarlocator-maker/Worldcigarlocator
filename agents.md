# WCL AI BOOTSTRAP

## Canonical Documents
- WCL_Kickstart_CURRENT.pdf
- WCL_Canonical_Spec_CURRENT.pdf
- WCL_AI_Primer_CURRENT.pdf
- WCL_Delta_Log_MASTER_v3.1.pdf

## Core Rules
- Backend authority overrides frontend
- No frontend aggregation
- No frontend counts logic
- Sidebar counts are backend-only
- Analytics are append-only
- No destructive changes without approval
- Human moderation overrides automation
- No assumptions

## Forbidden
- LIMIT in sidebar
- Direct frontend access to stores
- Smart frontend geo logic
- Auto moderation
- Auto approval
- Silent mutations

## Canonical Frontend Dataset
stores_frontend_public_v5

## Canonical RPCs
- search_stores_v2
- sidebar_nodes_v3
- stores_within_bounds
- analytics_top_stores_v2

## Frontend Ownership
- sidebar.js = navigation only
- cards.js = search state owner
- analytics.js = read-only analytics rendering
- modal.js = canonical modal rendering

## Geography Rules
USA:
continent → country → state → city

All other countries:
continent → country → city

## Analytics Rules
Canonical events:
- store_view
- store_opened
- website_clicked

Analytics never influence rendering or moderation.

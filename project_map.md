


WCL ANALYTICS — PROJECT_MAP DOCUMENTATION
Canonical Analytics Architecture Documentation
Status: Current / Production Evolution Phase
CORE ANALYTICS PHILOSOPHY

WCL Analytics is not designed as a traditional business dashboard.

Primary purpose:

DISCOVERY + TRUST + VISITS

The analytics system exists to:

understand cigar discovery behavior
identify market demand
surface valuable lounges/stores
improve exploration and trust
drive real-world visits and website clicks

WCL analytics is:

geo-centric
discovery-centric
engagement-centric
intelligence-driven

NOT:

enterprise BI software
internal accounting analytics
ad-tech surveillance system
ANALYTICS IDENTITY MODEL
MEMBERS

User Intelligence

Purpose:

understand network activity
measure engagement
identify active users/sessions
understand behavior and retention

Examples:

sessions
active users
member behavior
engagement activity
STORES

Location Intelligence

Purpose:

evaluate individual lounges/stores
measure engagement quality
identify hidden gems
understand performance signals

Examples:

views
clicks
CTR
favorites
ratings
comments
trend momentum
predictive signals

Stores evolved into:

INTELLIGENCE DOSSIER SYSTEM

rather than a traditional analytics table.

MARKET

Geo / Market Intelligence

Purpose:

understand global cigar demand
understand geographic discovery behavior
identify regional growth
analyze country/city traffic

Examples:

country traffic
city traffic
regional momentum
source dominance
geo heatmaps
discovery patterns

Market is evolving from:

generic analytics dashboard

into:

GEO MARKET INTELLIGENCE
CORE ANALYTICS EVENTS

Primary analytics table:

analytics_events

Canonical event types:

store_view
store_opened
website_clicked
map_viewport
search
map_pin_click
SOURCE OF TRUTH
Traffic Source

Single Source of Truth:

window.CURRENT_SOURCE

Allowed values:

search
map
sidebar
modal
direct

Source is locked at:

initial discovery
first interaction

and should not mutate later.

ANALYTICS FLOW
Frontend

Frontend emits analytics events via:

RPCs
Edge Functions
controlled tracking layer
Edge Functions

Important tracking flow:

frontend
→ edge function
→ analytics_events
→ aggregation RPCs/views
→ analytics dashboards

Example:

website_clicked

uses:

visit-store edge function

to:

log click
then redirect user
MAIN DATABASE TABLES
analytics_events

Central append-only analytics event table.

Contains:

event_type
timestamp
session_hash
store_id
city
country
source
lat/lng
metadata

This is the canonical analytics event ledger.

stores

Primary store/lounge table.

Important flags:

approved = true
deleted = false

Frontend never reads raw stores table directly.

store_favorites

Tracks:

user favorites
loyalty signals

Used in:

dossier intelligence
engagement analysis
ratings

Tracks:

user ratings
average score
reputation quality
store_comments

Tracks:

comments
community engagement
social proof

Supports:

hidden moderation
ownership logic
FRONTEND ANALYTICS ARCHITECTURE
analytics.js

Canonical runtime orchestrator.

Responsibilities:

KPI routing
state subscriptions
render switching
module orchestration
STATE MODEL

Single Source of Truth pattern.

Important concept:

RENDERING SHOULD BE STATE DRIVEN

not:

imperative direct rendering
MAIN MODULES
funnel-market.js

Original market layer.

Responsibilities:

market drilldowns
country/city rankings
heatmaps
funnel-market-v2.js

Evolving geo intelligence layer.

Future role:

country dossiers
geo intelligence
city drilldowns
market signals
funnel-users.js

User/member intelligence.

Responsibilities:

active users
sessions
user activity
funnel-stores-v2.js

Store intelligence engine.

Current status:

MOST ADVANCED ANALYTICS SURFACE

Contains:

dossier engine
intelligence layers
trend system
behavioral analysis
predictive analysis
STORES V2 DOSSIER SYSTEM
Current Dossier Sections
Overview
views
clicks
CTR
favorites
ratings
comments
Traffic Sources
sidebar
search
map
modal
direct

Includes:

source bars
distribution visualization
Engagement Signals
loyalty
reputation
community activity
Trend Intelligence
momentum
trend bars
avg views/day
avg clicks/day
Behavioral Intelligence
dominant source
discovery behavior
engagement quality
market position
Local Market Intelligence
competition level
audience type
loyalty strength
reputation strength
traffic profile
Market Context
city position
country tier
regional momentum
destination profile
Commercial Intelligence
premium candidate
tourism potential
expansion potential
partnership grade
Predictive Signals
growth outlook
breakout potential
decay risk
audience trajectory
CURRENT STORES V2 STATUS

Status:

STABLE POLISH PHASE

NOT:

architecture recovery phase

Meaning:

render flow stable
dossier rendering stable
helper scope stable
SQL performance improved
IMPORTANT RECENT IMPROVEMENTS
Top Store Limit

Previous issue:

rendering all stores

Current solution:

p_limit default 50

inside:

analytics_store_intelligence_v1

Now:

canonical SQL limiting
Top 50 rendering
improved frontend performance
IMPORTANT RPCS
analytics_kpi_v2

Global KPI aggregation.

analytics_sessions_v1

User/session metrics.

analytics_top_countries

Country analytics.

analytics_top_cities

City analytics.

analytics_top_stores

Store rankings.

analytics_store_summary

Store-level summary.

analytics_store_daily

Daily store trend timeline.

analytics_store_traffic_by_source

Traffic source intelligence.

analytics_store_traffic_by_city

City traffic breakdown for stores.

analytics_store_intelligence_v1

Canonical store dossier dataset.

Current parameters:

p_days integer default 30
p_limit integer default 50
DATABASE GOVERNANCE
Canonical Rules
Backend Authority

Frontend must never invent analytics.

All intelligence originates from:

SQL
RPCs
controlled aggregations
No Frontend Aggregation

Frontend presentation only.

Heavy calculations belong in:

SQL
RPCs
views
Append-Only Analytics

analytics_events is append-only.

Never destructive.

RPC-Driven Frontend

Frontend should consume:

RPCs
public views

NOT:

raw table intelligence logic
UI / UX DIRECTION
MARKET

Visual identity:

GLOBAL GEO INTELLIGENCE

Should feel:

map-driven
cinematic
geographic
alive
STORES

Visual identity:

PREMIUM LOCATION DOSSIERS

Should feel:

luxury
curated
rich
intelligence-heavy
MEMBERS

Visual identity:

NETWORK USER INTELLIGENCE

Should feel:

behavioral
activity-driven
engagement-focused
CURRENT PRODUCT EVOLUTION

WCL analytics evolved from:

basic dashboard analytics

into:

discovery intelligence platform

Current phase:

PRODUCT EVOLUTION

NOT:

backend refactor phase

Priority now:

UX hierarchy
intelligence presentation
geo storytelling
premium visual language
performance polish

NOT:

massive rewrites
architecture surgery
abstraction purity refactors

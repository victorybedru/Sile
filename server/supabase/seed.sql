-- ==============================================================================
-- Sile — Community Service Information & Reporting Platform (Addis Ababa)
-- Initial Prototype Seed Data (Clearly Identified Demonstration Records)
-- File: server/supabase/seed.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED ANNOUNCEMENTS (PROTOTYPE DEMONSTRATION DATA)
-- Realistic prototype announcements for Addis Ababa across multiple sub-cities and categories.
-- All items are flagged with is_sample_data = true.
-- ------------------------------------------------------------------------------
INSERT INTO announcements (
    id, title, category, sub_city, affected_neighborhoods, description,
    is_planned, start_date, expected_end_date, published_at, is_published,
    is_sample_data, publisher_name
) VALUES
(
    'ann-sample-001',
    'Scheduled Transformer Maintenance & Line Upgrade',
    'Electricity',
    'Bole',
    'Bole Medhanialem, Atlas Hotel area, Cameroon St',
    '[Prototype Demo] Preventive maintenance on the regional feeder substation to improve grid reliability during peak evening hours. Service will be paused temporarily while technical crews replace distribution cables.',
    true,
    '2026-11-14T08:30:00Z',
    '2026-11-14T15:00:00Z',
    '2026-11-11T10:00:00Z',
    true,
    true,
    'Addis Ababa District Coordination Desk (Demo)'
),
(
    'ann-sample-002',
    'Main Pipeline Valve Replacement & Low Pressure Advisory',
    'Water',
    'Bole',
    'Bole Bulbula, Michael area, Woreda 12',
    '[Prototype Demo] Scheduled maintenance on the secondary water transmission mains. Residents in upper elevations may experience low pressure or temporary supply pauses. Water trucks are pre-positioned near local health centers.',
    true,
    '2026-11-13T06:00:00Z',
    '2026-11-13T18:00:00Z',
    '2026-11-10T14:30:00Z',
    true,
    true,
    'Municipal Utility Liaison (Demo)'
),
(
    'ann-sample-003',
    'Churchill Avenue Lane Resurfacing & Drainage Improvement',
    'Roads',
    'Arada',
    'Churchill Ave between Tewodros Square and Piazza',
    '[Prototype Demo] Asphalt rehabilitation and stormwater grate installation ahead of expected seasonal showers. Single-lane alternating traffic will be in effect with local traffic marshals directing vehicles.',
    true,
    '2026-11-12T20:00:00Z',
    '2026-11-15T05:00:00Z',
    '2026-11-09T08:00:00Z',
    true,
    true,
    'City Infrastructure & Roads Desk (Demo)'
),
(
    'ann-sample-004',
    'Unplanned Feeder Cable Fault Near Kazanchis Junction',
    'Electricity',
    'Kirkos',
    'Kazanchis, ECA area, Guinea Conakry St',
    '[Prototype Demo] Underground high-tension cable fault detected following recent utility excavations. Rapid response technical unit is on-site troubleshooting the line.',
    false,
    '2026-11-12T07:15:00Z',
    '2026-11-12T16:30:00Z',
    '2026-11-12T08:00:00Z',
    true,
    true,
    'Emergency Response Coordinator (Demo)'
),
(
    'ann-sample-005',
    'Water Distribution Tank Disinfection and Cleaning',
    'Water',
    'Yeka',
    'Megenagna, Shola Market vicinity, CMC corridor',
    '[Prototype Demo] Routine municipal reservoir sanitation to safeguard drinking water standards. Water supply will resume normal pressure by late evening.',
    true,
    '2026-11-15T09:00:00Z',
    '2026-11-15T17:00:00Z',
    '2026-11-11T16:00:00Z',
    true,
    true,
    'Municipal Utility Liaison (Demo)'
),
(
    'ann-sample-006',
    'Bridge Expansion Joint Repair on Ring Road Overpass',
    'Roads',
    'Nifas Silk-Lafto',
    'Gotera interchange to Saris segment',
    '[Prototype Demo] Routine structural maintenance on heavy-vehicle overpass joint. Southbound lane narrowed to one lane. Commercial transport encouraged to use alternative arterial links.',
    true,
    '2026-11-16T07:00:00Z',
    '2026-11-17T18:00:00Z',
    '2026-11-11T12:00:00Z',
    true,
    true,
    'City Infrastructure & Roads Desk (Demo)'
),
(
    'ann-sample-007',
    'Citywide Energy Efficiency & Safety Inspection',
    'Electricity',
    'All Areas',
    'All sub-cities throughout Addis Ababa',
    '[Prototype Demo] Public service advisory on standard home circuit safety checks and reporting exposed street light cabling. Emergency hotline dispatch remains operational 24/7.',
    true,
    NULL,
    NULL,
    '2026-11-08T09:00:00Z',
    true,
    true,
    'Addis Ababa District Coordination Desk (Demo)'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. SEED SAMPLE REPORTS (PROTOTYPE DEMONSTRATION DATA)
-- Demonstrates the report workflow states (In Progress, Submitted, Resolved).
-- ------------------------------------------------------------------------------
INSERT INTO reports (
    id, category, sub_city, specific_location, description, priority,
    status, assigned_to, coordinator_notes, client_created_at, client_updated_at,
    created_at, updated_at
) VALUES
(
    'sile-sample-101',
    'Electricity',
    'Bole',
    'Near Rwanda Embassy, Cameroon Street',
    '[Demo Report] Overhead power cable sagging low over roadway after delivery truck clipped tree branch. Sparks noted during wind gusts.',
    'High',
    'In Progress',
    'Addis Ababa Electric - Bole District Rapid Unit',
    'Unit 4 dispatched with insulated lift truck. Road marshal notified.',
    '2026-11-12T06:45:00Z',
    '2026-11-12T07:45:00Z',
    '2026-11-12T06:46:15Z',
    '2026-11-12T07:45:00Z'
),
(
    'sile-sample-102',
    'Water',
    'Kirkos',
    'Meskel Flower area, behind Dreamliner Hotel',
    '[Demo Report] Clean drinking water gushing from underground pipe beneath the curb. Water pressure in adjacent residential compounds has dropped significantly.',
    'Medium',
    'Submitted',
    NULL,
    NULL,
    '2026-11-12T08:05:00Z',
    '2026-11-12T08:10:00Z',
    '2026-11-12T08:10:00Z',
    '2026-11-12T08:10:00Z'
),
(
    'sile-sample-103',
    'Roads',
    'Arada',
    'Piazza, Ras Mekonnen Ave',
    '[Demo Report] Open storm drain cover missing near busy pedestrian crossing. Hazard for children and elders walking in dusk.',
    'High',
    'Resolved',
    'City Roads Maintenance Crew #2',
    'Replaced with secure heavy-duty ductile iron grate and sealed rims.',
    '2026-11-10T09:20:00Z',
    '2026-11-11T14:15:00Z',
    '2026-11-10T09:20:00Z',
    '2026-11-11T14:15:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. SEED REPORT ACTIVITY LOGS (PROTOTYPE DEMONSTRATION DATA)
-- Chronological audit trails for demonstration reports.
-- Clearly notes storage in the Sile demonstration prototype environment.
-- ------------------------------------------------------------------------------
INSERT INTO report_activity_logs (
    id, report_id, action, details, actor, timestamp, created_at
) VALUES
-- sile-sample-101 History
(
    'act-sample-101-1',
    'sile-sample-101',
    'Report Created',
    'Report recorded locally on resident device in demonstration mode.',
    'Resident',
    '2026-11-12T06:45:00Z',
    '2026-11-12T06:45:00Z'
),
(
    'act-sample-101-2',
    'sile-sample-101',
    'Report Submitted',
    'Report queued for coordinator dispatch in prototype environment.',
    'Resident',
    '2026-11-12T06:46:00Z',
    '2026-11-12T06:46:00Z'
),
(
    'act-sample-101-3',
    'sile-sample-101',
    'Synchronization Succeeded',
    'Confirmed and stored in Sile prototype database for demonstration.',
    'System',
    '2026-11-12T06:46:15Z',
    '2026-11-12T06:46:15Z'
),
(
    'act-sample-101-4',
    'sile-sample-101',
    'Report Assigned',
    'Assigned to Addis Ababa Electric - Bole District Rapid Unit for prototype dispatch.',
    'Coordinator',
    '2026-11-12T07:15:00Z',
    '2026-11-12T07:15:00Z'
),
(
    'act-sample-101-5',
    'sile-sample-101',
    'Status Changed to In Progress',
    'Crews secured the roadway boundary and are tensioning the feeder cables.',
    'Coordinator',
    '2026-11-12T07:45:00Z',
    '2026-11-12T07:45:00Z'
),

-- sile-sample-102 History
(
    'act-sample-102-1',
    'sile-sample-102',
    'Report Created',
    'Recorded locally on device in demonstration mode.',
    'Resident',
    '2026-11-12T08:05:00Z',
    '2026-11-12T08:05:00Z'
),
(
    'act-sample-102-2',
    'sile-sample-102',
    'Report Submitted',
    'Awaiting coordinator triage in prototype environment.',
    'Resident',
    '2026-11-12T08:06:00Z',
    '2026-11-12T08:06:00Z'
),
(
    'act-sample-102-3',
    'sile-sample-102',
    'Synchronization Succeeded',
    'Confirmed and stored in Sile prototype database for demonstration.',
    'System',
    '2026-11-12T08:10:00Z',
    '2026-11-12T08:10:00Z'
),

-- sile-sample-103 History
(
    'act-sample-103-1',
    'sile-sample-103',
    'Report Created & Submitted',
    'Received from resident in Arada in prototype environment.',
    'Resident',
    '2026-11-10T09:20:00Z',
    '2026-11-10T09:20:00Z'
),
(
    'act-sample-103-2',
    'sile-sample-103',
    'Report Assigned',
    'Assigned to City Roads Maintenance Crew #2 for prototype repair.',
    'Coordinator',
    '2026-11-10T11:00:00Z',
    '2026-11-10T11:00:00Z'
),
(
    'act-sample-103-3',
    'sile-sample-103',
    'Status Changed to In Progress',
    'Crew delivered custom replacement grate.',
    'Coordinator',
    '2026-11-11T08:30:00Z',
    '2026-11-11T08:30:00Z'
),
(
    'act-sample-103-4',
    'sile-sample-103',
    'Status Changed to Resolved',
    'Grate fitted securely and level with pavement. Hazard cleared.',
    'Coordinator',
    '2026-11-11T14:15:00Z',
    '2026-11-11T14:15:00Z'
)
ON CONFLICT (id) DO NOTHING;

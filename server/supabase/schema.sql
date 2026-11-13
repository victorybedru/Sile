-- ==============================================================================
-- Sile — Community Service Information & Reporting Platform (Addis Ababa)
-- Supabase Database Schema & Atomic Functions (Safe Non-Destructive Migration)
-- File: server/supabase/schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up any obsolete overloaded function signatures from earlier drafts
DROP FUNCTION IF EXISTS submit_report_atomic(JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS submit_report_atomic(JSONB, JSONB);

-- ==============================================================================
-- 1. REPORTS TABLE
-- Stores community problem reports created by residents and managed by coordinators.
-- Safe creation: Uses IF NOT EXISTS to avoid dropping existing user data.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (
        category IN ('Electricity', 'Water', 'Roads', 'Other')
    ),
    sub_city TEXT NOT NULL CHECK (
        sub_city IN (
            'Bole', 'Kirkos', 'Arada', 'Yeka', 'Lideta', 
            'Gulele', 'Kolfe Keranio', 'Nifas Silk-Lafto', 
            'Akaki-Kality', 'Addis Ketema', 'Lemi Kura'
        )
    ),
    specific_location TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (
        priority IN ('Low', 'Medium', 'High')
    ),
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
        status IN ('Draft', 'Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected')
    ),
    assigned_to TEXT,
    coordinator_notes TEXT,
    client_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Index Creation
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_sub_city ON reports(sub_city);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ==============================================================================
-- 2. REPORT ACTIVITY LOGS TABLE
-- Maintains an authoritative, immutable audit trail of actions taken on reports.
-- Linked 1-to-many to the reports table with cascading deletion.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS report_activity_logs (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    actor TEXT NOT NULL CHECK (
        actor IN ('Resident', 'Coordinator', 'System')
    ),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Index Creation
CREATE INDEX IF NOT EXISTS idx_report_logs_report_id ON report_activity_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_logs_timestamp ON report_activity_logs(report_id, timestamp ASC);

-- ==============================================================================
-- 3. ANNOUNCEMENTS TABLE
-- Stores municipal outage and maintenance announcements.
-- 'affected_neighborhoods' is stored as TEXT matching the frontend string type.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN ('Electricity', 'Water', 'Roads')
    ),
    sub_city TEXT NOT NULL CHECK (
        sub_city IN (
            'Bole', 'Kirkos', 'Arada', 'Yeka', 'Lideta', 
            'Gulele', 'Kolfe Keranio', 'Nifas Silk-Lafto', 
            'Akaki-Kality', 'Addis Ketema', 'Lemi Kura', 'All Areas'
        )
    ),
    affected_neighborhoods TEXT,
    description TEXT NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMPTZ,
    expected_end_date TIMESTAMPTZ,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_sample_data BOOLEAN NOT NULL DEFAULT false,
    publisher_name TEXT NOT NULL DEFAULT 'Addis Ababa District Coordination Desk',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Index Creation
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_sub_city ON announcements(sub_city);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_is_published ON announcements(is_published);

-- ==============================================================================
-- 4. CONCURRENCY-SAFE ATOMIC REPORT SUBMISSION FUNCTION
-- Guarantees:
-- 1. Full input validation: Validates category, sub-city, priority, description,
--    specific location, and initial status (ONLY 'Draft' or 'Submitted' permitted).
-- 2. Concurrency safety: Uses ON CONFLICT (id) DO NOTHING to prevent race conditions.
-- 3. Strict Idempotency Check:
--    - When an ID already exists, compares immutable fields (category, subCity,
--      specificLocation, description, priority).
--    - If fields mismatch, raises an exception (rejecting fraudulent/colliding ID reuse).
--    - If fields match, returns the existing record without overwriting.
-- 4. Authoritative activity logs: Generates unique UUIDs and server timestamps (NOW())
--    inside PostgreSQL. No client log parameters accepted, preventing collision attacks.
-- 5. Safe search_path: Explicitly configured to public, pg_temp.
-- ==============================================================================
CREATE OR REPLACE FUNCTION submit_report_atomic(
    p_report JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id TEXT := TRIM(COALESCE(p_report->>'id', ''));
    v_category TEXT := TRIM(COALESCE(p_report->>'category', ''));
    v_sub_city TEXT := TRIM(COALESCE(p_report->>'subCity', ''));
    v_specific_location TEXT := TRIM(COALESCE(p_report->>'specificLocation', ''));
    v_description TEXT := TRIM(COALESCE(p_report->>'description', ''));
    v_priority TEXT := TRIM(COALESCE(p_report->>'priority', 'Medium'));
    v_initial_status TEXT := TRIM(COALESCE(p_report->>'status', 'Submitted'));
    v_existing_report RECORD;
    v_log_id_created TEXT;
    v_log_id_submitted TEXT;
    v_client_created_at TIMESTAMPTZ;
BEGIN
    -- 1. Full Input Validation
    IF v_id = '' THEN
        RAISE EXCEPTION 'Report ID cannot be empty.';
    END IF;

    IF v_category NOT IN ('Electricity', 'Water', 'Roads', 'Other') THEN
        RAISE EXCEPTION 'Invalid category: "%". Must be Electricity, Water, Roads, or Other.', v_category;
    END IF;

    IF v_sub_city NOT IN (
        'Bole', 'Kirkos', 'Arada', 'Yeka', 'Lideta', 
        'Gulele', 'Kolfe Keranio', 'Nifas Silk-Lafto', 
        'Akaki-Kality', 'Addis Ketema', 'Lemi Kura'
    ) THEN
        RAISE EXCEPTION 'Invalid sub-city: "%". Must be a valid Addis Ababa sub-city.', v_sub_city;
    END IF;

    IF v_specific_location = '' THEN
        RAISE EXCEPTION 'Specific location cannot be empty. Please provide a street name, landmark, or neighborhood.';
    END IF;

    IF LENGTH(v_description) < 10 THEN
        RAISE EXCEPTION 'Description must be at least 10 characters long.';
    END IF;

    IF v_priority NOT IN ('Low', 'Medium', 'High') THEN
        RAISE EXCEPTION 'Invalid priority: "%". Must be Low, Medium, or High.', v_priority;
    END IF;

    -- Strict gate: Newly submitted reports can NEVER start in terminal or advanced states
    IF v_initial_status NOT IN ('Draft', 'Submitted') THEN
        RAISE EXCEPTION 'Invalid initial status: "%". Newly created reports may only start as "Draft" or "Submitted".', v_initial_status;
    END IF;

    -- Preserve the client's offline creation timestamp separately if supplied
    v_client_created_at := COALESCE((p_report->>'createdAt')::TIMESTAMPTZ, NOW());

    -- 2. Concurrency-Safe Insert: Attempt insertion; if ID exists, DO NOTHING
    INSERT INTO reports (
        id,
        category,
        sub_city,
        specific_location,
        description,
        priority,
        status,
        assigned_to,
        coordinator_notes,
        client_created_at,
        client_updated_at,
        created_at,
        updated_at
    ) VALUES (
        v_id,
        v_category,
        v_sub_city,
        v_specific_location,
        v_description,
        v_priority,
        v_initial_status,
        NULL, -- Initial creation cannot specify an assignment
        NULL, -- Initial creation cannot specify coordinator notes
        v_client_created_at,
        COALESCE((p_report->>'updatedAt')::TIMESTAMPTZ, v_client_created_at),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Check if insertion occurred or if report already existed
    IF NOT FOUND THEN
        -- Report already exists in database. Fetch existing record.
        SELECT * INTO v_existing_report FROM reports WHERE id = v_id;

        -- Strict Idempotency Check: Compare incoming immutable fields with the existing record
        IF v_existing_report.category <> v_category OR
           v_existing_report.sub_city <> v_sub_city OR
           v_existing_report.specific_location <> v_specific_location OR
           v_existing_report.description <> v_description OR
           v_existing_report.priority <> v_priority THEN
            RAISE EXCEPTION 'ID collision or content mismatch: Report "%" already exists with different details.', v_id;
        END IF;

        -- Content matches exactly: Acknowledge safe retry without overwriting data
        RETURN jsonb_build_object(
            'success', true,
            'isDuplicateAck', true,
            'report', row_to_json(v_existing_report)
        );
    END IF;

    -- 4. Authoritative Activity Log Generation (PostgreSQL Generated UUIDs & Server Timestamps)
    -- Step A: Report Created log
    v_log_id_created := 'act-' || gen_random_uuid()::TEXT;

    INSERT INTO report_activity_logs (
        id,
        report_id,
        action,
        details,
        actor,
        timestamp,
        created_at
    ) VALUES (
        v_log_id_created,
        v_id,
        'Report Created',
        'Report recorded locally on device. Specific area: ' || v_specific_location || '.',
        'Resident', -- Enforced authoritatively
        NOW(),      -- Server-generated timestamp
        NOW()
    );

    -- Step B: If status is Submitted, generate authoritative Report Submitted log
    IF v_initial_status = 'Submitted' THEN
        v_log_id_submitted := 'act-' || gen_random_uuid()::TEXT;

        INSERT INTO report_activity_logs (
            id,
            report_id,
            action,
            details,
            actor,
            timestamp,
            created_at
        ) VALUES (
            v_log_id_submitted,
            v_id,
            'Report Submitted',
            'Report queued for coordinator dispatch and synchronization.',
            'Resident', -- Enforced authoritatively
            NOW(),      -- Server-generated timestamp
            NOW()
        );
    END IF;

    SELECT * INTO v_existing_report FROM reports WHERE id = v_id;

    RETURN jsonb_build_object(
        'success', true,
        'isDuplicateAck', false,
        'report', row_to_json(v_existing_report)
    );
END;
$$;

-- ==============================================================================
-- 5. ATOMIC STATUS TRANSITION FUNCTION (ENFORCING STATE MACHINE & ACTOR VALIDATION)
-- Enforces:
--   Draft -> Submitted, Rejected
--   Submitted -> Assigned, Rejected
--   Assigned -> In Progress, Rejected
--   In Progress -> Resolved, Rejected
--   Terminal states: Resolved and Rejected cannot change
-- Only 'Coordinator' or 'System' actors are authorized.
-- Safe search_path: Explicitly configured to public, pg_temp.
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_report_status_atomic(
    p_report_id TEXT,
    p_target_status TEXT,
    p_note TEXT DEFAULT NULL,
    p_actor TEXT DEFAULT 'Coordinator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_report_id TEXT := TRIM(COALESCE(p_report_id, ''));
    v_target_status TEXT := TRIM(COALESCE(p_target_status, ''));
    v_actor TEXT := TRIM(COALESCE(p_actor, 'Coordinator'));
    v_note TEXT := TRIM(COALESCE(p_note, ''));
    v_current_status TEXT;
    v_is_valid BOOLEAN := false;
    v_log_id TEXT;
    v_details TEXT;
    v_updated_report RECORD;
BEGIN
    -- 1. Input Validation
    IF v_report_id = '' THEN
        RAISE EXCEPTION 'Report ID cannot be empty.';
    END IF;

    IF v_target_status NOT IN ('Draft', 'Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid target status: "%".', v_target_status;
    END IF;

    IF v_actor NOT IN ('Coordinator', 'System') THEN
        RAISE EXCEPTION 'Unauthorized actor: "%". Only Coordinator or System may update report status.', v_actor;
    END IF;

    -- 2. Fetch current status with row-level lock (FOR UPDATE) to prevent race conditions
    SELECT status INTO v_current_status
    FROM reports
    WHERE id = v_report_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Report not found with ID: %', v_report_id;
    END IF;

    IF v_current_status = v_target_status THEN
        RAISE EXCEPTION 'Report is already in "%" status.', v_target_status;
    END IF;

    IF v_current_status IN ('Resolved', 'Rejected') THEN
        RAISE EXCEPTION 'Cannot change status of a report in terminal state "%".', v_current_status;
    END IF;

    -- 3. State Machine Rule Validation
    IF v_current_status = 'Draft' AND v_target_status IN ('Submitted', 'Rejected') THEN
        v_is_valid := true;
    ELSIF v_current_status = 'Submitted' AND v_target_status IN ('Assigned', 'Rejected') THEN
        v_is_valid := true;
    ELSIF v_current_status = 'Assigned' AND v_target_status IN ('In Progress', 'Rejected') THEN
        v_is_valid := true;
    ELSIF v_current_status = 'In Progress' AND v_target_status IN ('Resolved', 'Rejected') THEN
        v_is_valid := true;
    END IF;

    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Invalid status transition: A report cannot move directly from "%" to "%". Workflow requires: Draft -> Submitted -> Assigned -> In Progress -> Resolved (or Rejected).', v_current_status, v_target_status;
    END IF;

    -- 4. Update Report Row
    UPDATE reports
    SET status = v_target_status,
        coordinator_notes = CASE 
            WHEN v_note <> '' AND coordinator_notes IS NOT NULL THEN coordinator_notes || E'\n' || v_note
            WHEN v_note <> '' THEN v_note
            ELSE coordinator_notes
        END,
        updated_at = NOW()
    WHERE id = v_report_id;

    -- 5. Insert Authoritative Activity Log Entry (Generated UUID & Server Timestamp)
    v_log_id := 'act-' || gen_random_uuid()::TEXT;
    v_details := CASE 
        WHEN v_note <> '' THEN v_note 
        ELSE 'Status progressed from ' || v_current_status || ' to ' || v_target_status || '.' 
    END;

    INSERT INTO report_activity_logs (
        id,
        report_id,
        action,
        details,
        actor,
        timestamp,
        created_at
    ) VALUES (
        v_log_id,
        v_report_id,
        'Status Changed to ' || v_target_status,
        v_details,
        v_actor,
        NOW(),
        NOW()
    );

    SELECT * INTO v_updated_report FROM reports WHERE id = v_report_id;

    RETURN jsonb_build_object(
        'success', true,
        'previousStatus', v_current_status,
        'newStatus', v_target_status,
        'report', row_to_json(v_updated_report)
    );
END;
$$;

-- ==============================================================================
-- 6. ATOMIC REPORT ASSIGNMENT FUNCTION
-- Assigns or reassigns a report to a dispatch team or municipal agency.
-- Strict Workflow Rules:
--   - Rejects assignment if current status is 'Draft' (must be submitted first).
--   - Rejects assignment if current status is 'Resolved' or 'Rejected' (terminal).
--   - Only 'Submitted', 'Assigned', and 'In Progress' reports may be assigned.
--   - If report is 'Submitted', advances status to 'Assigned'.
--   - If report is 'Assigned' or 'In Progress', preserves its current status.
-- Safe search_path: Explicitly configured to public, pg_temp.
-- ==============================================================================
CREATE OR REPLACE FUNCTION assign_report_atomic(
    p_report_id TEXT,
    p_assigned_to TEXT,
    p_note TEXT DEFAULT NULL,
    p_actor TEXT DEFAULT 'Coordinator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_report_id TEXT := TRIM(COALESCE(p_report_id, ''));
    v_assigned_to TEXT := TRIM(COALESCE(p_assigned_to, ''));
    v_actor TEXT := TRIM(COALESCE(p_actor, 'Coordinator'));
    v_note TEXT := TRIM(COALESCE(p_note, ''));
    v_current_status TEXT;
    v_new_status TEXT;
    v_log_id TEXT;
    v_details TEXT;
    v_updated_report RECORD;
BEGIN
    -- 1. Input Validation
    IF v_report_id = '' THEN
        RAISE EXCEPTION 'Report ID cannot be empty.';
    END IF;

    IF v_assigned_to = '' THEN
        RAISE EXCEPTION 'Assigned dispatch team or agency cannot be empty.';
    END IF;

    IF v_actor NOT IN ('Coordinator', 'System') THEN
        RAISE EXCEPTION 'Unauthorized actor: "%". Only Coordinator or System may assign reports.', v_actor;
    END IF;

    -- 2. Fetch current status with row-level lock (FOR UPDATE)
    SELECT status INTO v_current_status
    FROM reports
    WHERE id = v_report_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Report not found with ID: %', v_report_id;
    END IF;

    -- 3. Workflow Rule: Draft reports cannot be assigned
    IF v_current_status = 'Draft' THEN
        RAISE EXCEPTION 'Cannot assign a report in "Draft" status. Reports must be submitted before they can be assigned.';
    END IF;

    -- 4. Workflow Rule: Terminal reports cannot be assigned
    IF v_current_status IN ('Resolved', 'Rejected') THEN
        RAISE EXCEPTION 'Cannot assign a report that is in terminal status "%".', v_current_status;
    END IF;

    -- 5. Workflow Rule: Only Submitted, Assigned, and In Progress reports can be assigned/reassigned
    IF v_current_status NOT IN ('Submitted', 'Assigned', 'In Progress') THEN
        RAISE EXCEPTION 'Cannot assign a report in status "%". Only Submitted, Assigned, and In Progress reports may be assigned.', v_current_status;
    END IF;

    -- 6. Status advancement logic: Submitted -> Assigned; otherwise keep current active status
    IF v_current_status = 'Submitted' THEN
        v_new_status := 'Assigned';
    ELSE
        v_new_status := v_current_status;
    END IF;

    UPDATE reports
    SET assigned_to = v_assigned_to,
        status = v_new_status,
        coordinator_notes = CASE 
            WHEN v_note <> '' AND coordinator_notes IS NOT NULL THEN coordinator_notes || E'\n' || v_note
            WHEN v_note <> '' THEN v_note
            ELSE coordinator_notes
        END,
        updated_at = NOW()
    WHERE id = v_report_id;

    -- 7. Authoritative Activity Log Entry (Generated UUID & Server Timestamp)
    v_log_id := 'act-' || gen_random_uuid()::TEXT;
    v_details := 'Assigned to ' || v_assigned_to || '.' || CASE WHEN v_note <> '' THEN ' ' || v_note ELSE '' END;

    INSERT INTO report_activity_logs (
        id,
        report_id,
        action,
        details,
        actor,
        timestamp,
        created_at
    ) VALUES (
        v_log_id,
        v_report_id,
        'Report Assigned',
        v_details,
        v_actor,
        NOW(),
        NOW()
    );

    SELECT * INTO v_updated_report FROM reports WHERE id = v_report_id;

    RETURN jsonb_build_object(
        'success', true,
        'assignedTo', v_assigned_to,
        'status', v_new_status,
        'report', row_to_json(v_updated_report)
    );
END;
$$;

-- ==============================================================================
-- 7. FUNCTION PERMISSIONS (ROLE RESTRICTION)
-- Revoke execution from PUBLIC, anon, and authenticated users to prevent arbitrary
-- direct invocation from the browser client via Supabase JS.
-- Grant execution strictly to 'service_role' (used exclusively by our Express backend).
-- ==============================================================================
REVOKE ALL ON FUNCTION submit_report_atomic(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_report_atomic(JSONB) TO service_role;

REVOKE ALL ON FUNCTION update_report_status_atomic(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_report_status_atomic(TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION assign_report_atomic(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_report_atomic(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation:
-- - reports: NO public or anon SELECT policy. Access restricted to service_role (backend).
-- - report_activity_logs: NO public or anon SELECT policy. Access restricted to service_role (backend).
-- - announcements: Only published announcements are readable by anon/authenticated clients.
-- ==============================================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Clean existing policies safely before defining new ones
DROP POLICY IF EXISTS "Allow public read access on published announcements" ON announcements;
DROP POLICY IF EXISTS "Allow public read access on reports" ON reports;
DROP POLICY IF EXISTS "Allow public read access on activity logs" ON report_activity_logs;

-- Announcements Policy: Only published announcements are readable publicly
CREATE POLICY "Allow public read access on published announcements"
    ON announcements FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

-- Note: No policies are created for 'reports' and 'report_activity_logs' for 'anon' or 'authenticated'.
-- Because RLS is active with no permissive policies, direct client requests are denied by default.
-- The Express backend uses the 'service_role' key, which automatically bypasses RLS securely.

import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(process.env.DATABASE_URL);
const [verification] = await sql`
  select
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_profiles') as client_profiles,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profiles' and column_name = 'bio') as client_profile_bio,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profiles' and column_name = 'preferred_contact_time') as client_profile_contact_time,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_profile_shares') as client_profile_shares,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'pre_account_eligibility_assessments') as pre_account_eligibility_assessments,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pre_account_eligibility_assessments' and column_name = 'assessment_reference') as pre_account_assessment_reference,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pre_account_eligibility_assessments' and column_name = 'lead_id') as pre_account_lead_id,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pre_account_eligibility_assessments' and column_name = 'converted_assessment_id') as pre_account_converted_assessment_id,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'pre_account_eligibility_assessments' and indexname = 'pre_account_assessments_created_idx') as pre_account_created_index,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profile_shares' and column_name = 'token_hash') as profile_share_token_hash,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profile_shares' and column_name = 'expires_at') as profile_share_expires_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profile_shares' and column_name = 'revoked_at') as profile_share_revoked_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'client_profiles' and column_name = 'client_reference') as client_reference,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'client_profiles' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'client_reference'
    ) as client_reference_unique,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'eligibility_assessments') as eligibility_assessments,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'eligibility_assessments' and column_name = 'assessment_reference' and is_nullable = 'NO') as assessment_reference,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'eligibility_assessments' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'assessment_reference'
    ) as assessment_reference_unique,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'eligibility_handoffs') as eligibility_handoffs,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claims') as claims,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claims' and column_name = 'archived_at') as claim_archived_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claims' and column_name = 'archive_reason') as claim_archive_reason,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claims' and indexname = 'claims_archived_at_idx') as claim_archived_index,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_status_history') as claim_status_history,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_timeline_events') as claim_timeline_events,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_evidence_requirements') as claim_evidence_requirements,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_documents') as claim_documents,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_document_uploads') as claim_document_uploads,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_conversations') as claim_conversations,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_messages') as claim_messages,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_message_reads') as claim_message_reads,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_notifications') as client_notifications,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'client_notification_preferences') as client_notification_preferences,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'client_profiles'
        and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'clerk_user_id'
    ) as clerk_user_id_unique,
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_class r on r.oid = c.confrelid
      where n.nspname = 'public' and t.relname = 'eligibility_assessments'
        and c.contype = 'f' and r.relname = 'client_profiles'
        and pg_get_constraintdef(c.oid) like '%client_profile_id%'
    ) as assessment_owner_fk,
    exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'eligibility_handoffs'
        and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'token_hash'
    ) as token_hash_unique,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'eligibility_handoffs' and column_name = 'expires_at') as expires_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'eligibility_handoffs' and column_name = 'redeemed_at') as redeemed_at,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claims' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'claim_reference'
    ) as claim_reference_unique,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claims' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'eligibility_assessment_id'
    ) as assessment_claim_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claims' and c.contype = 'f' and r.relname = 'client_profiles'
    ) as claim_owner_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claims' and c.contype = 'f' and r.relname = 'eligibility_assessments'
    ) as claim_assessment_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_evidence_requirements' and c.contype = 'f' and r.relname = 'claims'
    ) as evidence_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_documents' and c.contype = 'f' and r.relname = 'claims'
    ) as document_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_documents' and c.contype = 'f' and r.relname = 'claim_evidence_requirements'
    ) as document_requirement_fk,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_evidence_requirements' and indexname = 'claim_evidence_requirements_claim_status_idx'
    ) as evidence_status_index,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_documents' and indexname = 'claim_documents_claim_created_idx'
    ) as document_created_index,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claim_documents' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'document_reference'
    ) as document_reference_unique,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claim_document_uploads' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'object_key'
    ) as upload_object_key_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_document_uploads' and c.contype = 'f' and r.relname = 'claims'
    ) as upload_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_document_uploads' and c.contype = 'f' and r.relname = 'claim_documents'
    ) as upload_document_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_document_uploads' and c.contype = 'f' and r.relname = 'claim_evidence_requirements'
    ) as upload_requirement_fk,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claim_documents' and column_name = 'security_status') as document_security_status,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claim_evidence_requirements' and column_name = 'requirement_reference') as evidence_requirement_reference,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claim_evidence_requirements' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'requirement_reference'
    ) as evidence_requirement_reference_unique,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claim_conversations' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'claim_id'
    ) as conversation_claim_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_messages' and c.contype = 'f' and r.relname = 'claim_conversations'
    ) as message_conversation_fk,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_messages' and indexname = 'claim_messages_conversation_created_idx'
    ) as message_order_index,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_message_reads' and indexname = 'claim_message_reads_conversation_viewer_unique'
    ) as message_read_cursor_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'client_notifications' and c.contype = 'f' and r.relname = 'client_profiles'
    ) as notification_client_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'client_notifications' and c.contype = 'f' and r.relname = 'claims'
    ) as notification_claim_fk,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'client_notifications' and indexname = 'client_notifications_profile_read_created_idx'
    ) as notification_unread_index,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'client_notifications' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'dedupe_key'
    ) as notification_dedupe_unique,
    exists (
      select 1 from pg_indexes where schemaname = 'public' and tablename = 'client_notification_preferences' and indexname = 'client_notification_preferences_profile_category_channel_unique'
    ) as notification_preference_unique,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_users') as staff_users,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_audit_events') as staff_audit_events,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'staff_users' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'clerk_user_id'
    ) as staff_clerk_id_unique,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'staff_users' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'staff_reference'
    ) as staff_reference_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'staff_audit_events' and c.contype = 'f' and r.relname = 'staff_users'
    ) as audit_actor_fk,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'staff_users' and indexname = 'staff_users_status_role_idx') as staff_status_role_index,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'staff_audit_events' and indexname = 'staff_audit_events_created_idx') as audit_created_index,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_assignments') as claim_assignments,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_internal_notes') as claim_internal_notes,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claims' and column_name = 'operational_priority') as claims_operational_priority_column,
    exists (
      select 1 from pg_type t
      where t.typname = 'claim_operational_priority'
        and (select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
          = array['NORMAL', 'ELEVATED', 'HIGH']::text[]
    ) as claim_operational_priority_values,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_assignments' and c.contype = 'f' and r.relname = 'claims'
    ) as assignment_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_assignments' and c.contype = 'f' and r.relname = 'staff_users'
    ) as assignment_staff_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_internal_notes' and c.contype = 'f' and r.relname = 'claims'
    ) as note_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_internal_notes' and c.contype = 'f' and r.relname = 'staff_users'
    ) as note_author_fk,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_assignments' and indexname = 'claim_assignments_current_claim_unique') as current_assignment_unique,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_assignments' and indexname = 'claim_assignments_staff_current_idx') as assignment_staff_current_index,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_assignments' and indexname = 'claim_assignments_claim_history_idx') as assignment_history_index,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_internal_notes' and indexname = 'claim_internal_notes_claim_created_idx') as internal_notes_index,
    exists (
      select 1 from pg_type t
      where t.typname = 'staff_role'
        and (select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
          = array['SUPER_ADMIN', 'ADMIN', 'CASE_MANAGER', 'EVIDENCE_REVIEWER', 'SUPPORT', 'READ_ONLY']::text[]
    ) as staff_role_values,
    exists (
      select 1 from pg_type t
      where t.typname = 'staff_status'
        and (select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
          = array['ACTIVE', 'SUSPENDED']::text[]
    ) as staff_status_values,
    exists (
      select 1 from pg_type t
      where t.typname = 'staff_audit_action'
        and (select bool_and(e.enumlabel::text = any(array['CLAIM_STATUS_CHANGED', 'CLAIM_ARCHIVED', 'CLAIM_RESTORED', 'EVIDENCE_REQUESTED', 'EVIDENCE_STATUS_CHANGED', 'DOCUMENT_STATUS_CHANGED', 'CLIENT_PROFILE_UPDATED']::text[])) from pg_enum e where e.enumtypid = t.oid and e.enumlabel::text in ('CLAIM_STATUS_CHANGED', 'CLAIM_ARCHIVED', 'CLAIM_RESTORED', 'EVIDENCE_REQUESTED', 'EVIDENCE_STATUS_CHANGED', 'DOCUMENT_STATUS_CHANGED', 'CLIENT_PROFILE_UPDATED'))
    ) as workflow_audit_actions,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claim_action_requirements') as claim_action_requirements,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claim_action_requirements' and column_name = 'action_reference') as action_reference,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'claim_action_requirements' and column_name = 'client_request_id') as action_request_id,
    exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public' and tc.table_name = 'claim_action_requirements' and tc.constraint_type = 'UNIQUE' and kcu.column_name = 'action_reference'
    ) as action_reference_unique,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_action_requirements' and c.contype = 'f' and r.relname = 'claims'
    ) as action_claim_fk,
    exists (
      select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_class r on r.oid = c.confrelid
      where t.relname = 'claim_action_requirements' and c.contype = 'f' and r.relname = 'staff_users'
    ) as action_creator_fk,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'claim_action_requirements' and indexname = 'claim_action_requirements_claim_status_idx') as action_status_index,
    exists (
      select 1 from pg_type t
      where t.typname = 'claim_action_status'
        and (select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
          = array['OPEN', 'COMPLETED', 'CANCELLED']::text[]
    ) as action_status_values,
    (select count(*)::int from public.staff_users) as staff_record_count,
    (select count(*)::int from public.staff_audit_events where action = 'STAFF_BOOTSTRAPPED') as staff_bootstrap_audit_count,
    (select count(*)::int from drizzle.__drizzle_migrations) >= 17 as claim_migrations_recorded,
    (select count(*)::int from drizzle.__drizzle_migrations) as migration_count
`;

console.log(JSON.stringify(verification));

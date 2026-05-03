<?php
declare(strict_types=1);

function gest_role(): string
{
    $u = gest_user();
    return (string) ($u['role'] ?? '');
}

function gest_recovery_days(): int
{
    return match (gest_role()) {
        'admin'     => 180,
        'moderator' => 90,
        'agent'     => 30,
        default     => 0,
    };
}

function gest_can_view_users(): bool
{
    return in_array(gest_role(), ['admin', 'agent', 'moderator'], true);
}

function gest_can_silence_suspend_softdelete(): bool
{
    return in_array(gest_role(), ['admin', 'moderator'], true);
}

function gest_can_hard_delete(): bool
{
    return gest_role() === 'admin';
}

function gest_can_promote_meta_role(): bool
{
    return gest_role() === 'admin';
}

function gest_can_edit_notes(): bool
{
    return in_array(gest_role(), ['admin', 'moderator'], true);
}

function gest_can_force_logout(): bool
{
    return in_array(gest_role(), ['admin', 'agent', 'moderator'], true);
}

function gest_can_reset_php_sessions(): bool
{
    return in_array(gest_role(), ['admin', 'moderator'], true);
}

function gest_can_view_app_error_log(): bool
{
    return in_array(gest_role(), ['admin', 'moderator'], true);
}

function gest_can_export_activity_csv(): bool
{
    return in_array(gest_role(), ['admin', 'agent', 'moderator'], true);
}

function gest_can_view_full_audit(): bool
{
    return gest_role() === 'admin';
}

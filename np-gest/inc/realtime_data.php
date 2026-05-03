<?php
declare(strict_types=1);

/**
 * @return array{active_online: int, tickets_open: int, audit: list<array<string,mixed>>}
 */
function gest_realtime_dashboard(PDO $pdo): array
{
    $st = $pdo->query(
        "SELECT COUNT(*) FROM np_gest_user_meta
         WHERE status = 'active'
           AND last_seen IS NOT NULL
           AND last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
    );
    $activeOnline = (int) $st->fetchColumn();

    $auditSt = $pdo->query(
        'SELECT a.id, a.action, a.target_uid, a.created_at, a.details, u.username AS gest_username
         FROM np_gest_audit_log a
         LEFT JOIN np_gest_users u ON u.id = a.gest_user_id
         ORDER BY a.id DESC
         LIMIT 10'
    );
    $audit = $auditSt ? $auditSt->fetchAll(PDO::FETCH_ASSOC) : [];

    return [
        'active_online' => $activeOnline,
        'tickets_open'  => 0,
        'audit'         => $audit,
    ];
}

/**
 * Snapshot de estado para polling da lista de utilizadores (sem filtros de página).
 *
 * @return list<array{uid: string, status: string, last_seen: ?string, activity_label: string, is_online: bool}>
 */
function gest_realtime_users_status(PDO $pdo): array
{
    $sql = "
        SELECT x.uid,
            COALESCE(NULLIF(m.email, ''), '') AS email,
            COALESCE(NULLIF(m.display_name, ''), '') AS display_name,
            COALESCE(m.status, 'active') AS status,
            m.last_seen,
            COALESCE(
                m.last_seen,
                (SELECT MAX(i2.updated_at) FROM items i2
                 INNER JOIN categories c3 ON c3.id = i2.category_id WHERE c3.user_uid = x.uid)
            ) AS activity_at,
            CASE
                WHEN COALESCE(m.status, 'active') = 'active'
                 AND m.last_seen IS NOT NULL
                 AND m.last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1
                ELSE 0
            END AS is_online
        FROM (
            SELECT DISTINCT user_uid AS uid FROM categories
            UNION
            SELECT uid FROM np_gest_user_meta
        ) x
        LEFT JOIN np_gest_user_meta m ON m.uid = x.uid
    ";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    $out   = [];
    foreach ($rows as $r) {
        $ls = $r['last_seen'] ?? null;
        $act = $r['activity_at'] ?? null;
        $label = '—';
        if ($act !== null && $act !== '') {
            $label = substr((string) $act, 0, 16);
        } elseif ($ls !== null && $ls !== '') {
            $label = substr((string) $ls, 0, 16);
        }
        $out[] = [
            'uid'             => (string) $r['uid'],
            'email'           => (string) ($r['email'] ?? ''),
            'display_name'    => (string) ($r['display_name'] ?? ''),
            'status'          => (string) $r['status'],
            'last_seen'       => $ls !== null && $ls !== '' ? (string) $ls : null,
            'activity_label'  => $label,
            'is_online'       => ((int) ($r['is_online'] ?? 0)) === 1,
        ];
    }
    return $out;
}

/**
 * @return list<array<string,mixed>>
 */
function gest_realtime_audit_feed(PDO $pdo, int $limit = 10): array
{
    $limit = max(1, min(50, $limit));
    $st    = $pdo->query(
        "SELECT a.id, a.action, a.target_uid, a.created_at, a.details, u.username AS gest_username
         FROM np_gest_audit_log a
         LEFT JOIN np_gest_users u ON u.id = a.gest_user_id
         ORDER BY a.id DESC
         LIMIT {$limit}"
    );
    return $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
}

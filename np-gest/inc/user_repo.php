<?php
declare(strict_types=1);

/**
 * @return array{0: list<array<string,mixed>>, 1: int}
 */
function gest_users_list(PDO $pdo, array $q): array
{
    $page     = max(1, (int) ($q['page'] ?? 1));
    $perPage  = min(100, max(1, (int) ($q['per_page'] ?? 25)));
    $offset   = ($page - 1) * $perPage;
    $search   = trim((string) ($q['search'] ?? ''));
    $roleF    = trim((string) ($q['role'] ?? ''));
    $statusF  = trim((string) ($q['status'] ?? ''));
    $regFrom  = trim((string) ($q['reg_from'] ?? ''));
    $regTo    = trim((string) ($q['reg_to'] ?? ''));
    $actDays  = trim((string) ($q['active_within_days'] ?? ''));
    $sort     = trim((string) ($q['sort'] ?? 'reg_at'));
    $dir      = strtolower((string) ($q['dir'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';

    $sortMap = [
        'uid'          => 't.uid',
        'email'        => 't.email',
        'display_name' => 't.display_name',
        'app_role'     => 't.app_role',
        'status'       => 't.status',
        'reg_at'       => 't.reg_at',
        'last_act'     => 't.last_act',
        'item_count'   => 't.item_count',
    ];
    $orderCol = $sortMap[$sort] ?? 't.reg_at';

    $baseFrom = "
        FROM (
            SELECT DISTINCT user_uid AS uid FROM categories
            UNION
            SELECT uid FROM np_gest_user_meta
        ) x
        LEFT JOIN np_gest_user_meta m ON m.uid = x.uid
        LEFT JOIN (
            SELECT c.user_uid AS suid,
                COUNT(DISTINCT c.id) AS cat_count,
                COUNT(i.id) AS item_count,
                COUNT(DISTINCT CASE WHEN c.template_type = 'notebooks' THEN c.id END) AS notebook_count,
                SUM(COALESCE(CHAR_LENGTH(i.content), 0)) AS item_bytes
            FROM categories c
            LEFT JOIN items i ON i.category_id = c.id
            GROUP BY c.user_uid
        ) s ON s.suid = x.uid
    ";

    $selectInner = "
        SELECT x.uid,
            COALESCE(NULLIF(m.email, ''), '') AS email,
            COALESCE(NULLIF(m.display_name, ''), '') AS display_name,
            COALESCE(m.role, 'user') AS app_role,
            COALESCE(m.status, 'active') AS status,
            m.deleted_at,
            m.silenced_until,
            m.suspension_end,
            m.last_seen,
            COALESCE(s.cat_count, 0) AS cat_count,
            COALESCE(s.item_count, 0) AS item_count,
            COALESCE(s.notebook_count, 0) AS notebook_count,
            COALESCE(s.item_bytes, 0) AS item_bytes,
            COALESCE(m.created_at, (SELECT MIN(c2.created_at) FROM categories c2 WHERE c2.user_uid = x.uid)) AS reg_at,
            COALESCE(
                m.last_seen,
                (SELECT MAX(i2.updated_at) FROM items i2
                 INNER JOIN categories c3 ON c3.id = i2.category_id WHERE c3.user_uid = x.uid)
            ) AS last_act
        $baseFrom
    ";

    $where  = [];
    $params = [];

    if ($search !== '') {
        $where[] = '(t.uid LIKE ? OR t.email LIKE ? OR t.display_name LIKE ?)';
        $like    = '%' . $search . '%';
        array_push($params, $like, $like, $like);
    }
    if ($roleF !== '' && in_array($roleF, ['user', 'vip', 'support'], true)) {
        $where[] = 't.app_role = ?';
        $params[] = $roleF;
    }
    if ($statusF !== '' && in_array($statusF, ['active', 'silenced', 'suspended', 'deleted'], true)) {
        $where[] = 't.status = ?';
        $params[] = $statusF;
    }
    if ($regFrom !== '') {
        $where[] = 'DATE(t.reg_at) >= ?';
        $params[] = $regFrom;
    }
    if ($regTo !== '') {
        $where[] = 'DATE(t.reg_at) <= ?';
        $params[] = $regTo;
    }
    if ($actDays !== '' && ctype_digit($actDays)) {
        $d = (int) $actDays;
        if ($d > 0) {
            $where[] = '(t.last_act IS NOT NULL AND t.last_act >= DATE_SUB(NOW(), INTERVAL ? DAY))';
            $params[] = $d;
        }
    }

    $whereSql = $where === [] ? '1=1' : implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM ($selectInner) t WHERE $whereSql";
    $st       = $pdo->prepare($countSql);
    $st->execute($params);
    $total = (int) $st->fetchColumn();

    $listSql = "SELECT t.* FROM ($selectInner) t WHERE $whereSql ORDER BY $orderCol $dir LIMIT $perPage OFFSET $offset";
    $st2     = $pdo->prepare($listSql);
    $st2->execute($params);
    $rows = $st2->fetchAll(PDO::FETCH_ASSOC);

    return [$rows, $total];
}

function gest_user_get_meta(PDO $pdo, string $uid): ?array
{
    $st = $pdo->prepare('SELECT * FROM np_gest_user_meta WHERE uid = ? LIMIT 1');
    $st->execute([$uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
}

/**
 * @return array<string, mixed>
 */
function gest_user_stats(PDO $pdo, string $uid): array
{
    $st = $pdo->prepare(
        'SELECT COUNT(DISTINCT c.id) AS categories,
            COUNT(i.id) AS items,
            COUNT(DISTINCT CASE WHEN c.template_type = \'notebooks\' THEN c.id END) AS notebooks,
            SUM(COALESCE(CHAR_LENGTH(i.content), 0)) AS item_chars
         FROM categories c
         LEFT JOIN items i ON i.category_id = c.id
         WHERE c.user_uid = ?'
    );
    $st->execute([$uid]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: [];

    $st2 = $pdo->prepare(
        'SELECT COUNT(*) FROM note_versions nv
         INNER JOIN items i ON i.id = nv.item_id
         INNER JOIN categories c ON c.id = i.category_id
         WHERE c.user_uid = ?'
    );
    $st2->execute([$uid]);
    $versions = (int) $st2->fetchColumn();

    $st3 = $pdo->prepare(
        'SELECT COALESCE(SUM(CHAR_LENGTH(nv.content)), 0) FROM note_versions nv
         INNER JOIN items i ON i.id = nv.item_id
         INNER JOIN categories c ON c.id = i.category_id
         WHERE c.user_uid = ?'
    );
    $st3->execute([$uid]);
    $verChars = (int) $st3->fetchColumn();

    $bytes = (int) ($row['item_chars'] ?? 0) + $verChars;

    return [
        'categories' => (int) ($row['categories'] ?? 0),
        'items'      => (int) ($row['items'] ?? 0),
        'notebooks'  => (int) ($row['notebooks'] ?? 0),
        'versions'   => $versions,
        'bytes_est'  => $bytes,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function gest_user_categories_with_counts(PDO $pdo, string $uid): array
{
    $sql = 'SELECT c.id, c.name, c.template_type, c.created_at, c.updated_at,
            COUNT(i.id) AS item_count
            FROM categories c
            LEFT JOIN items i ON i.category_id = c.id
            WHERE c.user_uid = ?
            GROUP BY c.id, c.name, c.template_type, c.created_at, c.updated_at
            ORDER BY c.updated_at DESC';
    $st = $pdo->prepare($sql);
    $st->execute([$uid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * @return list<array<string, mixed>>
 */
function gest_user_audit_for_target(PDO $pdo, string $uid, int $limit = 50): array
{
    $st = $pdo->prepare(
        'SELECT a.id, a.gest_user_id, a.action, a.target_uid, a.details, a.created_at,
                u.username AS gest_username
         FROM np_gest_audit_log a
         LEFT JOIN np_gest_users u ON u.id = a.gest_user_id
         WHERE a.target_uid = ?
         ORDER BY a.id DESC
         LIMIT ' . (int) $limit
    );
    $st->execute([$uid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * @return list<array<string, mixed>>
 */
function gest_user_login_log(PDO $pdo, string $uid, int $limit = 100): array
{
    $st = $pdo->prepare(
        'SELECT id, success, ip, user_agent, created_at FROM np_gest_user_login_log
         WHERE uid = ? ORDER BY id DESC LIMIT ' . (int) $limit
    );
    $st->execute([$uid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * @return list<array<string, mixed>>
 */
function gest_user_activity(PDO $pdo, string $uid, int $limit = 100): array
{
    $st = $pdo->prepare(
        'SELECT id, action, target_type, target_id, ip, user_agent, created_at
         FROM np_gest_activity_log WHERE uid = ? ORDER BY id DESC LIMIT ' . (int) $limit
    );
    $st->execute([$uid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Sessões PHP da app (NEATPAD_SID): heurística por uid na serialização.
 *
 * @return list<array<string, mixed>>
 */
function gest_user_php_sessions(PDO $pdo, string $uid, int $limit = 50): array
{
    $gc = (int) (getenv('SESSION_MAX_LIFETIME') ?: 604800);
    $st = $pdo->prepare(
        'SELECT id, last_activity FROM php_sessions
         WHERE data LIKE ? AND last_activity > ?
         ORDER BY last_activity DESC
         LIMIT ' . (int) $limit
    );
    $needle = '%' . $uid . '%';
    $st->execute([$needle, time() - $gc]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

function gest_delete_php_sessions_for_uid(PDO $pdo, string $uid): int
{
    $st = $pdo->prepare('DELETE FROM php_sessions WHERE data LIKE ?');
    $st->execute(['%' . $uid . '%']);
    return $st->rowCount();
}

/**
 * @return list<array<string, mixed>>
 */
function gest_app_errors_by_uid(PDO $pdo, string $uid, int $limit = 50): array
{
    $st = $pdo->prepare(
        'SELECT id, uid, message, ip, created_at FROM np_gest_app_error_log
         WHERE uid = ? ORDER BY id DESC LIMIT ' . (int) $limit
    );
    $st->execute([$uid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * @return list<array<string, mixed>>
 */
function gest_app_errors_by_ip(PDO $pdo, string $ip, int $limit = 30): array
{
    $st = $pdo->prepare(
        'SELECT id, uid, message, ip, created_at FROM np_gest_app_error_log
         WHERE ip = ? ORDER BY id DESC LIMIT ' . (int) $limit
    );
    $st->execute([$ip]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * @return list<array<string, mixed>>
 */
function gest_audit_log_all(PDO $pdo, int $limit = 200): array
{
    $st = $pdo->query(
        'SELECT a.id, a.gest_user_id, a.action, a.target_uid, a.details, a.created_at, u.username AS gest_username
         FROM np_gest_audit_log a
         LEFT JOIN np_gest_users u ON u.id = a.gest_user_id
         ORDER BY a.id DESC
         LIMIT ' . (int) $limit
    );
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

function gest_upsert_user_meta_minimal(PDO $pdo, string $uid, string $email, string $displayName): void
{
    $st = $pdo->prepare(
        'INSERT INTO np_gest_user_meta (uid, email, display_name)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
            email = IF(VALUES(email) <> \'\', VALUES(email), email),
            display_name = IF(VALUES(display_name) <> \'\', VALUES(display_name), display_name)'
    );
    $st->execute([$uid, $email, $displayName]);
}

function gest_days_since_deleted(?string $deletedAt): ?int
{
    if ($deletedAt === null || $deletedAt === '') {
        return null;
    }
    $t = strtotime($deletedAt);
    if ($t === false) {
        return null;
    }
    return (int) floor((time() - $t) / 86400);
}

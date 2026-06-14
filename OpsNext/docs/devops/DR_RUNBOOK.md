# OpsNext CRM — Disaster Recovery Runbook

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** DevOps Lead  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Reference:** INFRASTRUCTURE_DESIGN.md  
**Traceability:** TASK-005

---

## RTO / RPO Targets

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single pod/node failure | < 2 min (auto-healing) | 0 (stateless pods) |
| RDS primary failure (Multi-AZ failover) | < 3 min | < 1 min (synchronous standby) |
| Full AZ outage | < 15 min | < 1 min |
| Accidental data deletion (single tenant) | < 4 hours | 24 hours (daily snapshot) |
| Full region outage (disaster) | < 4 hours | 1 hour (WAL streaming) |
| Database corruption | < 4 hours | 24 hours |

---

## 1. Backup Strategy

### 1.1 PostgreSQL RDS Backups

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Automated RDS snapshots | Daily (02:00 UTC) | 30 days (staging: 7 days) | Same region, cross-AZ |
| Manual snapshots before migration | On-demand | 90 days | Same region |
| WAL streaming (continuous) | Continuous | 7 days | S3: opsnext-wal-{env} |
| Cross-region snapshot copy | Daily (automated Lambda) | 14 days | us-west-2 (prod only) |

**Point-in-time recovery (PITR):** RDS supports PITR to any second within the WAL retention window (7 days). This is the primary recovery tool for accidental data deletion.

### 1.2 Redis ElastiCache Backups

- **AOF (Append-Only File):** Enabled — every write operation logged for point-in-time recovery.
- **Daily snapshot** to S3 at 03:00 UTC; retained 7 days.
- Redis data is **cache only** (JWT deny-list, tenant slug cache, rate limit counters). Loss means:
  - Logged-out users can replay their access tokens until expiry (max 8h gap)
  - Tenant slug resolution falls back to PostgreSQL for up to 5 min
  - Both are acceptable for RPO purposes; Redis is rebuilt from source of truth automatically.

### 1.3 S3 Data

- Import files: **versioning enabled** on `opsnext-imports-prod`; accidental deletes recoverable via version restore.
- Attachment files: **versioning enabled** on `opsnext-attachments-prod`.
- Cross-region replication to `us-west-2` for prod buckets (S3 CRR, 15-min SLA).

---

## 2. Incident Response Runbooks

### 2.1 Pod / Node Failure (Automated)

No manual action required. Kubernetes HPA and ReplicaSet replace failed pods automatically.

**Alert:** PagerDuty fires if pod restart loop > 3 in 10 min.

**Investigate:**
```bash
kubectl logs deployment/api -n opsnext-prod --previous
kubectl describe pod <pod-name> -n opsnext-prod
kubectl get events -n opsnext-prod --sort-by='.lastTimestamp'
```

---

### 2.2 RDS Primary Failure (Multi-AZ Failover)

**Automatic:** AWS RDS automatically fails over to the standby replica in < 3 minutes. The JDBC endpoint DNS TTL is 5 seconds; HikariCP reconnects automatically.

**Manual verification:**
```bash
# Check RDS events in AWS Console or:
aws rds describe-events --source-type db-instance \
  --source-identifier opsnext-prod-postgres \
  --duration 60

# Check application connectivity:
kubectl exec -it deployment/api -n opsnext-prod -- \
  curl -s http://localhost:3001/api/v1/health
```

**Expected downtime:** 1-3 minutes. In-flight requests fail; clients should retry with exponential backoff.

---

### 2.3 Accidental Data Deletion (Single Tenant)

**Scope:** A tenant admin or a bug causes contacts/accounts/leads to be soft-deleted or hard-deleted incorrectly.

**Step 1 — Assess scope**
```sql
-- Connect to postgres as opsnext_dba
\c opsnext

-- Set schema to affected tenant
SET search_path TO tenant_acme;

-- Check soft-deleted records
SELECT COUNT(*), MAX(deleted_at) FROM contacts WHERE deleted_at IS NOT NULL;

-- Check audit log for deletion events
SELECT * FROM audit_logs
WHERE action = 'DELETE'
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
```

**Step 2 — If soft-deleted (recoverable immediately)**
```sql
-- Undelete (set deleted_at = NULL)
UPDATE contacts SET deleted_at = NULL WHERE deleted_at > '2026-06-14 10:00:00+00';
```

**Step 3 — If hard-deleted (requires backup restore)**
1. Identify exact deletion timestamp from audit logs
2. Create a new RDS instance from PITR to 5 minutes before deletion:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier opsnext-prod-postgres \
     --target-db-instance-identifier opsnext-prod-recovery \
     --restore-time "2026-06-14T09:55:00Z"
   ```
3. Extract affected tenant schema from recovery instance
4. Copy deleted rows back to production instance
5. Terminate recovery instance

**Step 4 — Post-incident**
- Notify affected tenant (within 24h)
- Document in incident report
- Review whether hard-delete should be disabled

---

### 2.4 Database Performance Degradation

**Symptoms:** API P99 latency > 2s; Grafana shows DB query time spike.

**Investigation:**
```sql
-- Top slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Active connections
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Long-running queries
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Kill long-running query (if safe)
SELECT pg_terminate_backend(pid) WHERE pid = <pid>;

-- Bloat check
SELECT schemaname, tablename, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Run VACUUM if bloat found
VACUUM ANALYZE tenant_acme.contacts;
```

**Resolution options:**
1. Kill blocking queries
2. Run VACUUM ANALYZE on bloated tables
3. Scale up RDS instance class (vertical, < 5 min for Multi-AZ)
4. Add covering index for the identified slow query

---

### 2.5 Redis Cache Failure

**Impact:** JWT deny-list unavailable (logged-out tokens could be replayed for up to 8h), tenant slug cache cold (extra DB lookups), rate limit counters reset.

**Step 1 — Verify failure**
```bash
kubectl exec -it deployment/api -n opsnext-prod -- \
  redis-cli -h $REDIS_HOST ping
```

**Step 2 — Check ElastiCache status**
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id opsnext-prod-redis \
  --show-cache-node-info
```

**Step 3 — Application fallback**  
`JwtService` will log `WARN: Redis unavailable, deny-list check skipped`. The application remains functional but with degraded security posture (8h window for token replay). This is acceptable per the RPO.

**Step 4 — Restart Redis or trigger failover**
```bash
aws elasticache reboot-cache-cluster \
  --cache-cluster-id opsnext-prod-redis \
  --cache-node-ids-to-reboot 0001
```

**Step 5 — Post-recovery**  
Redis deny-list and cache rebuild automatically from the next requests. No manual warm-up needed.

---

### 2.6 Full Region Outage (Disaster)

**Scenario:** us-east-1 is unavailable. DR target: us-west-2.

**Prerequisites (must be pre-configured):**
- Cross-region RDS snapshot copy enabled (daily)
- S3 CRR enabled (attachments, imports → us-west-2)
- Terraform state exists for us-west-2 environment
- Cloudflare DNS A record pointing to us-east-1 ALB

**Recovery Steps:**

1. **Declare disaster** — confirm us-east-1 is not recovering within 30 minutes

2. **Restore RDS in us-west-2 from latest cross-region snapshot:**
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier opsnext-dr-postgres \
     --db-snapshot-identifier arn:aws:rds:us-west-2:ACCT:snapshot:opsnext-prod-2026-06-14 \
     --db-instance-class db.r6g.xlarge \
     --region us-west-2
   ```

3. **Provision EKS cluster in us-west-2** (use existing Terraform):
   ```bash
   cd infra/terraform/envs/dr
   terraform apply -target=module.eks -target=module.elasticache
   ```

4. **Deploy application to DR EKS cluster:**
   ```bash
   kubectl apply -k infra/k8s/overlays/dr/
   ```
   Update image tags to last known-good tag from ECR (cross-region replicated).

5. **Update Cloudflare DNS:**
   ```bash
   # Update A record for api.opsnext.io and app.opsnext.io to DR ALB IP
   # TTL was set to 60s — change propagates in < 1 min
   cf dns update opsnext.io api <DR-ALB-IP> --ttl 60
   ```

6. **Verify:**
   ```bash
   curl https://api.opsnext.io/health
   curl https://api.opsnext.io/api/v1/health
   ```

7. **Notify customers** (within 1 hour of failover completion)

**RPO impact:** Up to 24 hours of data loss (gap between last snapshot and failure). WAL streaming to us-west-2 (planned Phase 17) will reduce this to < 1 hour.

---

## 3. Runbook: Database Schema Migration Rollback

If a Flyway migration (platform schema) causes a problem:

**Assessment:**
```bash
kubectl logs deployment/api -n opsnext-prod | grep "Flyway"
```

Flyway migrations are **never automatically reversible**. Rollback strategy:

1. **For additive changes (new column, new table):** Simply deploy the previous image tag — the new column/table is ignored by the old code.
   ```bash
   kubectl set image deployment/api api=opsnext/api:sha-<previous> -n opsnext-prod
   ```

2. **For breaking changes (column rename, table drop):** Restore from RDS snapshot taken before the deployment (always take a manual snapshot before running breaking migrations).

3. **For data corruption:** Use PITR (see 2.3 above).

---

## 4. Contacts & Escalation

| Role | Primary | Backup |
|------|---------|--------|
| On-call DevOps | PagerDuty rotation | — |
| DB Admin (DBA) | — | — |
| Security Lead | — | — |
| CTO | — | — |

*Contact details maintained in PagerDuty service directory and team password manager vault.*

---

## 5. DR Testing Schedule

| Test | Frequency | Last Tested | Next Test |
|------|-----------|-------------|-----------|
| RDS failover (Multi-AZ) | Quarterly | — | Q3 2026 |
| Redis failure simulation | Monthly | — | 2026-07-01 |
| Full region DR | Annually | — | 2027-01 |
| PITR data recovery | Quarterly | — | Q3 2026 |
| Backup restore validation | Monthly | — | 2026-07-01 |

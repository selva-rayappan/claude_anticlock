# ADR-004 — Background Jobs: Spring Batch + @Scheduled vs BullMQ

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect  
**Depends On:** ADR-001 (Java runtime)

---

## Context

OpsNext requires a background job system for:
- Import processing (CSV/XLSX up to 50 MB, 100K+ rows)
- Search index synchronisation (Typesense upsert on entity change)
- Workflow execution (trigger evaluation and action dispatch)
- Notification dispatch (in-app + email)
- Scheduled reports (daily/weekly/monthly delivery)
- Data retention jobs (monthly archive)
- Segment count refresh (every 10 minutes)
- Lead scoring recalculation

The original plan used BullMQ (Redis-backed, Node.js). With a Java backend, the primary options are Spring Batch and Spring's `@Scheduled` annotation.

---

## Decision

**Use Spring Batch for heavy processing jobs + Spring `@Scheduled` for lightweight periodic tasks.**

- **Spring Batch** (`apps/worker`): import processing, data migration, bulk export generation, search index backfill — any job processing > 1,000 rows or taking > 30 seconds
- **Spring `@Scheduled`**: segment count refresh, stale deal detection, metrics aggregation, lightweight cron tasks
- **Redis Pub/Sub** (Lettuce): event notification from API server to worker service (replaces BullMQ queue signalling)
- **Spring ApplicationEvents**: within-process event propagation for search sync triggered by entity mutations

---

## Consequences

**Positive:**
- Spring Batch is the gold standard for Java batch processing: chunk-oriented processing, step restart, skip/retry policies, job repository for audit trail
- `@Scheduled` with cron expressions (`@Scheduled(cron = "0 */10 * * * *")`) is the simplest possible implementation for periodic tasks
- No separate job queue process to operate: worker service is a standard Spring Boot application
- Spring Batch's `ItemReader` / `ItemProcessor` / `ItemWriter` pattern enforces clean separation; import logic is testable in isolation
- Job restart from last checkpoint on pod failure (Spring Batch stores step execution state in DB)

**Negative:**
- No priority queues: Spring Batch doesn't support job priority natively (all jobs compete equally); high-priority notification jobs can't preempt a long-running import
- No job delay: scheduling a notification 30 minutes in the future requires a separate `TaskScheduler` with `ScheduledFuture`; BullMQ has this built in
- Spring Batch has significant setup boilerplate for simple jobs that don't need checkpoint restart

**Mitigations:**
- Priority mitigation: separate `@Async` thread pools with dedicated executor sizes for notification dispatch (small, fast pool) vs import processing (large, slow pool)
- Delay mitigation: `TaskScheduler.schedule(runnable, triggerTime)` for task reminders and workflow date triggers

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| BullMQ (Node.js worker process) | Requires a separate Node.js worker container; increases operational complexity; can't share Java service classes |
| Quartz Scheduler | More powerful than @Scheduled but adds significant configuration overhead; Spring Batch + @Scheduled covers all use cases |
| AWS SQS | Adds external dependency; lacks job progress tracking, priority, and delay with millisecond precision needed for task reminders |
| Temporal | Best-in-class for complex long-running workflows but requires separate Temporal server ($$$, ops complexity); overkill for linear action sequences |

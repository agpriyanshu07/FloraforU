-- Lets a password change revoke every open admin session.
ALTER TABLE "AdminUser" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Shared rate-limit counters (previously in per-instance memory).
CREATE TABLE "RateLimitHit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitHit_resetAt_idx" ON "RateLimitHit"("resetAt");

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "role" TEXT,
    "city" TEXT,
    "state" TEXT,
    "enrichmentJson" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'new',
    "lastTouchAt" TIMESTAMP(3),
    "replyReceived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_productId_status_idx" ON "Lead"("productId", "status");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_productId_sourceUrl_key" ON "Lead"("productId", "sourceUrl");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ScoutJob" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ghostcrewJobId" TEXT,
    "targetType" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT,
    "limitCount" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScoutJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoutJob_productId_status_idx" ON "ScoutJob"("productId", "status");

-- CreateIndex
CREATE INDEX "ScoutJob_createdAt_idx" ON "ScoutJob"("createdAt");

-- AddForeignKey
ALTER TABLE "ScoutJob" ADD CONSTRAINT "ScoutJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

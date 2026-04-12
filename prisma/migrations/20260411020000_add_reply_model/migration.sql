-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "draftBody" TEXT NOT NULL DEFAULT '',
    "draftVersions" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending_draft',
    "platform" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reply_signalId_key" ON "Reply"("signalId");

-- CreateIndex
CREATE INDEX "Reply_productId_status_idx" ON "Reply"("productId", "status");

-- CreateIndex
CREATE INDEX "Reply_status_idx" ON "Reply"("status");

-- CreateIndex
CREATE INDEX "Reply_createdAt_idx" ON "Reply"("createdAt");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

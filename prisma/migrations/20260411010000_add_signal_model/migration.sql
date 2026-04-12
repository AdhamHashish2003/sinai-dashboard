-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_productId_score_idx" ON "Signal"("productId", "score");

-- CreateIndex
CREATE INDEX "Signal_status_idx" ON "Signal"("status");

-- CreateIndex
CREATE INDEX "Signal_createdAt_idx" ON "Signal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_productId_sourceUrl_key" ON "Signal"("productId", "sourceUrl");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

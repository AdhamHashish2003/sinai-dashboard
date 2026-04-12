-- CreateTable
CREATE TABLE "ProofPost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "generatedBody" TEXT NOT NULL,
    "generatedAssets" JSONB NOT NULL DEFAULT '[]',
    "targetPlatforms" JSONB NOT NULL DEFAULT '[]',
    "postedPlatforms" JSONB NOT NULL DEFAULT '[]',
    "draftVersions" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "postedEngagement" INTEGER,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofPost_productId_status_idx" ON "ProofPost"("productId", "status");

-- CreateIndex
CREATE INDEX "ProofPost_productId_postType_createdAt_idx" ON "ProofPost"("productId", "postType", "createdAt");

-- CreateIndex
CREATE INDEX "ProofPost_status_idx" ON "ProofPost"("status");

-- CreateIndex
CREATE INDEX "ProofPost_createdAt_idx" ON "ProofPost"("createdAt");

-- AddForeignKey
ALTER TABLE "ProofPost" ADD CONSTRAINT "ProofPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

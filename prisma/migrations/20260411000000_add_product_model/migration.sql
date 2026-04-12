-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "icp" TEXT,
    "targetKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetSubreddits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "valueProp" TEXT,
    "freeTierHook" TEXT,
    "prodUrl" TEXT,
    "anthropicKey" TEXT,
    "groqKey" TEXT,
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

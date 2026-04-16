-- AlterTable
ALTER TABLE "Product" ADD COLUMN "scoutState" TEXT,
ADD COLUMN "scoutCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "scoutQueries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contentPostTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contentTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "launchedAt" TIMESTAMP(3),
ADD COLUMN "launchSeed" TEXT,
ADD COLUMN "launchModel" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SaasProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaasProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasMetric" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mrrCents" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "churnRate" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMetric" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "followersChange" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordRanking" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prevPosition" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "productId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalViews" INTEGER NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSource" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL,

    CONSTRAINT "TrafficSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "domainAuthority" INTEGER NOT NULL,
    "indexedPages" INTEGER NOT NULL,
    "topLandingPage" TEXT NOT NULL,
    "topLandingViews" INTEGER NOT NULL,

    CONSTRAINT "SeoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "revenueCents" INTEGER NOT NULL,
    "aovCents" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revenueCents" INTEGER NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visitors" INTEGER NOT NULL,
    "addToCart" INTEGER NOT NULL,
    "checkout" INTEGER NOT NULL,
    "purchase" INTEGER NOT NULL,

    CONSTRAINT "FunnelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dataSource" TEXT NOT NULL DEFAULT 'manual',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "refreshIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionMetric" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConnectionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebMetric" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSessionDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topPages" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "WebMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetLayout" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "WidgetLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "SaasProduct_slug_key" ON "SaasProduct"("slug");

-- CreateIndex
CREATE INDEX "SaasMetric_productId_recordedAt_idx" ON "SaasMetric"("productId", "recordedAt");

-- CreateIndex
CREATE INDEX "SaasMetric_recordedAt_idx" ON "SaasMetric"("recordedAt");

-- CreateIndex
CREATE INDEX "SocialMetric_accountId_recordedAt_idx" ON "SocialMetric"("accountId", "recordedAt");

-- CreateIndex
CREATE INDEX "SocialMetric_recordedAt_idx" ON "SocialMetric"("recordedAt");

-- CreateIndex
CREATE INDEX "ContentPost_scheduledAt_idx" ON "ContentPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentPost_status_idx" ON "ContentPost"("status");

-- CreateIndex
CREATE INDEX "KeywordRanking_recordedAt_idx" ON "KeywordRanking"("recordedAt");

-- CreateIndex
CREATE INDEX "KeywordRanking_keyword_idx" ON "KeywordRanking"("keyword");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_idx" ON "WebhookEvent"("source");

-- CreateIndex
CREATE INDEX "PageView_date_idx" ON "PageView"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_date_key" ON "PageView"("date");

-- CreateIndex
CREATE INDEX "TrafficSource_date_idx" ON "TrafficSource"("date");

-- CreateIndex
CREATE INDEX "TrafficSource_source_idx" ON "TrafficSource"("source");

-- CreateIndex
CREATE INDEX "SeoSnapshot_date_idx" ON "SeoSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSnapshot_date_key" ON "SeoSnapshot"("date");

-- CreateIndex
CREATE INDEX "SalesOrder_date_idx" ON "SalesOrder"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_date_key" ON "SalesOrder"("date");

-- CreateIndex
CREATE INDEX "TopProduct_recordedAt_idx" ON "TopProduct"("recordedAt");

-- CreateIndex
CREATE INDEX "TopProduct_revenueCents_idx" ON "TopProduct"("revenueCents");

-- CreateIndex
CREATE INDEX "FunnelSnapshot_date_idx" ON "FunnelSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelSnapshot_date_key" ON "FunnelSnapshot"("date");

-- CreateIndex
CREATE INDEX "Connection_status_idx" ON "Connection"("status");

-- CreateIndex
CREATE INDEX "Connection_type_idx" ON "Connection"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_platform_username_key" ON "Connection"("platform", "username");

-- CreateIndex
CREATE INDEX "ConnectionMetric_connectionId_date_idx" ON "ConnectionMetric"("connectionId", "date");

-- CreateIndex
CREATE INDEX "ConnectionMetric_date_idx" ON "ConnectionMetric"("date");

-- CreateIndex
CREATE INDEX "WebMetric_connectionId_date_idx" ON "WebMetric"("connectionId", "date");

-- CreateIndex
CREATE INDEX "WebMetric_date_idx" ON "WebMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetLayout_widgetId_key" ON "WidgetLayout"("widgetId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasMetric" ADD CONSTRAINT "SaasMetric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SaasProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMetric" ADD CONSTRAINT "SocialMetric_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SaasProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionMetric" ADD CONSTRAINT "ConnectionMetric_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebMetric" ADD CONSTRAINT "WebMetric_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


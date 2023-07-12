-- CreateTable
CREATE TABLE "mostRecentIncludedTips" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "roundId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mostRecentIncludedTipTimestamp" INTEGER NOT NULL,
    "chainId" "ChainId" NOT NULL,

    CONSTRAINT "mostRecentIncludedTips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mostRecentIncludedTips_projectId_userId_roundId_chainId_key" ON "mostRecentIncludedTips"("projectId", "userId", "roundId", "chainId");

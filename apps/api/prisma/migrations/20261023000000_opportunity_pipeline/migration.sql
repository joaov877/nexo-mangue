-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('CONNECTION', 'FIRST_CONTACT', 'MEETING', 'EVALUATION', 'NEGOTIATION', 'TERM_SHEET', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'CONNECTION',
    "nextStep" TEXT,
    "expectedValue" INTEGER,
    "targetDate" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "counterpartId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Opportunity_creatorId_updatedAt_idx" ON "Opportunity"("creatorId", "updatedAt");
CREATE INDEX "Opportunity_counterpartId_updatedAt_idx" ON "Opportunity"("counterpartId", "updatedAt");
CREATE INDEX "OpportunityEvent_opportunityId_createdAt_idx" ON "OpportunityEvent"("opportunityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_counterpartId_fkey" FOREIGN KEY ("counterpartId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

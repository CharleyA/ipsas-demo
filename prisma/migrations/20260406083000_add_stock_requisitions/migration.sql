-- Create missing stock requisitions tables for inventory request workflow
CREATE TABLE IF NOT EXISTS "stock_requisitions" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "reqNumber" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "department" TEXT,
  "requestDate" DATE NOT NULL,
  "requiredDate" DATE,
  "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_requisitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_requisitions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "stock_requisition_lines" (
  "id" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "qtyRequested" DECIMAL(18,4) NOT NULL,
  "qtyIssued" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "stock_requisition_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_requisition_lines_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "stock_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_requisition_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_requisitions_organisationId_reqNumber_key"
  ON "stock_requisitions"("organisationId", "reqNumber");

CREATE INDEX IF NOT EXISTS "stock_requisition_lines_requisitionId_idx"
  ON "stock_requisition_lines"("requisitionId");

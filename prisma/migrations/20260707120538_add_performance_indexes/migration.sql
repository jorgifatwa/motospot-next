-- CreateIndex
CREATE INDEX "Motorcycle_deletedAt_idx" ON "Motorcycle"("deletedAt");

-- CreateIndex
CREATE INDEX "Motorcycle_branchId_deletedAt_idx" ON "Motorcycle"("branchId", "deletedAt");

-- CreateIndex
CREATE INDEX "Motorcycle_branchId_brandId_operationalStatus_salesStatus_d_idx" ON "Motorcycle"("branchId", "brandId", "operationalStatus", "salesStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");

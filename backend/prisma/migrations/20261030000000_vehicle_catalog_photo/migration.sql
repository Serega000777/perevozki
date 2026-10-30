-- AlterTable
ALTER TABLE "EquipmentVehicle" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "photoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EquipmentVehiclePhoto" (
    "vehicleId" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "EquipmentVehiclePhoto_pkey" PRIMARY KEY ("vehicleId")
);

-- AddForeignKey
ALTER TABLE "EquipmentVehiclePhoto" ADD CONSTRAINT "EquipmentVehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "EquipmentVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

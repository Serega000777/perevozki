-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentVehicle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentTrip" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "destination" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mileage" DECIMAL(12,2),
    "comment" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentExpenseCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentExpense" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentExpenseCategory_name_key" ON "EquipmentExpenseCategory"("name");

-- AddForeignKey
ALTER TABLE "EquipmentTrip" ADD CONSTRAINT "EquipmentTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "EquipmentVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentExpense" ADD CONSTRAINT "EquipmentExpense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "EquipmentVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentExpense" ADD CONSTRAINT "EquipmentExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Стандартные категории расходов техники (как в миграции Cement CRM 20260801000000_equipment_accounting)
INSERT INTO "EquipmentExpenseCategory" ("name") VALUES ('Топливо'), ('Ремонт'), ('Запчасти'), ('Зарплата'), ('Прочее');

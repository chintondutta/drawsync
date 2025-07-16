-- CreateTable
CREATE TABLE "RoomDrawing" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomDrawing_roomId_key" ON "RoomDrawing"("roomId");

-- AddForeignKey
ALTER TABLE "RoomDrawing" ADD CONSTRAINT "RoomDrawing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

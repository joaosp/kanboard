-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_labels" (
    "card_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_labels_pkey" PRIMARY KEY ("card_id","label_id")
);

-- CreateIndex
CREATE INDEX "idx_label_board" ON "labels"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_label_board_name" ON "labels"("board_id", "name");

-- CreateIndex
CREATE INDEX "idx_card_label_label" ON "card_labels"("label_id");

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_labels" ADD CONSTRAINT "card_labels_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_labels" ADD CONSTRAINT "card_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

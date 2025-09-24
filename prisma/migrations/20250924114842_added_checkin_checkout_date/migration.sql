/*
  Warnings:

  - Added the required column `check_in_date` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `check_out_date` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "check_in_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "check_out_date" TIMESTAMP(3) NOT NULL;

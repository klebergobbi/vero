import { IsString } from "class-validator";

export class CreateReceiptDto {
  @IsString()
  paymentId!: string;
}

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { KdsModule } from '../kds/kds.module.js';

@Module({
  imports: [InventoryModule, KdsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}


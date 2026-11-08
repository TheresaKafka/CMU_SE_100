import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { KdsModule } from '../kds/kds.module.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({
  imports: [InventoryModule, KdsModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

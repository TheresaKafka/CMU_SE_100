import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ShiftsModule } from './modules/shifts/shifts.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { AreasModule } from './modules/areas/areas.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { KdsModule } from './modules/kds/kds.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ShiftsModule,
    ProductsModule,
    OrdersModule,
    AreasModule,
    TablesModule,
    InventoryModule,
    KdsModule,
    PaymentsModule,
  ],
})
export class AppModule {}

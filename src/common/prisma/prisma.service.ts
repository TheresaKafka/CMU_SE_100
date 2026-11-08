import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../../../prisma/contract.d.js';
import contractJson from '../../../prisma/contract.json' with { type: 'json' };

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly contract = contractFromJson<Contract>(contractJson);
  public readonly db = postgres({
    contract: this.contract,
    url: process.env['DIRECT_URL'] || process.env['DATABASE_URL'] || '',
  });

  get orm() {
    return this.db.orm;
  }

  get sql() {
    return this.db.sql;
  }

  get transaction() {
    return this.db.transaction.bind(this.db);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Prisma 8 service initialized with PostgreSQL contract');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Prisma 8 connection pool');
    await this.db.close();
  }
}


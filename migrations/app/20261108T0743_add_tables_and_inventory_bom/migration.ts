#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1b00ef134fe231bda727e1380b4e98c1028549deaaf95742da321bdf3cadfd18/contract';
import startContract from '../../snapshots/1b00ef134fe231bda727e1380b4e98c1028549deaaf95742da321bdf3cadfd18/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e2fbb3f08638e4333962f37d55e8f1cc843a7e9051c3fb8c4b4ed6458298632b/contract';
import endContract from '../../snapshots/e2fbb3f08638e4333962f37d55e8f1cc843a7e9051c3fb8c4b4ed6458298632b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'areas',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sort_order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ingredients',
        columns: [
          col('cost_price', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('current_stock', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('safety_stock', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventory_logs',
        columns: [
          col('balance_after', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('change_amount', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ingredient_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reference_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'inventory_logs_type_check_a995561d',
            sql`"type" IN ('ORDER_USAGE', 'PURCHASE_RECEIPT', 'WASTE', 'ADJUSTMENT')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'modifier_recipe_items',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ingredient_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('option_value_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity_required', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'purchase_order_items',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ingredient_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('purchase_order_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('total_price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('unit_price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'purchase_orders',
        columns: [
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('supplier', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total_amount', 'numeric(10,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'purchase_orders_status_check_4a011375',
            sql`"status" IN ('DRAFT', 'COMPLETED', 'CANCELLED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'recipe_items',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ingredient_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('product_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity_required', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tables',
        columns: [
          col('area_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('capacity', 'int4', {
            notNull: true,
            default: lit(4),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('EMPTY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('table_number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'tables_status_check_65b89c03',
            sql`"status" IN ('EMPTY', 'OCCUPIED', 'RESERVED')`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('order_type', 'text', {
          notNull: true,
          default: lit('DINE_IN'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('table_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'areas',
        constraint: 'areas_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ingredients',
        constraint: 'ingredients_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'modifier_recipe_items',
        constraint: 'modifier_recipe_items_option_value_id_ingredient_id_key',
        columns: ['option_value_id', 'ingredient_id'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orders',
        constraint: 'orders_order_type_check_e388a763',
        expression: sql`"order_type" IN ('DINE_IN', 'TAKE_AWAY')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'recipe_items',
        constraint: 'recipe_items_product_id_ingredient_id_key',
        columns: ['product_id', 'ingredient_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tables',
        constraint: 'tables_area_id_table_number_key',
        columns: ['area_id', 'table_number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventory_logs',
        index: 'inventory_logs_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'modifier_recipe_items',
        index: 'modifier_recipe_items_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'modifier_recipe_items',
        index: 'modifier_recipe_items_option_value_id_idx_46da301b',
        columns: ['option_value_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_table_id_idx_e8cf40d6',
        columns: ['table_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase_order_items',
        index: 'purchase_order_items_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase_order_items',
        index: 'purchase_order_items_purchase_order_id_idx_a047588b',
        columns: ['purchase_order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipe_items',
        index: 'recipe_items_ingredient_id_idx_30032a11',
        columns: ['ingredient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipe_items',
        index: 'recipe_items_product_id_idx_22a2b7d2',
        columns: ['product_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tables',
        index: 'tables_area_id_idx_106c7330',
        columns: ['area_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventory_logs',
        foreignKey: {
          name: 'inventory_logs_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredients', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'modifier_recipe_items',
        foreignKey: {
          name: 'modifier_recipe_items_option_value_id_fkey',
          columns: ['option_value_id'],
          references: { schema: 'public', table: 'product_option_values', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'modifier_recipe_items',
        foreignKey: {
          name: 'modifier_recipe_items_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredients', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase_order_items',
        foreignKey: {
          name: 'purchase_order_items_purchase_order_id_fkey',
          columns: ['purchase_order_id'],
          references: { schema: 'public', table: 'purchase_orders', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase_order_items',
        foreignKey: {
          name: 'purchase_order_items_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredients', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recipe_items',
        foreignKey: {
          name: 'recipe_items_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recipe_items',
        foreignKey: {
          name: 'recipe_items_ingredient_id_fkey',
          columns: ['ingredient_id'],
          references: { schema: 'public', table: 'ingredients', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tables',
        foreignKey: {
          name: 'tables_area_id_fkey',
          columns: ['area_id'],
          references: { schema: 'public', table: 'areas', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orders',
        foreignKey: {
          name: 'orders_table_id_fkey',
          columns: ['table_id'],
          references: { schema: 'public', table: 'tables', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

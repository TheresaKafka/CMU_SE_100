import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { SetRecipeDto } from './dto/set-recipe.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';

interface RequiredUsage {
  ingredientId: string;
  name: string;
  unit: string;
  currentStock: number;
  totalRequired: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // INGREDIENTS (NGUYÊN VẬT LIỆU)
  // ===============================
  async getIngredients() {
    const ingredients = await this.prisma.orm.public.Ingredient
      .orderBy((i) => i.name.asc())
      .all();

    return ingredients.map((i) => {
      const current = Number(i.currentStock);
      const safety = Number(i.safetyStock);
      return {
        id: i.id,
        name: i.name,
        unit: i.unit,
        currentStock: current,
        safetyStock: safety,
        costPrice: Number(i.costPrice),
        isSafetyAlert: current <= safety,
        updatedAt: i.updatedAt,
      };
    });
  }

  async createIngredient(dto: CreateIngredientDto) {
    const existing = await this.prisma.orm.public.Ingredient
      .where({ name: dto.name })
      .first();

    if (existing) {
      throw new ConflictException(`Nguyên liệu "${dto.name}" đã tồn tại trong kho`);
    }

    const currentStockFormatted = (dto.currentStock ?? 0).toFixed(2);
    const safetyStockFormatted = (dto.safetyStock ?? 0).toFixed(2);
    const costPriceFormatted = (dto.costPrice ?? 0).toFixed(2);

    const ingredient = await this.prisma.orm.public.Ingredient.create({
      name: dto.name,
      unit: dto.unit,
      currentStock: currentStockFormatted,
      safetyStock: safetyStockFormatted,
      costPrice: costPriceFormatted,
    });

    return {
      message: 'Thêm nguyên vật liệu thành công',
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: Number(ingredient.currentStock),
        safetyStock: Number(ingredient.safetyStock),
        costPrice: Number(ingredient.costPrice),
      },
    };
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto) {
    const ingredient = await this.prisma.orm.public.Ingredient.where({ id }).first();
    if (!ingredient) {
      throw new NotFoundException('Không tìm thấy nguyên vật liệu');
    }

    const updates: {
      name?: string;
      unit?: string;
      safetyStock?: string;
      costPrice?: string;
    } = {};

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.safetyStock !== undefined) updates.safetyStock = dto.safetyStock.toFixed(2);
    if (dto.costPrice !== undefined) updates.costPrice = dto.costPrice.toFixed(2);

    await this.prisma.orm.public.Ingredient.where({ id }).update(updates);

    return {
      message: 'Cập nhật nguyên vật liệu thành công',
      ingredientId: id,
    };
  }

  // ===============================
  // CẢNH BÁO TỒN KHO AN TOÀN (INV-04)
  // ===============================
  async getSafetyAlerts() {
    const all = await this.prisma.orm.public.Ingredient.all();

    const alerts = all
      .map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        currentStock: Number(i.currentStock),
        safetyStock: Number(i.safetyStock),
      }))
      .filter((i) => i.currentStock <= i.safetyStock);

    return {
      totalAlerts: alerts.length,
      alerts,
    };
  }

  // ===============================
  // ĐỊNH MỨC CÔNG THỨC (RECIPE BOM - INV-02)
  // ===============================
  async setProductRecipe(dto: SetRecipeDto) {
    const product = await this.prisma.orm.public.Product.where({ id: dto.productId }).first();
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return this.prisma.transaction(async (tx) => {
      // Xóa các định mức cũ nếu có
      await tx.orm.public.RecipeItem
        .where({ productId: dto.productId })
        .delete();

      // Lưu các định mức mới
      for (const item of dto.items) {
        const ingredient = await tx.orm.public.Ingredient.where({ id: item.ingredientId }).first();
        if (!ingredient) {
          throw new NotFoundException(`Nguyên liệu có ID "${item.ingredientId}" không tồn tại`);
        }

        await tx.orm.public.RecipeItem.create({
          productId: dto.productId,
          ingredientId: item.ingredientId,
          quantityRequired: item.quantityRequired.toFixed(2),
        });
      }

      return {
        message: `Thiết lập định mức công thức BOM cho món "${product.name}" thành công`,
        productId: dto.productId,
        recipeCount: dto.items.length,
      };
    });
  }

  async getProductRecipe(productId: string) {
    const product = await this.prisma.orm.public.Product
      .where({ id: productId })
      .include('recipes', (recipes) => recipes.include('ingredient'))
      .first();

    if (!product) {
      throw new NotFoundException('Không tìm thấy món ăn/thức uống');
    }

    return {
      productId: product.id,
      productName: product.name,
      recipes: product.recipes.map((r) => ({
        id: r.id,
        ingredientId: r.ingredient.id,
        ingredientName: r.ingredient.name,
        unit: r.ingredient.unit,
        quantityRequired: Number(r.quantityRequired),
      })),
    };
  }

  // ===============================
  // NHẬP HÀNG & ĐIỀU CHỈNH TỒN KHO
  // ===============================
  async adjustStock(dto: StockAdjustmentDto) {
    return this.prisma.transaction(async (tx) => {
      const ingredient = await tx.orm.public.Ingredient.where({ id: dto.ingredientId }).first();
      if (!ingredient) {
        throw new NotFoundException('Không tìm thấy nguyên vật liệu');
      }

      const current = Number(ingredient.currentStock);
      const newBalance = current + dto.changeAmount;

      if (newBalance < 0) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ để trừ (Hiện có: ${current} ${ingredient.unit}, yêu cầu trừ: ${Math.abs(dto.changeAmount)} ${ingredient.unit})`,
        );
      }

      const newBalanceFormatted = newBalance.toFixed(2);
      const changeAmountFormatted = dto.changeAmount.toFixed(2);

      await tx.orm.public.Ingredient
        .where({ id: dto.ingredientId })
        .update({
          currentStock: newBalanceFormatted,
        });

      await tx.orm.public.InventoryLog.create({
        ingredientId: dto.ingredientId,
        changeAmount: changeAmountFormatted,
        balanceAfter: newBalanceFormatted,
        type: dto.type,
        reason: dto.reason ?? null,
      });

      return {
        message: 'Cập nhật biến động kho thành công',
        ingredientId: dto.ingredientId,
        ingredientName: ingredient.name,
        previousStock: current,
        changeAmount: dto.changeAmount,
        newStock: newBalance,
        unit: ingredient.unit,
      };
    });
  }

  // ===============================
  // TỰ ĐỘNG TRỪ KHO THEO BOM (INV-03)
  // Thực thi nghiêm ngặt trong Transaction của Order.
  // Đảm bảo ACID: Nếu bất kỳ nguyên liệu nào bị âm kho (hết hàng),
  // ném BadRequestException để rollback toàn bộ đơn hàng!
  // ===============================
  async deductInventoryForOrder(
    orderId: string,
    tx: Parameters<Parameters<PrismaService['transaction']>[0]>[0],
  ) {
    const order = await tx.orm.public.Order
      .where({ id: orderId })
      .include('items', (items) =>
        items
          .include('product')
          .include('modifiers', (mods) => mods.include('optionValue')),
      )
      .first();

    if (!order || order.items.length === 0) return;

    // 1. Gom toàn bộ nhu cầu tiêu hao nguyên vật liệu của cả đơn hàng
    const usageMap = new Map<string, RequiredUsage>();

    for (const item of order.items) {
      // 1.1. Công thức gốc của món (RecipeItem)
      const recipes = await tx.orm.public.RecipeItem
        .where({ productId: item.productId })
        .include('ingredient')
        .all();

      for (const recipe of recipes) {
        const required = Number(recipe.quantityRequired) * item.quantity;
        const currentStock = Number(recipe.ingredient.currentStock);
        const existing = usageMap.get(recipe.ingredientId);

        if (existing) {
          existing.totalRequired += required;
        } else {
          usageMap.set(recipe.ingredientId, {
            ingredientId: recipe.ingredientId,
            name: recipe.ingredient.name,
            unit: recipe.ingredient.unit,
            currentStock,
            totalRequired: required,
          });
        }
      }

      // 1.2. Định mức cộng thêm từ modifiers (ModifierRecipeItem nếu có)
      for (const mod of item.modifiers) {
        const modRecipes = await tx.orm.public.ModifierRecipeItem
          .where({ optionValueId: mod.optionValueId })
          .include('ingredient')
          .all();

        for (const modRecipe of modRecipes) {
          const required = Number(modRecipe.quantityRequired) * item.quantity;
          const currentStock = Number(modRecipe.ingredient.currentStock);
          const existing = usageMap.get(modRecipe.ingredientId);

          if (existing) {
            existing.totalRequired += required;
          } else {
            usageMap.set(modRecipe.ingredientId, {
              ingredientId: modRecipe.ingredientId,
              name: modRecipe.ingredient.name,
              unit: modRecipe.ingredient.unit,
              currentStock,
              totalRequired: required,
            });
          }
        }
      }
    }

    // 2. ACID Guard: Kiểm tra tồn kho trước khi thực hiện trừ.
    // Nếu có bất kỳ nguyên liệu nào không đủ, lập tức throw Exception để ROLLBACK toàn bộ transaction!
    for (const [, usage] of usageMap) {
      if (usage.totalRequired > usage.currentStock) {
        throw new BadRequestException(
          `Nguyên liệu "${usage.name}" không đủ tồn kho để thực hiện đơn hàng (Hiện còn: ${usage.currentStock} ${usage.unit}, Yêu cầu: ${usage.totalRequired} ${usage.unit}). Giao dịch tạo đơn bị hủy bỏ hoàn toàn.`,
        );
      }
    }

    // 3. Thực hiện trừ kho và ghi log kiểm toán (InventoryLog)
    for (const [, usage] of usageMap) {
      const newStock = usage.currentStock - usage.totalRequired;

      await tx.orm.public.Ingredient
        .where({ id: usage.ingredientId })
        .update({
          currentStock: newStock.toFixed(2),
        });

      await tx.orm.public.InventoryLog.create({
        ingredientId: usage.ingredientId,
        changeAmount: (-usage.totalRequired).toFixed(2),
        balanceAfter: newStock.toFixed(2),
        type: 'ORDER_USAGE',
        referenceId: order.id,
        reason: `Trừ kho tự động theo định mức BOM cho Đơn hàng #${order.id.slice(0, 8)}`,
      });
    }
  }
}

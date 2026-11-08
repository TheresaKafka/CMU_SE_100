import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // CATEGORIES
  // ===============================
  async getCategories() {
    const categories = await this.prisma.orm.public.Category
      .orderBy((c) => c.sortOrder.asc())
      .all();

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.orm.public.Category
        .where({ id: dto.parentId })
        .first();

      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha (parentId)');
      }
    }

    const category = await this.prisma.orm.public.Category.create({
      name: dto.name,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });

    return {
      message: 'Tạo danh mục thành công',
      category: {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
      },
    };
  }

  // ===============================
  // PRODUCTS & OPTIONS
  // ===============================
  async getProducts(query: QueryProductsDto) {
    let collection = this.prisma.orm.public.Product
      .include('category')
      .include('options', (opts) => opts.include('values'));

    if (query.categoryId) {
      collection = collection.where({ categoryId: query.categoryId });
    }

    if (query.isActive !== undefined) {
      collection = collection.where({ isActive: query.isActive });
    }

    const products = await collection.all();

    let filtered = products;
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      filtered = products.filter((p) => p.name.toLowerCase().includes(s));
    }

    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      basePrice: Number(p.basePrice),
      isActive: p.isActive,
      category: {
        id: p.category.id,
        name: p.category.name,
      },
      options: p.options.map((opt) => ({
        id: opt.id,
        optionName: opt.optionName,
        isRequired: opt.isRequired,
        maxChoices: opt.maxChoices,
        values: opt.values.map((v) => ({
          id: v.id,
          valueName: v.valueName,
          priceAdjustment: Number(v.priceAdjustment),
        })),
      })),
    }));
  }

  async getProductById(id: string) {
    const product = await this.prisma.orm.public.Product
      .where({ id })
      .include('category')
      .include('options', (opts) => opts.include('values'))
      .first();

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return {
      id: product.id,
      name: product.name,
      basePrice: Number(product.basePrice),
      isActive: product.isActive,
      category: {
        id: product.category.id,
        name: product.category.name,
      },
      options: product.options.map((opt) => ({
        id: opt.id,
        optionName: opt.optionName,
        isRequired: opt.isRequired,
        maxChoices: opt.maxChoices,
        values: opt.values.map((v) => ({
          id: v.id,
          valueName: v.valueName,
          priceAdjustment: Number(v.priceAdjustment),
        })),
      })),
    };
  }

  async createProduct(dto: CreateProductDto) {
    const category = await this.prisma.orm.public.Category
      .where({ id: dto.categoryId })
      .first();

    if (!category) {
      throw new BadRequestException('Mã danh mục (categoryId) không hợp lệ');
    }

    // Atomic transaction for Product + Options + Values
    return this.prisma.transaction(async (tx) => {
      const basePriceFormatted = dto.basePrice.toFixed(2);

      const product = await tx.orm.public.Product.create({
        categoryId: dto.categoryId,
        name: dto.name,
        basePrice: basePriceFormatted,
        isActive: dto.isActive ?? true,
      });

      if (dto.options && dto.options.length > 0) {
        for (const optDto of dto.options) {
          const option = await tx.orm.public.ProductOption.create({
            productId: product.id,
            optionName: optDto.optionName,
            isRequired: optDto.isRequired ?? false,
            maxChoices: optDto.maxChoices ?? 1,
          });

          for (const valDto of optDto.values) {
            const adjFormatted = (valDto.priceAdjustment ?? 0).toFixed(2);
            await tx.orm.public.ProductOptionValue.create({
              optionId: option.id,
              valueName: valDto.valueName,
              priceAdjustment: adjFormatted,
            });
          }
        }
      }

      return {
        message: 'Tạo sản phẩm và thiết lập tùy biến (modifiers) thành công',
        productId: product.id,
        name: product.name,
        basePrice: dto.basePrice,
      };
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.orm.public.Product.where({ id }).first();
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (dto.categoryId) {
      const category = await this.prisma.orm.public.Category.where({ id: dto.categoryId }).first();
      if (!category) {
        throw new BadRequestException('Mã danh mục không hợp lệ');
      }
    }

    const updates: {
      name?: string;
      basePrice?: string;
      categoryId?: string;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.basePrice !== undefined) updates.basePrice = dto.basePrice.toFixed(2);
    if (dto.categoryId !== undefined) updates.categoryId = dto.categoryId;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await this.prisma.orm.public.Product.where({ id }).update(updates);

    return {
      message: 'Cập nhật sản phẩm thành công',
      productId: id,
    };
  }

  async softDeleteProduct(id: string) {
    const product = await this.prisma.orm.public.Product.where({ id }).first();
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    await this.prisma.orm.public.Product.where({ id }).update({
      isActive: false,
    });

    return {
      message: 'Đã tạm ngưng kinh doanh sản phẩm (soft delete)',
      productId: id,
    };
  }
}


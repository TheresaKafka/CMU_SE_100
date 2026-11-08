import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Lấy cây danh mục sản phẩm (Công khai cho POS / Khách hàng)' })
  @ApiResponse({ status: 200, description: 'Danh sách các danh mục' })
  @Get()
  async getCategories() {
    return this.productsService.getCategories();
  }

  @ApiOperation({ summary: 'Tạo danh mục mới (Chỉ dành cho Admin & Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'Tạo danh mục thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền tạo danh mục' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }
}

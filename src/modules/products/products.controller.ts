import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Lấy danh sách món và các tùy chọn modifiers' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm' })
  @Get()
  async getProducts(@Query() query: QueryProductsDto) {
    return this.productsService.getProducts(query);
  }

  @ApiOperation({ summary: 'Xem chi tiết một sản phẩm kèm toàn bộ danh sách tùy biến' })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @ApiOperation({
    summary: 'Tạo sản phẩm mới kèm các nhóm Modifiers (DB Transaction - Quyền: Admin, Manager)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'Tạo sản phẩm thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền tạo sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin/giá sản phẩm (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, dto);
  }

  @ApiOperation({ summary: 'Tạm ngưng kinh doanh sản phẩm - Soft Delete (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Đã tạm ngưng kinh doanh món' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.softDeleteProduct(id);
  }
}

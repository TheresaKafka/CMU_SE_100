import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { SetRecipeDto } from './dto/set-recipe.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Inventory & BOM')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Lấy danh sách nguyên vật liệu và trạng thái tồn kho (INV-01)' })
  @ApiResponse({ status: 200, description: 'Danh sách nguyên vật liệu' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.BARISTA)
  @Get('ingredients')
  async getIngredients() {
    return this.inventoryService.getIngredients();
  }

  @ApiOperation({ summary: 'Thêm mới nguyên vật liệu vào danh mục kho (Quyền: Admin, Manager)' })
  @ApiResponse({ status: 201, description: 'Tạo nguyên liệu thành công' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('ingredients')
  async createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin/đơn giá nguyên vật liệu (Quyền: Admin, Manager)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('ingredients/:id')
  async updateIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  @ApiOperation({ summary: 'Cảnh báo tồn kho an toàn (INV-04 Safety Stock Alerts)' })
  @ApiResponse({ status: 200, description: 'Danh sách các nguyên liệu dưới ngưỡng an toàn' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('alerts')
  async getSafetyAlerts() {
    return this.inventoryService.getSafetyAlerts();
  }

  @ApiOperation({
    summary: 'Thiết lập định mức công thức BOM cho món ăn/thức uống (INV-02 - Quyền: Admin, Manager)',
  })
  @ApiResponse({ status: 200, description: 'Thiết lập định mức thành công' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post('recipes')
  async setProductRecipe(@Body() dto: SetRecipeDto) {
    return this.inventoryService.setProductRecipe(dto);
  }

  @ApiOperation({ summary: 'Xem công thức định mức BOM của một món' })
  @ApiResponse({ status: 200, description: 'Công thức món' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.BARISTA)
  @Get('recipes/:productId')
  async getProductRecipe(@Param('productId') productId: string) {
    return this.inventoryService.getProductRecipe(productId);
  }

  @ApiOperation({
    summary: 'Nhập hàng vào kho hoặc điều chỉnh hao hụt/kiểm kê (DB Transaction - Quyền: Admin, Manager)',
  })
  @ApiResponse({ status: 200, description: 'Ghi nhận biến động kho thành công' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post('adjust')
  async adjustStock(@Body() dto: StockAdjustmentDto) {
    return this.inventoryService.adjustStock(dto);
  }
}


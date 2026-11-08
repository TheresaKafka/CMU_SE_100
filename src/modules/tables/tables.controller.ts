import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TablesService } from './tables.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { TransferTableDto } from './dto/transfer-table.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Tables (Bàn)')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @ApiOperation({ summary: 'Lấy sơ đồ danh sách các bàn (hỗ trợ lọc theo areaId)' })
  @ApiQuery({ name: 'areaId', required: false, description: 'Lọc theo mã khu vực' })
  @ApiResponse({ status: 200, description: 'Danh sách bàn' })
  @Get()
  async findAll(@Query('areaId') areaId?: string) {
    return this.tablesService.getTables(areaId);
  }

  @ApiOperation({ summary: 'Xem chi tiết bàn và các đơn hàng đang phục vụ' })
  @ApiResponse({ status: 200, description: 'Chi tiết bàn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bàn' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }

  @ApiOperation({ summary: 'Thêm bàn mới vào khu vực (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'Tạo bàn thành công' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  async create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái hoặc thông tin bàn (Quyền: Cashier, Manager, Admin)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Cập nhật bàn thành công' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.updateTable(id, dto);
  }

  @ApiOperation({ summary: 'Xóa bàn (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Xóa bàn thành công' })
  @ApiResponse({ status: 400, description: 'Không thể xóa bàn đang có khách ngồi' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }

  @ApiOperation({
    summary: 'Chuyển bàn / Gộp bàn cho khách (DB Transaction - Quyền: Cashier, Admin)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Chuyển bàn thành công' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post('transfer')
  async transferTable(@Body() dto: TransferTableDto) {
    return this.tablesService.transferTable(dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Areas (Khu vực)')
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @ApiOperation({ summary: 'Lấy danh sách tất cả các khu vực kèm bàn trực thuộc (Public/POS/App)' })
  @ApiResponse({ status: 200, description: 'Danh sách khu vực' })
  @Get()
  async findAll() {
    return this.areasService.findAll();
  }

  @ApiOperation({ summary: 'Xem chi tiết một khu vực' })
  @ApiResponse({ status: 200, description: 'Chi tiết khu vực' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khu vực' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  @ApiOperation({ summary: 'Tạo mới một khu vực (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'Tạo khu vực thành công' })
  @ApiResponse({ status: 409, description: 'Tên khu vực đã tồn tại' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  async create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật tên hoặc thứ tự hiển thị khu vực (Quyền: Admin, Manager)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa khu vực (Chặn xóa nếu khu vực vẫn còn bàn trực thuộc)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Xóa khu vực thành công' })
  @ApiResponse({ status: 400, description: 'Khu vực vẫn còn bàn trực thuộc' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}


import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Shifts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @ApiOperation({ summary: 'Mở ca làm việc POS mới (Chỉ dành cho Cashier & Admin)' })
  @ApiResponse({ status: 201, description: 'Mở ca thành công' })
  @ApiResponse({ status: 400, description: 'Thu ngân đang có ca chưa kết thúc' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @Post('open')
  async openShift(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OpenShiftDto,
  ) {
    return this.shiftsService.openShift(user, dto);
  }

  @ApiOperation({ summary: 'Lấy thông tin và báo cáo doanh thu tạm tính ca hiện tại của thu ngân' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu ca thành công' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @Get('current')
  async getCurrentShift(@CurrentUser() user: AuthenticatedUser) {
    return this.shiftsService.getCurrentShift(user);
  }

  @ApiOperation({
    summary: 'Chốt ca làm việc hiện tại của thu ngân đang đăng nhập',
  })
  @ApiResponse({ status: 200, description: 'Chốt ca thành công kèm biên bản kiểm toán' })
  @ApiResponse({ status: 404, description: 'Không có ca nào đang mở' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post('close')
  async closeCurrentShift(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeCurrentShift(user, dto);
  }

  @ApiOperation({
    summary: 'Chốt ca và đối soát tiền mặt theo ID ca (DB Transaction: tính chênh lệch discrepancy)',
  })
  @ApiResponse({ status: 200, description: 'Chốt ca thành công kèm biên bản kiểm toán' })
  @ApiResponse({ status: 403, description: 'Không có quyền chốt ca này' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/close')
  async closeShift(
    @Param('id') shiftId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeShift(shiftId, user, dto);
  }

  @ApiOperation({ summary: 'Xem chi tiết biên bản kiểm toán của một ca làm việc' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết ca làm việc' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @Get(':id')
  async getShiftById(@Param('id') shiftId: string) {
    return this.shiftsService.getShiftById(shiftId);
  }

  @ApiOperation({ summary: 'Danh sách lịch sử các ca làm việc (Dành cho Quản lý & Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách các ca làm việc gần nhất' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get()
  async getAllShifts() {
    return this.shiftsService.getAllShifts();
  }
}

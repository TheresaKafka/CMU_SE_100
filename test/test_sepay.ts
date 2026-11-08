import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { OrdersService } from '../src/modules/orders/orders.service.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { OrderTypeDto } from '../src/modules/orders/dto/create-order.dto.js';

async function run() {
  console.log('=== KHỞI TẠO TEST SUITE SEPAY & QR PAYMENT (POS-04) ===');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const paymentsService = app.get(PaymentsService);
  const ordersService = app.get(OrdersService);

  try {
    // 1. Kiểm tra hoặc tạo Role CASHIER
    let role = await prisma.orm.public.Role.where({ name: 'CASHIER' }).first();
    if (!role) {
      role = await prisma.orm.public.Role.create({
        name: 'CASHIER',
        permissions: { pos: true, orders: true },
      });
      console.log('1. Đã tạo Role: CASHIER');
    } else {
      console.log('1. Sử dụng Role CASHIER:', role.id);
    }

    // 2. Kiểm tra hoặc tạo User Thu ngân
    let cashier = await prisma.orm.public.User.where({ username: 'cashier_test' }).first();
    if (!cashier) {
      const passwordHash = await bcrypt.hash('123456', 10);
      cashier = await prisma.orm.public.User.create({
        username: 'cashier_test',
        passwordHash,
        roleId: role.id,
        posPin: '1234',
        status: 'ACTIVE',
      });
      console.log('2. Đã tạo User Cashier test:', cashier.username);
    } else {
      console.log('2. Sử dụng User Cashier test:', cashier.username);
    }

    // 3. Kiểm tra hoặc tạo Ca làm việc (Shift) đang OPEN
    let shift = await prisma.orm.public.Shift.where({ status: 'OPEN' }).first();
    if (!shift) {
      shift = await prisma.orm.public.Shift.create({
        cashierId: cashier.id,
        startingCash: '1000000.00',
        status: 'OPEN',
      });
      console.log('3. Đã mở Ca làm việc mới:', shift.id);
    } else {
      console.log('3. Sử dụng Ca làm việc đang mở:', shift.id);
    }

    // 4. Kiểm tra hoặc tạo Khu vực & Bàn
    let area = await prisma.orm.public.Area.first();
    if (!area) {
      area = await prisma.orm.public.Area.create({
        name: 'Tầng Trệt Test',
        sortOrder: 1,
      });
    }
    let table = await prisma.orm.public.Table.where({ areaId: area.id, tableNumber: 'B01' }).first();
    if (!table) {
      table = await prisma.orm.public.Table.create({
        areaId: area.id,
        tableNumber: 'B01',
        capacity: 4,
        status: 'EMPTY',
      });
      console.log('4. Đã tạo Bàn test:', table.tableNumber);
    } else {
      // Reset bàn về EMPTY
      await prisma.orm.public.Table.where({ id: table.id }).update({ status: 'EMPTY' });
      console.log('4. Sử dụng Bàn test:', table.tableNumber);
    }

    // 5. Kiểm tra hoặc tạo Danh mục & Sản phẩm & Nguyên liệu BOM
    let category = await prisma.orm.public.Category.first();
    if (!category) {
      category = await prisma.orm.public.Category.create({
        name: 'Cà Phê Truyền Thống',
        sortOrder: 1,
      });
    }

    let product = await prisma.orm.public.Product.where({ name: 'Cà Phê Sữa Đá Sài Gòn' }).first();
    if (!product) {
      product = await prisma.orm.public.Product.create({
        categoryId: category.id,
        name: 'Cà Phê Sữa Đá Sài Gòn',
        basePrice: '35000.00',
        isActive: true,
      });
      console.log('5. Đã tạo Sản phẩm test:', product.name);
    } else {
      console.log('5. Sử dụng Sản phẩm test:', product.name);
    }

    // Nguyên liệu & Định mức BOM
    let ingredient = await prisma.orm.public.Ingredient.where({ name: 'Hạt Robusta Đắk Lắk' }).first();
    if (!ingredient) {
      ingredient = await prisma.orm.public.Ingredient.create({
        name: 'Hạt Robusta Đắk Lắk',
        unit: 'g',
        currentStock: '5000.00',
        safetyStock: '500.00',
        costPrice: '150.00',
      });
      console.log('   Đã tạo Nguyên liệu test:', ingredient.name);
    }

    const recipe = await prisma.orm.public.RecipeItem
      .where({ productId: product.id, ingredientId: ingredient.id })
      .first();
    if (!recipe) {
      await prisma.orm.public.RecipeItem.create({
        productId: product.id,
        ingredientId: ingredient.id,
        quantityRequired: '25.00',
      });
      console.log('   Đã gán định mức BOM: 25g nguyên liệu / 1 ly cà phê');
    }

    const stockBefore = Number(ingredient.currentStock);
    console.log(`   Tồn kho nguyên liệu ban đầu: ${stockBefore} ${ingredient.unit}`);

    // 6. TẠO ĐƠN HÀNG PENDING (POS-01 & POS-02)
    console.log('\n--- BƯỚC 1: TẠO ĐƠN HÀNG PENDING TẠI BÀN ---');
    const orderResult = await ordersService.createOrder(cashier.id, {
      shiftId: shift.id,
      tableId: table.id,
      orderType: OrderTypeDto.DINE_IN,
      items: [
        {
          productId: product.id,
          quantity: 2, // 2 ly = 50g nguyên liệu, tổng tiền = 70,000 VNĐ
        },
      ],
    });

    const orderId = orderResult.order.id;
    const totalAmount = orderResult.order.totalAmount;
    console.log(`-> Tạo đơn thành công #${orderId}`);
    console.log(`-> Số lượng: 2 ly | Tổng thanh toán: ${totalAmount} VNĐ`);
    console.log(`-> Trạng thái đơn ban đầu: ${orderResult.order.status}`);

    const tableAfterOrder = await prisma.orm.public.Table.where({ id: table.id }).first();
    console.log(`-> Trạng thái Bàn sau khi gọi món: ${tableAfterOrder?.status} (Mong muốn: OCCUPIED)`);
    if (tableAfterOrder?.status !== 'OCCUPIED') {
      throw new Error('Bàn không chuyển sang OCCUPIED khi có đơn PENDING!');
    }

    // 7. SINH MÃ QR SEPAY / VIETQR ĐỘNG (POS-04)
    console.log('\n--- BƯỚC 2: TẠO MÃ QR THANH TOÁN (generateOrderQr) ---');
    const qrData = await paymentsService.generateOrderQr(orderId);
    console.log('-> Dữ liệu sinh QR trả về cho POS:');
    console.log('   Mã chuyển khoản (Description):', qrData.description);
    console.log('   Số tiền thanh toán:', qrData.amount, 'VNĐ');
    console.log('   Ngân hàng nhận:', qrData.bank, '| Số tài khoản:', qrData.accountNumber);
    console.log('   Link hình ảnh VietQR SePay:', qrData.qrUrl);

    if (!qrData.qrUrl.includes('qr.sepay.vn') || !qrData.qrUrl.includes(qrData.description)) {
      throw new Error('Đường dẫn VietQR SePay không đúng định dạng!');
    }
    console.log('✓ Mã QR tạo thành công, đúng chuẩn tích hợp SePay!');

    // 8. GIẢ LẬP WEBHOOK IPN TỪ SEPAY (KHÁCH QUÉT QR THÀNH CÔNG)
    console.log('\n--- BƯỚC 3: GIẢ LẬP NHẬN WEBHOOK IPN TỪ SEPAY ---');
    const mockSepayWebhook = {
      id: Math.floor(Math.random() * 1000000) + 100000,
      gateway: qrData.bank,
      transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      accountNumber: qrData.accountNumber,
      code: qrData.description,
      content: `${qrData.description} THANH TOAN CA FE SEPAY TEST`,
      transferType: 'in',
      description: 'Chuyen tien thanh toan hoa don cafe',
      transferAmount: qrData.amount,
      referenceCode: 'MB' + Date.now(),
    };

    const webhookResponse = await paymentsService.processSepayWebhook(
      mockSepayWebhook,
      `Apikey ${process.env['SEPAY_API_KEY']}`,
    );
    console.log('-> Phản hồi từ PaymentsService.processSepayWebhook:', webhookResponse);

    if (!webhookResponse.success) {
      throw new Error('Webhook SePay xử lý không thành công: ' + webhookResponse.message);
    }
    console.log('✓ Webhook xử lý thành công!');

    // 9. KIỂM TRA TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI & TRỪ KHO BOM (INV-03)
    console.log('\n--- BƯỚC 4: KIỂM TRA ĐƠN HÀNG & TRỪ KHO TỰ ĐỘNG ---');
    const paidOrder = await prisma.orm.public.Order.where({ id: orderId }).first();
    console.log(`-> Trạng thái đơn sau Webhook: ${paidOrder?.status}`);
    console.log(`-> Phương thức thanh toán: ${paidOrder?.paymentMethod}`);

    if (paidOrder?.status !== 'PAID' || paidOrder?.paymentMethod !== 'QR') {
      throw new Error(`Lỗi: Đơn hàng chưa chuyển sang PAID hoặc paymentMethod !== 'QR'!`);
    }

    // Kiểm tra kho
    const updatedIngredient = await prisma.orm.public.Ingredient.where({ id: ingredient.id }).first();
    const stockAfter = Number(updatedIngredient?.currentStock);
    console.log(`-> Tồn kho trước thanh toán: ${stockBefore} ${ingredient.unit}`);
    console.log(`-> Tồn kho sau thanh toán:   ${stockAfter} ${ingredient.unit}`);
    console.log(`-> Đã tiêu hao:              ${stockBefore - stockAfter} ${ingredient.unit} (Dự kiến: 50.00 g cho 2 ly)`);

    if (stockBefore - stockAfter !== 50) {
      throw new Error('Lỗi: Khấu trừ kho BOM không chính xác!');
    }
    console.log('✓ Khấu trừ tồn kho BOM (INV-03) trong DB Transaction ACID hoàn toàn chính xác!');

    // Kiểm tra giải phóng bàn
    const tableAfterPayment = await prisma.orm.public.Table.where({ id: table.id }).first();
    console.log(`-> Trạng thái Bàn sau khi thanh toán: ${tableAfterPayment?.status} (Mong muốn: EMPTY)`);
    if (tableAfterPayment?.status !== 'EMPTY') {
      throw new Error('Lỗi: Bàn chưa được tự động giải phóng về EMPTY!');
    }
    console.log('✓ Bàn đã tự động giải phóng về trạng thái EMPTY!');

    // 10. KIỂM TRA TÍNH IDEMPOTENT KHI SEPAY RETRY WEBHOOK
    console.log('\n--- BƯỚC 5: KIỂM TRA TÍNH NĂNG IDEMPOTENT (Chống trừ kho 2 lần khi SePay retry) ---');
    const retryResponse = await paymentsService.processSepayWebhook(mockSepayWebhook);
    console.log('-> Phản hồi khi gọi lại webhook lần 2:', retryResponse);

    const stockAfterRetry = Number(
      (await prisma.orm.public.Ingredient.where({ id: ingredient.id }).first())?.currentStock,
    );
    if (stockAfterRetry !== stockAfter) {
      throw new Error('Lỗi nghiêm trọng: Tồn kho bị trừ lần 2 khi nhận lại webhook!');
    }
    console.log('✓ Tính chất Idempotent hoạt động hoàn hảo! Kho không bị trừ đúp.');

    // 11. KIỂM TRA TRA CỨU TRẠNG THÁI ĐƠN HÀNG (POS POLLING FALLBACK)
    console.log('\n--- BƯỚC 6: KIỂM TRA API TRA CỨU TRẠNG THÁI (checkPaymentStatus) ---');
    const statusResult = await paymentsService.checkPaymentStatus(orderId);
    console.log('-> Kết quả tra cứu:', statusResult);
    if (!statusResult.isPaid || statusResult.status !== 'PAID') {
      throw new Error('checkPaymentStatus không trả về trạng thái PAID!');
    }
    console.log('✓ API tra cứu thanh toán hoạt động chuẩn xác!');

    console.log('\n=============================================================');
    console.log(' ⭐ HOÀN TẤT TẤT CẢ CÁC BƯỚC KIỂM THỬ POS-04 SEPAY: 100% PASS ⭐');
    console.log('=============================================================');
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
  process.exit(1);
});

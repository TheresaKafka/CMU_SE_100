import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

async function seed() {
  console.log('🌱 BẮT ĐẦU SEED DỮ LIỆU CHO HỆ THỐNG COFFEE POS & MANAGEMENT...');
  const prisma = new PrismaService();

  try {
    // ==========================================
    // 1. ROLES
    // ==========================================
    console.log('\n--- 1. SEED ROLES ---');
    const rolesData = [
      { name: 'ADMIN', permissions: { all: true, pos: true, kds: true, admin: true, reports: true, inventory: true } },
      { name: 'CASHIER', permissions: { pos: true, orders: true, shifts: true } },
      { name: 'BARISTA', permissions: { kds: true, orders: true } },
    ];

    const rolesMap = new Map<string, string>();
    for (const r of rolesData) {
      let role = await prisma.orm.public.Role.where({ name: r.name }).first();
      if (!role) {
        role = await prisma.orm.public.Role.create({
          name: r.name,
          permissions: r.permissions,
        });
        console.log(`  + Đã tạo Role: ${r.name}`);
      } else {
        console.log(`  = Role đã tồn tại: ${r.name}`);
      }
      rolesMap.set(r.name, role.id);
    }

    // ==========================================
    // 2. USERS
    // ==========================================
    console.log('\n--- 2. SEED USERS ---');
    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    const usersData = [
      { username: 'admin_test', roleName: 'ADMIN', posPin: '9999' },
      { username: 'cashier_test', roleName: 'CASHIER', posPin: '1234' },
      { username: 'barista_test', roleName: 'BARISTA', posPin: '5678' },
      { username: 'cashier_lan', roleName: 'CASHIER', posPin: '1111' },
      { username: 'barista_minh', roleName: 'BARISTA', posPin: '2222' },
    ];

    const usersMap = new Map<string, string>();
    for (const u of usersData) {
      let user = await prisma.orm.public.User.where({ username: u.username }).first();
      if (!user) {
        user = await prisma.orm.public.User.create({
          username: u.username,
          passwordHash: defaultPasswordHash,
          roleId: rolesMap.get(u.roleName)!,
          posPin: u.posPin,
          status: 'ACTIVE',
        });
        console.log(`  + Đã tạo User: ${u.username} (${u.roleName})`);
      } else {
        console.log(`  = User đã tồn tại: ${u.username}`);
      }
      usersMap.set(u.username, user.id);
    }

    // ==========================================
    // 3. AREAS & TABLES
    // ==========================================
    console.log('\n--- 3. SEED AREAS & TABLES ---');
    const areasData = [
      {
        name: 'Tầng 1 - Trong nhà',
        sortOrder: 1,
        tables: [
          { number: 'Bàn 01', capacity: 2 },
          { number: 'Bàn 02', capacity: 4 },
          { number: 'Bàn 03', capacity: 4 },
          { number: 'Bàn 04', capacity: 6 },
          { number: 'Bàn 05', capacity: 4 },
        ],
      },
      {
        name: 'Tầng 1 - Sân vườn',
        sortOrder: 2,
        tables: [
          { number: 'Bàn SV1', capacity: 4 },
          { number: 'Bàn SV2', capacity: 4 },
          { number: 'Bàn SV3', capacity: 2 },
          { number: 'Bàn SV4', capacity: 8 },
        ],
      },
      {
        name: 'Tầng 2 - Ban công & Lounge',
        sortOrder: 3,
        tables: [
          { number: 'Bàn 201', capacity: 2 },
          { number: 'Bàn 202', capacity: 4 },
          { number: 'Bàn 203', capacity: 4 },
          { number: 'Bàn 204', capacity: 6 },
        ],
      },
      {
        name: 'Mang về (Takeaway)',
        sortOrder: 4,
        tables: [
          { number: 'Quầy Mang Về', capacity: 1 },
        ],
      },
    ];

    const tablesMap = new Map<string, string>();
    for (const a of areasData) {
      let area = await prisma.orm.public.Area.where({ name: a.name }).first();
      if (!area) {
        area = await prisma.orm.public.Area.create({
          name: a.name,
          sortOrder: a.sortOrder,
        });
        console.log(`  + Đã tạo Khu vực: ${a.name}`);
      } else {
        console.log(`  = Khu vực đã tồn tại: ${a.name}`);
      }

      for (const t of a.tables) {
        let table = await prisma.orm.public.Table.where({
          areaId: area.id,
          tableNumber: t.number,
        }).first();

        if (!table) {
          table = await prisma.orm.public.Table.create({
            areaId: area.id,
            tableNumber: t.number,
            capacity: t.capacity,
            status: 'EMPTY',
          });
          console.log(`    + Đã tạo Bàn: ${t.number} (${a.name})`);
        }
        tablesMap.set(t.number, table.id);
      }
    }

    // ==========================================
    // 4. CATEGORIES
    // ==========================================
    console.log('\n--- 4. SEED CATEGORIES ---');
    const categoriesData = [
      { name: 'Cà Phê Truyền Thống', sortOrder: 1 },
      { name: 'Cà Phê Espresso & Ý', sortOrder: 2 },
      { name: 'Trà Trái Cây & Trà Sữa', sortOrder: 3 },
      { name: 'Đá Xay & Sinh Tố', sortOrder: 4 },
      { name: 'Bánh Ngọt & Bánh Mì', sortOrder: 5 },
    ];

    const categoriesMap = new Map<string, string>();
    for (const c of categoriesData) {
      let category = await prisma.orm.public.Category.where({ name: c.name }).first();
      if (!category) {
        category = await prisma.orm.public.Category.create({
          name: c.name,
          sortOrder: c.sortOrder,
        });
        console.log(`  + Đã tạo Danh mục: ${c.name}`);
      } else {
        console.log(`  = Danh mục đã tồn tại: ${c.name}`);
      }
      categoriesMap.set(c.name, category.id);
    }

    // ==========================================
    // 5. INGREDIENTS (NGUYÊN VẬT LIỆU KHO)
    // ==========================================
    console.log('\n--- 5. SEED INGREDIENTS (BOM KHO) ---');
    const ingredientsData = [
      { name: 'Cà phê hạt Robusta Buôn Ma Thuột', unit: 'g', currentStock: '50000.00', safetyStock: '5000.00', costPrice: '250.00' },
      { name: 'Cà phê hạt Arabica Cầu Đất', unit: 'g', currentStock: '30000.00', safetyStock: '3000.00', costPrice: '400.00' },
      { name: 'Sữa tươi thanh trùng Barista', unit: 'ml', currentStock: '40000.00', safetyStock: '5000.00', costPrice: '35.00' },
      { name: 'Sữa đặc Ông Thọ', unit: 'g', currentStock: '20000.00', safetyStock: '2000.00', costPrice: '60.00' },
      { name: 'Đường mía tự nhiên', unit: 'g', currentStock: '30000.00', safetyStock: '3000.00', costPrice: '22.00' },
      { name: 'Trà Oolong cao cấp', unit: 'g', currentStock: '10000.00', safetyStock: '1000.00', costPrice: '450.00' },
      { name: 'Trà đen Ceylon', unit: 'g', currentStock: '10000.00', safetyStock: '1000.00', costPrice: '300.00' },
      { name: 'Đào miếng ngâm đường', unit: 'miếng', currentStock: '200.00', safetyStock: '30.00', costPrice: '3000.00' },
      { name: 'Siro Đào Teisseire', unit: 'ml', currentStock: '5000.00', safetyStock: '500.00', costPrice: '250.00' },
      { name: 'Siro Vải Teisseire', unit: 'ml', currentStock: '5000.00', safetyStock: '500.00', costPrice: '250.00' },
      { name: 'Bột Uji Matcha Nhật', unit: 'g', currentStock: '2000.00', safetyStock: '300.00', costPrice: '1500.00' },
      { name: 'Nước cốt dừa tươi', unit: 'ml', currentStock: '10000.00', safetyStock: '1000.00', costPrice: '80.00' },
      { name: 'Bột Cacao nguyên chất', unit: 'g', currentStock: '5000.00', safetyStock: '500.00', costPrice: '350.00' },
      { name: 'Bánh Croissant đông lạnh', unit: 'cái', currentStock: '100.00', safetyStock: '15.00', costPrice: '18000.00' },
      { name: 'Kem béo thực vật Rich', unit: 'ml', currentStock: '15000.00', safetyStock: '2000.00', costPrice: '65.00' },
      { name: 'Muối hồng Himalaya', unit: 'g', currentStock: '2000.00', safetyStock: '200.00', costPrice: '120.00' },
    ];

    const ingredientsMap = new Map<string, string>();
    for (const ing of ingredientsData) {
      let ingredient = await prisma.orm.public.Ingredient.where({ name: ing.name }).first();
      if (!ingredient) {
        ingredient = await prisma.orm.public.Ingredient.create({
          name: ing.name,
          unit: ing.unit,
          currentStock: ing.currentStock,
          safetyStock: ing.safetyStock,
          costPrice: ing.costPrice,
        });
        console.log(`  + Đã tạo Nguyên liệu: ${ing.name} (${ing.currentStock} ${ing.unit})`);
      } else {
        console.log(`  = Nguyên liệu đã tồn tại: ${ing.name}`);
      }
      ingredientsMap.set(ing.name, ingredient.id);
    }

    // ==========================================
    // 6. PRODUCTS (THỰC ĐƠN)
    // ==========================================
    console.log('\n--- 6. SEED PRODUCTS & OPTIONS ---');
    const productsData = [
      // 1. Cà Phê Truyền Thống
      {
        name: 'Cà Phê Sữa Đá Sài Gòn',
        category: 'Cà Phê Truyền Thống',
        price: '35000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Robusta Buôn Ma Thuột', amount: '25.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '30.00' },
        ],
      },
      {
        name: 'Cà Phê Đen Đá Phin',
        category: 'Cà Phê Truyền Thống',
        price: '29000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Robusta Buôn Ma Thuột', amount: '25.00' },
          { ingredient: 'Đường mía tự nhiên', amount: '15.00' },
        ],
      },
      {
        name: 'Bạc Xỉu 3 Tầng',
        category: 'Cà Phê Truyền Thống',
        price: '39000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Robusta Buôn Ma Thuột', amount: '15.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '100.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '35.00' },
        ],
      },

      // 2. Cà Phê Espresso & Ý
      {
        name: 'Cà Phê Muối Kem Béo',
        category: 'Cà Phê Espresso & Ý',
        price: '42000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Robusta Buôn Ma Thuột', amount: '20.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '25.00' },
          { ingredient: 'Kem béo thực vật Rich', amount: '40.00' },
          { ingredient: 'Muối hồng Himalaya', amount: '1.00' },
        ],
      },
      {
        name: 'Cà Phê Americano Đá',
        category: 'Cà Phê Espresso & Ý',
        price: '39000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Arabica Cầu Đất', amount: '18.00' },
        ],
      },
      {
        name: 'Cà Phê Latte Hạnh Nhân',
        category: 'Cà Phê Espresso & Ý',
        price: '52000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Arabica Cầu Đất', amount: '18.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '180.00' },
        ],
      },
      {
        name: 'Cappuccino Nóng Art',
        category: 'Cà Phê Espresso & Ý',
        price: '49000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Arabica Cầu Đất', amount: '18.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '150.00' },
        ],
      },

      // 3. Trà Trái Cây & Trà Sữa
      {
        name: 'Trà Đào Cam Sả Tươi',
        category: 'Trà Trái Cây & Trà Sữa',
        price: '45000.00',
        recipes: [
          { ingredient: 'Trà đen Ceylon', amount: '8.00' },
          { ingredient: 'Siro Đào Teisseire', amount: '30.00' },
          { ingredient: 'Đào miếng ngâm đường', amount: '2.00' },
          { ingredient: 'Đường mía tự nhiên', amount: '15.00' },
        ],
      },
      {
        name: 'Trà Vải Hoa Hồng Lệ Chi',
        category: 'Trà Trái Cây & Trà Sữa',
        price: '48000.00',
        recipes: [
          { ingredient: 'Trà Oolong cao cấp', amount: '8.00' },
          { ingredient: 'Siro Vải Teisseire', amount: '35.00' },
          { ingredient: 'Đường mía tự nhiên', amount: '10.00' },
        ],
      },
      {
        name: 'Trà Sữa Oolong Nướng',
        category: 'Trà Trái Cây & Trà Sữa',
        price: '49000.00',
        recipes: [
          { ingredient: 'Trà Oolong cao cấp', amount: '12.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '100.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '30.00' },
        ],
      },
      {
        name: 'Uji Matcha Latte Nhật Bản',
        category: 'Trà Trái Cây & Trà Sữa',
        price: '55000.00',
        recipes: [
          { ingredient: 'Bột Uji Matcha Nhật', amount: '6.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '180.00' },
          { ingredient: 'Đường mía tự nhiên', amount: '15.00' },
        ],
      },

      // 4. Đá Xay & Sinh Tố
      {
        name: 'Cà Phê Cốt Dừa Đá Tuyết',
        category: 'Đá Xay & Sinh Tố',
        price: '52000.00',
        recipes: [
          { ingredient: 'Cà phê hạt Robusta Buôn Ma Thuột', amount: '20.00' },
          { ingredient: 'Nước cốt dừa tươi', amount: '80.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '40.00' },
        ],
      },
      {
        name: 'Socola Băng Tuyết Phủ Kem',
        category: 'Đá Xay & Sinh Tố',
        price: '55000.00',
        recipes: [
          { ingredient: 'Bột Cacao nguyên chất', amount: '25.00' },
          { ingredient: 'Sữa tươi thanh trùng Barista', amount: '120.00' },
          { ingredient: 'Sữa đặc Ông Thọ', amount: '30.00' },
          { ingredient: 'Kem béo thực vật Rich', amount: '40.00' },
        ],
      },

      // 5. Bánh Ngọt & Bánh Mì
      {
        name: 'Croissant Bơ Pháp Nướng',
        category: 'Bánh Ngọt & Bánh Mì',
        price: '35000.00',
        recipes: [
          { ingredient: 'Bánh Croissant đông lạnh', amount: '1.00' },
        ],
      },
      {
        name: 'Bánh Tiramisu Cacao Ý',
        category: 'Bánh Ngọt & Bánh Mì',
        price: '45000.00',
        recipes: [
          { ingredient: 'Bột Cacao nguyên chất', amount: '5.00' },
          { ingredient: 'Kem béo thực vật Rich', amount: '30.00' },
        ],
      },
    ];

    const productsMap = new Map<string, string>();
    for (const p of productsData) {
      let product = await prisma.orm.public.Product.where({ name: p.name }).first();
      if (!product) {
        product = await prisma.orm.public.Product.create({
          name: p.name,
          categoryId: categoriesMap.get(p.category)!,
          basePrice: p.price,
          isActive: true,
        });
        console.log(`  + Đã tạo Sản phẩm: ${p.name} (${Number(p.price).toLocaleString()} đ)`);

        // Thêm Options cho thức uống
        if (p.category !== 'Bánh Ngọt & Bánh Mì') {
          // Option Size
          const sizeOption = await prisma.orm.public.ProductOption.create({
            productId: product.id,
            optionName: 'Kích cỡ',
            isRequired: true,
            maxChoices: 1,
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: sizeOption.id,
            valueName: 'Size Vừa (M)',
            priceAdjustment: '0.00',
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: sizeOption.id,
            valueName: 'Size Lớn (L)',
            priceAdjustment: '8000.00',
          });

          // Option Đá
          const iceOption = await prisma.orm.public.ProductOption.create({
            productId: product.id,
            optionName: 'Mức đá',
            isRequired: false,
            maxChoices: 1,
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: iceOption.id,
            valueName: '100% Đá',
            priceAdjustment: '0.00',
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: iceOption.id,
            valueName: '50% Đá (Ít đá)',
            priceAdjustment: '0.00',
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: iceOption.id,
            valueName: 'Đá riêng',
            priceAdjustment: '0.00',
          });

          // Option Đường
          const sugarOption = await prisma.orm.public.ProductOption.create({
            productId: product.id,
            optionName: 'Độ ngọt',
            isRequired: false,
            maxChoices: 1,
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: sugarOption.id,
            valueName: '100% Ngọt bình thường',
            priceAdjustment: '0.00',
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: sugarOption.id,
            valueName: '50% Ít ngọt',
            priceAdjustment: '0.00',
          });
          await prisma.orm.public.ProductOptionValue.create({
            optionId: sugarOption.id,
            valueName: 'Không đường',
            priceAdjustment: '0.00',
          });
        }
      } else {
        console.log(`  = Sản phẩm đã tồn tại: ${p.name}`);
      }
      productsMap.set(p.name, product.id);

      // Định mức công thức (RecipeItem)
      for (const r of p.recipes) {
        const ingId = ingredientsMap.get(r.ingredient);
        if (ingId) {
          const existingRecipe = await prisma.orm.public.RecipeItem.where({
            productId: product.id,
            ingredientId: ingId,
          }).first();

          if (!existingRecipe) {
            await prisma.orm.public.RecipeItem.create({
              productId: product.id,
              ingredientId: ingId,
              quantityRequired: r.amount,
            });
          }
        }
      }
    }

    // ==========================================
    // 7. SHIFT (CA LÀM VIỆC)
    // ==========================================
    console.log('\n--- 7. SEED CA LÀM VIỆC ---');
    const cashierId = usersMap.get('cashier_test')!;
    let currentShift = await prisma.orm.public.Shift.where({ status: 'OPEN' }).first();
    if (!currentShift) {
      currentShift = await prisma.orm.public.Shift.create({
        cashierId,
        startingCash: '1000000.00',
        status: 'OPEN',
      });
      console.log(`  + Đã mở Ca làm việc hiện tại (Shift ID: ${currentShift.id})`);
    } else {
      console.log(`  = Đã có Ca làm việc đang mở: ${currentShift.id}`);
    }

    // ==========================================
    // 8. SAMPLE ORDERS (ĐƠN HÀNG MẪU CHO BÁO CÁO & KDS)
    // ==========================================
    console.log('\n--- 8. SEED ĐƠN HÀNG MẪU (ORDERS & KDS) ---');
    const existingOrders = await prisma.orm.public.Order.all();
    const existingOrdersCount = existingOrders.length;

    if (existingOrdersCount < 5) {
      // 1. Đơn hoàn tất 1 (Tiền mặt - Bàn 01)
      const order1 = await prisma.orm.public.Order.create({
        cashierId,
        shiftId: currentShift.id,
        tableId: tablesMap.get('Bàn 01')!,
        orderType: 'DINE_IN',
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        subtotal: '70000.00',
        totalAmount: '70000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: order1.id,
        productId: productsMap.get('Cà Phê Sữa Đá Sài Gòn')!,
        quantity: 2,
        unitPrice: '35000.00',
        totalPrice: '70000.00',
      });
      console.log(`  + Đã tạo Đơn mẫu 1: COMPLETED (CASH 70,000đ)`);

      // 2. Đơn hoàn tất 2 (QR SePay - Bàn 02)
      const order2 = await prisma.orm.public.Order.create({
        cashierId,
        shiftId: currentShift.id,
        tableId: tablesMap.get('Bàn 02')!,
        orderType: 'DINE_IN',
        status: 'COMPLETED',
        paymentMethod: 'QR',
        subtotal: '124000.00',
        totalAmount: '124000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: order2.id,
        productId: productsMap.get('Cà Phê Muối Kem Béo')!,
        quantity: 2,
        unitPrice: '42000.00',
        totalPrice: '84000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: order2.id,
        productId: productsMap.get('Cà Phê Americano Đá')!,
        quantity: 1,
        unitPrice: '39000.00',
        totalPrice: '39000.00',
      });
      console.log(`  + Đã tạo Đơn mẫu 2: COMPLETED (QR SePay 124,000đ)`);

      // 3. Đơn hoàn tất 3 (QR SePay - Mang về)
      const order3 = await prisma.orm.public.Order.create({
        cashierId,
        shiftId: currentShift.id,
        tableId: tablesMap.get('Quầy Mang Về')!,
        orderType: 'TAKE_AWAY',
        status: 'COMPLETED',
        paymentMethod: 'QR',
        subtotal: '142000.00',
        totalAmount: '142000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: order3.id,
        productId: productsMap.get('Trà Đào Cam Sả Tươi')!,
        quantity: 2,
        unitPrice: '45000.00',
        totalPrice: '90000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: order3.id,
        productId: productsMap.get('Cà Phê Cốt Dừa Đá Tuyết')!,
        quantity: 1,
        unitPrice: '52000.00',
        totalPrice: '52000.00',
      });
      console.log(`  + Đã tạo Đơn mẫu 3: COMPLETED (QR Takeaway 142,000đ)`);

      // 4. Đơn đang pha chế (PROCESSING) - hiển thị trên KDS
      const orderKds1 = await prisma.orm.public.Order.create({
        cashierId,
        shiftId: currentShift.id,
        tableId: tablesMap.get('Bàn SV1')!,
        orderType: 'DINE_IN',
        status: 'PROCESSING',
        paymentMethod: 'CASH',
        subtotal: '97000.00',
        totalAmount: '97000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: orderKds1.id,
        productId: productsMap.get('Uji Matcha Latte Nhật Bản')!,
        quantity: 1,
        unitPrice: '55000.00',
        totalPrice: '55000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: orderKds1.id,
        productId: productsMap.get('Cà Phê Muối Kem Béo')!,
        quantity: 1,
        unitPrice: '42000.00',
        totalPrice: '42000.00',
      });
      console.log(`  + Đã tạo Đơn KDS 1: PROCESSING (Hiển thị màn hình Bếp)`);

      // Cập nhật bàn SV1 thành OCCUPIED
      await prisma.orm.public.Table.where({ id: tablesMap.get('Bàn SV1')! }).update({ status: 'OCCUPIED' });

      // 5. Đơn đang chờ pha chế (PROCESSING) - Bàn 202
      const orderKds2 = await prisma.orm.public.Order.create({
        cashierId,
        shiftId: currentShift.id,
        tableId: tablesMap.get('Bàn 202')!,
        orderType: 'DINE_IN',
        status: 'PROCESSING',
        paymentMethod: 'QR',
        subtotal: '84000.00',
        totalAmount: '84000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: orderKds2.id,
        productId: productsMap.get('Trà Sữa Oolong Nướng')!,
        quantity: 1,
        unitPrice: '49000.00',
        totalPrice: '49000.00',
      });
      await prisma.orm.public.OrderItem.create({
        orderId: orderKds2.id,
        productId: productsMap.get('Croissant Bơ Pháp Nướng')!,
        quantity: 1,
        unitPrice: '35000.00',
        totalPrice: '35000.00',
      });
      console.log(`  + Đã tạo Đơn KDS 2: PROCESSING (Hiển thị màn hình Bếp)`);

      // Cập nhật bàn 202 thành OCCUPIED
      await prisma.orm.public.Table.where({ id: tablesMap.get('Bàn 202')! }).update({ status: 'OCCUPIED' });
    } else {
      console.log(`  = Đã có ${existingOrdersCount} đơn hàng trong hệ thống.`);
    }

    console.log('\n✨ SEED DỮ LIỆU HOÀN TẤT THÀNH CÔNG! ✨');
  } catch (error) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH SEED:', error);
    throw error;
  } finally {
    await prisma.onModuleDestroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});


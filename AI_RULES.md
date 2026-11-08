1. Kiến trúc & Công nghệ Cốt lõi
Framework: NestJS 12.x

Ngôn ngữ: TypeScript 6.x (Strict mode bắt buộc)

Môi trường: Node.js 24.x LTS

Database & ORM: Supabase PostgreSQL & Prisma ORM

Deployment: Railway

Giao thức: RESTful API

2. Quy tắc Viết Code (Code Conventions)
Naming Conventions:

camelCase cho biến, hằng số cục bộ, tên hàm (VD: calculateTotal, orderId).

PascalCase cho Tên Class, Interface, DTOs, Entities (VD: CreateOrderDto, UsersService).

UPPER_SNAKE_CASE cho hằng số global, enum values (VD: MAX_RETRY_COUNT, OrderStatus.PENDING).

kebab-case cho tên file và thư mục (VD: order-item.modifier.ts, users.controller.ts).

TypeScript Strictness:

Không sử dụng any. Bắt buộc phải define Interface/Type hoặc dùng unknown nếu chưa rõ kiểu dữ liệu và phải ép kiểu an toàn.

Bật cờ strictNullChecks và xử lý triệt để các trường hợp null/undefined.

Xử lý Bất đồng bộ (Async/Await):

Luôn dùng async/await, tuyệt đối không dùng .then().catch() lồng nhau (Callback hell).

3. Quy tắc Thiết kế API & NestJS
Cấu trúc Module: Áp dụng thiết kế Feature-based module. Mỗi nghiệp vụ (Auth, Users, Products, Orders, Inventory) phải nằm trong một module độc lập.

Controller & Service:

Controller: Chỉ làm nhiệm vụ tiếp nhận Request, Validate dữ liệu đầu vào (thông qua DTO & Pipes) và trả về Response. Tuyệt đối không chứa logic nghiệp vụ.

Service: Chứa toàn bộ logic nghiệp vụ (Business logic). Tái sử dụng qua Dependency Injection.

Validation:

Bắt buộc sử dụng class-validator và class-transformer trong mọi DTO.

Kích hoạt ValidationPipe ở cấp độ Global kèm cấu hình whitelist: true để loại bỏ các trường rác từ client.

Response Format:

Thống nhất một format trả về duy nhất cho toàn bộ API qua Interceptor. (VD: { statusCode, message, data, timestamp }).

Error Handling:

Bắt lỗi tập trung (Centralized Error Handling) bằng Global Exception Filters.

Không trả về lỗi stack trace (chi tiết mã nguồn) trong môi trường Production.

4. Quy tắc Database & Database Transactions
Tương tác Database: Chỉ giao tiếp với Supabase thông qua Prisma ORM (PrismaService). Không viết raw SQL query trừ những truy vấn phân tích quá phức tạp ảnh hưởng đến hiệu năng.

ACID & Transactions:

Các nghiệp vụ quan trọng liên quan đến dòng tiền và tồn kho (ví dụ: Thanh toán đơn hàng, trừ kho nguyên liệu BOM, chốt ca) bắt buộc phải sử dụng Database Transactions.

Nếu một bước thất bại, toàn bộ quá trình phải được Rollback.

Soft Delete: Hạn chế xóa vật lý dữ liệu (Hard Delete). Dùng cờ isActive: boolean hoặc deletedAt: DateTime cho các bảng như Products, Users, Categories.

5. Quy trình Làm việc (Workflow Rules)
Chốt Logic Trước, Code Sau: Mọi thay đổi lớn về thuật toán, flow thanh toán hay cấu trúc DB phải được thống nhất bằng văn bản/mô tả trước khi tiến hành viết code.

Focus Code Mới: Khi debug hoặc cấu trúc lại (refactor), tập trung giải quyết trực tiếp vào đoạn mã hiện tại. Đảm bảo tính tương thích với hệ thống đang chạy.

Không Over-engineering: Code đúng trọng tâm, giải quyết chính xác bài toán nghiệp vụ hiện tại (POS, Mobile App, Inventory BOM). Không vẽ thêm các pattern phức tạp nếu chưa thực sự cần thiết.

Bảo mật: Không bao giờ commit .env hoặc các keys nhạy cảm (Supabase URL, JWT Secret) lên source control. Sử dụng biến môi trường chuẩn xác cho Railway khi deploy.
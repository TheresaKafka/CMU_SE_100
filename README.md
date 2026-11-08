# ☕ Omnichannel Coffee Shop POS & Management System

> **Hệ thống POS bán hàng cảm ứng tại quầy, Màn hình pha chế Barista KDS (Real-time WebSockets), Cổng thanh toán VietQR SePay tự động và HQ Dashboard Quản trị chuỗi cà phê đa kênh.**

[![NestJS](https://img.shields.io/badge/NestJS-12.x-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-8.0-2D3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-316192?logo=postgresql&logoColor=white)](https://supabase.com/)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/)

---

## 🌟 Tính Năng Nổi Bật

1. **POS Thu Ngân (Touchscreen Interface)**:
   - Giao diện cảm ứng tối ưu tốc độ gọi món.
   - Quản lý sơ đồ bàn trực quan theo khu vực (`EMPTY`, `OCCUPIED`, `RESERVED`).
   - Hỗ trợ đổi bàn, gộp bàn và chuyển món linh hoạt.
   - Quản lý mở ca / chốt ca đối soát tiền mặt (Shift Cash Audit).
2. **KDS Màn Hình Pha Chế (Kitchen Display System)**:
   - Kết nối WebSockets `/kds` nhận đơn real-time tức thời không cần tải lại trang.
   - Âm thanh chuông báo "Ting ting" (Web Audio API) khi có đơn mới.
   - Phân trạm chuyên biệt: **Hot Bar**, **Cold Bar**, **Warming Station (Bếp Bánh)**.
   - Đồng hồ đếm thời gian trôi tự động cảnh báo đổi màu theo mức độ khẩn cấp.
   - Thao tác 1 chạm cập nhật trạng thái (`PROCESSING` -> `COMPLETED`).
3. **Thanh Toán Tự Động VietQR SePay (POS-04)**:
   - Sinh mã VietQR động kèm nội dung chuyển khoản duy nhất `DH...`.
   - Webhook IPN xử lý biến động số dư ngân hàng (MBBank, Vietcombank,...).
   - Tự động trừ kho nguyên liệu BOM (INV-03) qua **Database Transaction ACID**.
   - Cơ chế **Idempotent** ngăn ngừa trừ kho hai lần khi SePay retry webhook.
4. **HQ Central Dashboard (Admin & Quản Lý)**:
   - Biểu đồ doanh thu thời gian thực (Chart.js): Doanh số theo kênh thanh toán (QR vs Tiền mặt), Top 5 món bán chạy nhất.
   - CRUD Quản lý thực đơn & danh mục món.
   - Quản lý Kho nguyên liệu & Định mức công thức (BOM Recipe), cảnh báo an toàn tồn kho.
   - Quản lý Khu vực & Sơ đồ bàn.
   - Lịch sử đơn hàng và tra cứu hóa đơn.

---

## 🚀 Triển Khai Lên Railway (Deployment Guide)

### Cách 1: Liên kết trực tiếp GitHub Repository (Khuyến nghị)
1. Đăng nhập vào [Railway.com](https://railway.com/).
2. Nhấn **New Project** -> Chọn **Deploy from GitHub repo**.
3. Chọn kho mã nguồn: **`TheresaKafka/CMU_SE_100`**.
4. Vào tab **Variables** trong service vừa tạo và thêm các biến môi trường sau:

```env
DATABASE_URL=postgresql://postgres.obcfluimghonzinxplhy:Mshuy2004%40gmail.com@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.obcfluimghonzinxplhy:Mshuy2004%40gmail.com@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
JWT_SECRET=cmu-se-100-jwt-secret-key-pos-system
JWT_EXPIRES_IN=24h
SEPAY_API_KEY=R09AVHWZMUB3OCZ8KQ6BPNJPA7BU2PSIQOK7VWX42FYRNFS1ZRUALXESNA6DIV0Y
SEPAY_ACC_NUMBER=0388999999
SEPAY_BANK=MBBank
```

5. Vào tab **Settings** -> **Networking** -> Nhấn **Generate Domain** để nhận đường link HTTPS công khai (ví dụ: `https://cmu-se-100.up.railway.app`).
6. Railway sẽ tự động build qua Nixpacks (`railway.json`) và khởi chạy ứng dụng!

---

## 🔗 Các Đường Dẫn Phân Hệ Web

| Phân hệ | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| **Portal Hub** | `/` | Trung tâm điều hướng nhanh các phân hệ |
| **POS Thu Ngân** | `/pos.html` | Gọi món, sơ đồ bàn, giỏ hàng, thanh toán QR SePay |
| **KDS Pha Chế** | `/kds.html` | Màn hình nhận đơn real-time WebSockets |
| **HQ Dashboard** | `/admin.html` | Báo cáo doanh thu, quản lý Menu, Kho BOM, Bàn |
| **Đăng Nhập** | `/login.html` | Đăng nhập tài khoản hoặc mã PIN POS (1234) |
| **Swagger API** | `/api/docs` | Tài liệu OpenAPI RESTful endpoints |

---

## 💻 Hướng Dẫn Chạy Cục Bộ (Local Development)

```bash
# 1. Cài đặt thư viện
npm install

# 2. Cấu hình file .env từ .env.example
cp .env.example .env

# 3. Build hệ thống
npm run build

# 4. Chạy server ở chế độ Production
npm run start:prod
# Server sẽ lắng nghe tại: http://localhost:3000
```

---

## 🛡️ Bản Quyền & Giấy Phép
Dự án được xây dựng và phát triển cho môn học CMU-SE-100.
Tuân thủ đầy đủ bộ quy tắc kiến trúc tại `AI_RULES.md`.


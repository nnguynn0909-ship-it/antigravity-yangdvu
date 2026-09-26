# Antigravity YangDvu 🚀

> **Tiện ích mở rộng giám sát hạn mức AI và quản lý chuyển đổi đa tài khoản Antigravity - Bản quyền YangDvu, Bảo mật 100% & Thuần Tiếng Việt.**

[![Phiên bản](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/nnguynn0909-ship-it/antigravity-yangdvu)
[![Bản quyền](https://img.shields.io/badge/Bản_quyền-YangDvu-success.svg)](https://github.com/nnguynn0909-ship-it/antigravity-yangdvu)
[![Ngôn ngữ](https://img.shields.io/badge/Ngôn_ngữ-Tiếng_Việt-red.svg)](https://github.com/nnguynn0909-ship-it/antigravity-yangdvu)
[![Bảo mật](https://img.shields.io/badge/Bảo_mật-100%25_Cục_bộ-brightgreen.svg)](https://github.com/nnguynn0909-ship-it/antigravity-yangdvu)

---

## 🌟 Tính Năng Nổi Bật

### 1. 🛡️ Bảo Mật Riêng Tư Tuyệt Đối (100% Local)
- **Không rò rỉ token:** Toàn bộ thông tin tài khoản và Refresh Token được lưu trữ an toàn trong thư mục máy tính cục bộ của bạn (`AppData/AntigravityCockpitPrivate`).
- **Không gửi ra ngoài:** Đã loại bỏ hoàn toàn việc truyền dữ liệu nhạy cảm qua mạng hay WebSocket trung gian.
- **Không quảng cáo:** Đã xóa bỏ toàn bộ mã quảng cáo, thông báo bán hàng hay liên kết ngoài không an toàn.

### 2. ⚡ Chuyển Đổi Tài Khoản Mượt Mà (Seamless Account Switching)
- Hỗ trợ đổi tài khoản Google Antigravity trực tiếp trong Antigravity IDE chỉ với 1 cú click.
- Tự động nhận diện và đồng bộ thông tin phiên làm việc mà không cần khởi động lại ứng dụng hay can thiệp thủ công.
- Tự động nhập tài khoản từ cơ sở dữ liệu Antigravity IDE sẵn có trên máy tính.

### 3. 📊 Giám Sát Hạn Mức Thông Minh Theo Thời Gian Thực
- Theo dõi chi tiết lượng hạn mức còn lại và thời gian reset của từng mô hình AI hàng đầu: **Claude 3.7 Sonnet**, **Claude 3.5 Sonnet**, **Gemini 2.5 Flash**, **Gemini Thinking**, v.v.
- **Gom nhóm thông minh:** Tự động phát hiện và gộp các mô hình dùng chung nhóm tài nguyên (Quota Pool).
- **Cảnh báo ngưỡng:** Tự động thông báo khi hạn mức sắp cạn kiệt (màu vàng cảnh báo, màu đỏ nguy cấp).

### 4. 🚀 Thanh Trạng Thái (Status Bar) Linh Hoạt
- Tích hợp trực quan ngay dưới góc thanh trạng thái của IDE.
- Hỗ trợ nhiều kiểu hiển thị: Biểu tượng 🚀, Chấm trạng thái 🟢/🟡/🔴, Tên mô hình kèm % hạn mức.
- Nhấp chuột trực tiếp để mở nhanh Bảng điều khiển (Dashboard).

### 5. 🇻🇳 Giao Diện 100% Thuần Tiếng Việt
- Toàn bộ giao diện, thiết lập cấu hình, nhật ký và thông báo hệ thống được biên dịch chuẩn xác sang Tiếng Việt.

---

## ⌨️ Phím Tắt Tiện Dụng

| Phím tắt (Windows/Linux) | Phím tắt (macOS) | Thao tác |
| :--- | :--- | :--- |
| `Ctrl + Shift + Q` | `Cmd + Shift + Q` | Mở nhanh Bảng điều khiển hạn mức |
| `Ctrl + Shift + R` | `Cmd + Shift + R` | Làm mới dữ liệu hạn mức |

---

## 🛠️ Cài Đặt

### Cài đặt từ tệp `.vsix`:
1. Tải bản phát hành mới nhất `antigravity-yangdvu-1.0.0.vsix` từ mục **Releases**.
2. Mở **Antigravity IDE** hoặc **VS Code**.
3. Nhấn tổ hợp `Ctrl + Shift + P` -> gõ `Extensions: Install from VSIX...`.
4. Chọn tệp `.vsix` đã tải để cài đặt.

Hoặc chạy lệnh từ terminal:
```bash
antigravity-ide --install-extension antigravity-yangdvu-1.0.0.vsix --force
```

---

## ⚙️ Cấu Hình Tùy Chỉnh

Trong phần **Settings** (`Ctrl + ,`), tìm từ khóa `agCockpit` để điều chỉnh:

- **`agCockpit.refreshInterval`**: Thời gian làm mới tự động (mặc định: 120 giây).
- **`agCockpit.warningThreshold`**: Ngưỡng phần trăm hiện cảnh báo vàng (mặc định: 30%).
- **`agCockpit.criticalThreshold`**: Ngưỡng phần trăm hiện cảnh báo đỏ (mặc định: 10%).
- **`agCockpit.statusBarFormat`**: Kiểu hiển thị trên thanh trạng thái (mặc định: Dấu chấm + Tên + %).
- **`agCockpit.dataMasked`**: Che mờ địa chỉ email để bảo vệ quyền riêng tư khi chụp màn hình.

---

## 📄 Bản Quyền & Giấy Phép

Phát triển và bảo hộ bản quyền bởi **YangDvu** © 2026.  
Phát hành theo giấy phép [MIT License](LICENSE).

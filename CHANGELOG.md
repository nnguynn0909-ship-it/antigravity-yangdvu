# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi đáng chú ý của tiện ích mở rộng **Antigravity YangDvu** sẽ được ghi chép chi tiết trong tệp này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/lang/vi/).

---

## [1.0.0] - 2026-09-27

### 🌟 Bản Phát Hành Chính Thức (Bản Quyền YangDvu)

#### Thêm mới & Cải tiến nổi bật:
- **Bản quyền & Nhãn hiệu:** Chuyển toàn bộ tiện ích sang bản quyền sở hữu của **YangDvu**, tối ưu hóa riêng cho Antigravity IDE và hệ sinh thái người dùng Việt Nam.
- **Thuần hóa Tiếng Việt 100%:** 
  - Biên dịch toàn bộ giao diện bảng điều khiển (Dashboard), bảng tổng quan tài khoản (Accounts Overview), thanh trạng thái (Status Bar) và toàn bộ thiết lập cấu hình sang Tiếng Việt chuẩn xác.
  - Loại bỏ hoàn toàn tất cả tệp ngôn ngữ và tài liệu không cần thiết, loại bỏ triệt để các thông báo pop-up quảng cáo từ bên thứ ba.
- **Bảo mật tuyệt đối (100% Local Private):**
  - Chuyển hướng lưu trữ dữ liệu sang thư mục riêng biệt tại máy cục bộ (`AppData/AntigravityCockpitPrivate`).
  - Vô hiệu hóa việc truyền `refresh_token` qua kết nối mạng hoặc WebSocket trung gian, đảm bảo an toàn tối đa cho tài khoản Google của bạn.
  - Tích hợp cơ chế bảo vệ mã hóa thông tin xác thực chống bị quét lộ lọt trên các nền tảng lưu trữ mã nguồn.
- **Chuyển đổi tài khoản mượt mà (Seamless Account Switching):**
  - Chuyển đổi trực tiếp tài khoản Google Antigravity trong IDE chỉ với một cú nhấp chuột.
  - Tự động nhận diện phiên đăng nhập và đồng bộ hóa hạn mức mà không bị báo lỗi ngắt kết nối.
  - Tự động quét và nhập danh sách tài khoản sẵn có từ cơ sở dữ liệu `state.vscdb` của Antigravity IDE.
- **Giám sát hạn mức thông minh theo thời gian thực:**
  - Hỗ trợ giám sát hạn mức của các dòng mô hình AI mới nhất: **Claude 3.7 Sonnet**, **Claude 3.5 Sonnet**, **Gemini 2.5 Flash**, **Gemini Thinking**, v.v.
  - Hiển thị lượng AI Credits khả dụng ngay trên thanh trạng thái và bảng điều khiển mà không cần mở chi tiết tài khoản.
  - Tự động gom nhóm các mô hình dùng chung hạn mức (Quota Pool) và đếm ngược thời gian hồi phục hạn mức (Reset Time).
  - Tự động cảnh báo khi hạn mức sắp hết (ngưỡng vàng cảnh báo và ngưỡng đỏ nguy cấp).
- **Thanh trạng thái linh hoạt (Status Bar):**
  - Cho phép tùy chỉnh nhiều kiểu hiển thị: Biểu tượng 🚀, Chấm trạng thái 🟢/🟡/🔴, Tên mô hình kèm % hạn mức.
  - Phím tắt tiện dụng: `Ctrl + Shift + Q` (mở nhanh bảng điều khiển), `Ctrl + Shift + R` (làm mới dữ liệu).

---

## Các Bản Cập Nhật Nền Tảng Trước Đó

### [Phiên bản 2.1.x]
- **Tín dụng AI (AI Credits):** Tích hợp hiển thị tín dụng prompt và AI Credits khả dụng trực tiếp trên thanh trạng thái và danh sách tài khoản.
- **Đồng bộ bộ nhớ đệm (Cache):** Tối ưu hóa lưu trữ đệm API để giữ thông tin hạn mức mới nhất ngay cả khi ngoại tuyến hoặc đang làm mới.
- **Chế độ xem đa dạng:** Hỗ trợ xem dạng thẻ (Card View), dạng bảng (Table View) và dạng rút gọn (Compact View).

### [Phiên bản 2.0.x]
- **Kiến trúc đa tài khoản:** Giới thiệu giao diện quản lý đa tài khoản tập trung, hỗ trợ thêm tài khoản qua OAuth hoặc Refresh Token.
- **Trình đơn chọn nhanh (QuickPick Mode):** Bổ sung chế độ xem nhanh bằng phím tắt không cần mở giao diện Webview.
- **Bảo vệ quyền riêng tư:** Tính năng che mờ địa chỉ email trên giao diện khi quay video hoặc chia sẻ màn hình.

### [Phiên bản 1.0.x]
- **Khởi tạo dự án:** Khởi động hệ thống theo dõi hạn mức Antigravity với thanh trạng thái và bảng điều khiển trực quan ban đầu.

<div align="center">

<a href="https://ledgerling-ten.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-wordmark-dark.svg">
    <img src="docs/assets/logo-wordmark-light.svg" alt="Ledgerling logo: a round coin made of two gold and two jade L shapes, next to the name Ledgerling" height="64">
  </picture>
</a>

### Ứng dụng quản lý chi tiêu cá nhân, dùng được trên web, trên điện thoại và cả khi mất mạng.

[![CI](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml)
[![Live smoke](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2fc79c.svg)](LICENSE)
[![Node.js 24](https://img.shields.io/badge/node-24.x-5fa04e?logo=nodedotjs&logoColor=white)](.nvmrc)
[![React 19](https://img.shields.io/badge/react-19-61dafb?logo=react&logoColor=black)](client/package.json)
[![Express 5](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)](server/package.json)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-47a248?logo=mongodb&logoColor=white)](docs/database.md)
[![Languages: 8](https://img.shields.io/badge/languages-8-4f9ff0)](#đa-ngôn-ngữ)

**[Dùng thử](https://ledgerling-ten.vercel.app)** ·
**[Tài liệu API (Swagger)](https://ledgerling-api.onrender.com/api-docs)** ·
**[API base URL](https://ledgerling-api.onrender.com/api/health)** ·
**[English](README.md)**

</div>

<br>

[![The Ledgerling landing page: the headline "Know where your money goes." above a preview of the Dashboard](docs/screenshots/welcome-1440.jpg)](https://ledgerling-ten.vercel.app/welcome)

Ledgerling là đồ án cuối kỳ cá nhân của mình cho môn *Phát triển ứng dụng web và cơ sở dữ liệu* tại UIT. Tên gọi ghép từ
*ledger* (cuốn sổ ghi thu chi) và *-ling* (nhỏ nhắn, như trong *duckling*): một cuốn sổ nhỏ giúp giữ tiền bạc gọn gàng.
Mình tự làm REST API, thiết kế cơ sở dữ liệu và ứng dụng React, rồi triển khai lên Render, MongoDB Atlas và Vercel.

## Mục lục

- [Dùng thử trong 30 giây](#dùng-thử-trong-30-giây)
- [Điểm nổi bật](#điểm-nổi-bật)
- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Kiến trúc](#kiến-trúc)
- [Tổng quan API](#tổng-quan-api)
- [Cài đặt và chạy](#cài-đặt-và-chạy)
- [Kiểm thử](#kiểm-thử)
- [Hiệu năng](#hiệu-năng) · [Khả năng truy cập](#khả-năng-truy-cập) · [Bảo mật](#bảo-mật) · [Đa ngôn ngữ](#đa-ngôn-ngữ)
- [Triển khai](#triển-khai) · [CI/CD](#cicd)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Hướng phát triển](#hướng-phát-triển)
- [Môn học](#môn-học) · [Tác giả](#tác-giả) · [Ghi nhận](#ghi-nhận) · [Giấy phép](#giấy-phép)

Tài liệu chi tiết (tiếng Anh) nằm trong [docs/](docs/README.md): kiến trúc, cơ sở dữ liệu, API, kiểm thử và triển khai.

## Dùng thử trong 30 giây

1. Mở **https://ledgerling-ten.vercel.app**.
2. Bấm **Try the demo**. Không cần đăng ký: bạn vào thẳng một tài khoản dùng chung có sẵn dữ liệu mẫu của ba tháng
   (giao dịch, ngân sách, mục tiêu, ví, giao dịch định kỳ, thông báo).
3. Thử vài thứ: thêm giao dịch bằng phím `N`, mở bảng lệnh bằng `Ctrl+K`, đổi giao diện sáng/tối hoặc đổi ngôn ngữ.

> [!NOTE]
> API chạy trên gói miễn phí của Render, gói này cho server "ngủ" sau 15 phút không có ai truy cập. Lần truy cập đầu
> tiên sau đó có thể mất khoảng **30–60 giây** để server thức dậy; ứng dụng sẽ báo trong lúc chờ. Sau đó mọi thứ chạy nhanh.

Tài khoản demo là tài khoản chung và thỉnh thoảng được làm mới, nên đừng ghi gì riêng tư vào đó. Muốn giữ dữ liệu của
riêng mình thì bấm **Get started** và tạo tài khoản (chỉ cần email và mật khẩu).

## Điểm nổi bật

- **Đồng bộ thời gian thực.** Sửa gì trên laptop thì điện thoại tự cập nhật, không cần tải lại trang (Socket.IO, mỗi
  người dùng một phòng riêng; sự kiện không chứa dữ liệu, client gọi lại API có bảo vệ).
- **Dùng được khi mất mạng.** Ledgerling là PWA cài được: các trang và dữ liệu đã mở vẫn xem được khi không có mạng,
  còn việc ghi bị khoá đến khi có mạng lại, nên không mất dữ liệu và không lưu trùng.
- **8 ngôn ngữ.** English, Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語 và 한국어. Ngày và số hiển thị theo
  ngôn ngữ qua `Intl`; API trả về mã lỗi cố định và ứng dụng tự dịch.
- **Ngân sách và gợi ý.** Ngân sách theo tháng cho từng danh mục chi, cảnh báo ở mức 80% và 100%, báo cáo tháng và năm,
  lịch chi tiêu theo ngày và các gợi ý dựa trên luật đơn giản (không phải hộp đen).
- **Giao dịch định kỳ.** Luật hằng tuần hoặc hằng tháng tự tạo giao dịch thật khi đến hạn, và một partial unique index
  bảo đảm một luật không bao giờ tạo hai giao dịch cho cùng một ngày, kể cả khi hai request chạy cùng lúc.
- **Ví và chuyển tiền.** Số dư của ví tiền mặt, ngân hàng, ví điện tử được tính lại từ giao dịch và lần chuyển tiền mỗi
  khi đọc, nên không bao giờ lệch với lịch sử.
- **Quản trị và phiên đăng nhập.** Trang Admin theo vai trò, khoá tài khoản, và "đăng xuất mọi thiết bị" nhờ số phiên
  bản token lưu trong mỗi JWT.
- **Kiểm thử đầu cuối.** 1.512 test đơn vị và API, 344 test Playwright trên Chrome (máy tính và điện thoại), các luồng
  chính chạy lại trên Firefox và Safari của iPhone, kiểm tra khả năng truy cập bằng axe ở cả hai giao diện, CI cho mỗi
  lần push và test trên site thật sau mỗi lần deploy.

## Tính năng

### Tiền: giao dịch, danh mục và ví

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/transactions-dark-1440.jpg">
  <img src="docs/screenshots/transactions-1440.jpg" alt="Transactions page: month totals for income, expense and net, a search box, filters by category, wallet, sort and date range, and a list of transactions with category chips, tags and amounts">
</picture>

- Giao dịch thu và chi có danh mục, ví, ghi chú, tối đa 5 thẻ (tag) và ngày. "Tháng" tính theo giờ Việt Nam (UTC+7);
  số tiền là VND nguyên.
- Tìm kiếm, sắp xếp, lọc (tháng, khoảng ngày, loại, danh mục, ví, thẻ) và phân trang; bộ lọc được giữ trên URL.
- Danh mục có màu và biểu tượng. Danh mục còn giao dịch hoặc luật định kỳ thì không xoá được.
- Ví (tiền mặt, ngân hàng, ví điện tử) có số dư trực tiếp, chuyển tiền giữa các ví và lưu trữ ví.
- Xuất và nhập CSV (tối đa 500 dòng: dòng đúng được lưu, dòng sai được liệt kê kèm lý do).

<details>
<summary>Thêm ảnh: chi tiết giao dịch, danh mục, ví</summary>

<br>

![Transaction details drawer: amount, category, wallet, date, tags and note of one transaction, with edit and delete buttons](docs/screenshots/transaction-drawer-1440.jpg)

![Categories page: expense and income tabs, one card per category with its icon, and the form for a new category with a color and an icon picker](docs/screenshots/categories-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/wallets-dark-1440.jpg">
  <img src="docs/screenshots/wallets-1440.jpg" alt="Wallets page: the cash, bank and e-wallet cards with their balances and the transfers between them">
</picture>

</details>

### Lập kế hoạch: ngân sách, giao dịch định kỳ và mục tiêu

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/budgets-dark-1440.jpg">
  <img src="docs/screenshots/budgets-1440.jpg" alt="Budgets page: total budget, spent and left to spend for the month, and one card per category with a progress bar">
</picture>

- Ngân sách theo danh mục chi và theo tháng, cảnh báo ở 80% và ở 100%; chép ngân sách tháng trước chỉ với một cú bấm.
- Luật định kỳ (hằng tuần hoặc hằng tháng) tự tạo giao dịch thật khi đến hạn; tắt hoặc xoá luật vẫn giữ các giao dịch
  nó đã tạo.
- Mục tiêu tiết kiệm có nạp, rút và lịch sử; số tiền đã tiết kiệm không bao giờ âm.

<details>
<summary>Thêm ảnh: giao dịch định kỳ, mục tiêu</summary>

<br>

![Recurring page: the monthly Salary and Rent rules with their amount, next run date and an on/off switch](docs/screenshots/recurring-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/goals-dark-1440.jpg">
  <img src="docs/screenshots/goals-1440.jpg" alt="Goals page: two savings goals with a progress bar, the saved and target amounts, a deadline and Add money and Withdraw buttons">
</picture>

</details>

### Hiểu tiền của mình: dashboard, báo cáo và thông báo

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/dashboard-dark-1440.jpg">
  <img src="docs/screenshots/dashboard-1440.jpg" alt="Dashboard: the balance of the month, total income and total expense, a capsule bar chart of the last six months, wallets and budget alerts">
</picture>

- Dashboard: con số của tháng, biểu đồ, cảnh báo ngân sách, các mục tiêu gần nhất và gợi ý theo luật.
- Báo cáo: báo cáo tháng so với tháng trước, báo cáo năm và lịch chi tiêu theo ngày; in được.
- Thông báo trong ứng dụng cho ngân sách, mục tiêu, giao dịch định kỳ và bản tóm tắt hằng tuần; tắt được từng loại.

<details>
<summary>Thêm ảnh: báo cáo, lịch, thông báo</summary>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/reports-monthly-dark-1440.jpg">
  <img src="docs/screenshots/reports-monthly-1440.jpg" alt="Monthly report: income, expense and net compared with last month, and the spending of each category">
</picture>

![Yearly report: income and expense of the twelve months of the year](docs/screenshots/reports-yearly-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/reports-calendar-dark-1440.jpg">
  <img src="docs/screenshots/reports-calendar-1440.jpg" alt="Spending calendar: the days of the month with what was spent on each">
</picture>

![Notifications page: the list of notifications, newest first](docs/screenshots/notifications-1440.jpg)

</details>

### Thao tác nhanh

- Nhập nhanh hiểu được câu như `coffee 35k #work` hay `salary 15tr yesterday`, và mẫu giao dịch (template).
- Chọn nhiều dòng để chuyển sang danh mục khác hoặc xoá, có nút **Undo** sau khi xoá.
- Bảng lệnh (`Ctrl+K`), phím tắt (`N` thêm giao dịch, `/` tìm kiếm, `?` danh sách phím tắt) và breadcrumb.

<details>
<summary>Ảnh: bảng lệnh</summary>

<br>

![Command palette opened with Ctrl+K over the Dashboard: a search field and the list of pages and actions](docs/screenshots/command-palette-1440.jpg)

</details>

### Tài khoản, thiết bị và quản trị

- Hồ sơ với avatar có sẵn hoặc ảnh của bạn (cắt ngay trên trình duyệt), đổi mật khẩu, đăng xuất mọi thiết bị, giao diện
  (sáng, tối, theo hệ thống), ngày đầu tuần, ngôn ngữ, xuất dữ liệu (JSON) và xoá tài khoản.
- Đồng bộ thời gian thực giữa các thiết bị và xem offline khi cài như ứng dụng.
- Trang giới thiệu công khai `/welcome` có nút demo một chạm, thẻ SEO và ảnh chia sẻ.
- Trang Admin (vai trò `admin`): thống kê toàn site, danh sách tài khoản, khoá và mở khoá tài khoản.

<details>
<summary>Thêm ảnh: cài đặt, admin, ngôn ngữ khác</summary>

<br>

![Settings page: the sections Profile, Appearance, Preferences, Notifications, App and Data, and the profile form with the avatar, name and email](docs/screenshots/settings-1440.jpg)

![Admin page: the number of users, active users and transactions, line charts of new users and transactions over the last 30 days, and a link to manage users](docs/screenshots/admin-1440.jpg)

![The Dashboard in German](docs/screenshots/dashboard-de-1440.jpg)

![The Dashboard in Japanese](docs/screenshots/dashboard-ja-1440.jpg)

</details>

### Trên điện thoại

<p>
  <img src="docs/screenshots/dashboard-dark-390.jpg" alt="Dashboard on a phone, dark theme" width="180">
  <img src="docs/screenshots/transactions-dark-390.jpg" alt="Transactions on a phone, dark theme" width="180">
  <img src="docs/screenshots/budgets-390.jpg" alt="Budgets on a phone, light theme" width="180">
  <img src="docs/screenshots/reports-calendar-390.jpg" alt="Spending calendar on a phone, light theme" width="180">
</p>

Trang nào cũng có ảnh ở khổ 390 px trong [docs/screenshots](docs/screenshots/README.md), các trang chính có thêm bản giao diện tối.

## Công nghệ

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | ![React](https://img.shields.io/badge/React_19-20232a?logo=react&logoColor=61dafb) ![Vite](https://img.shields.io/badge/Vite_8-646cff?logo=vite&logoColor=white) ![React Router](https://img.shields.io/badge/React_Router_7-ca4245?logo=reactrouter&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5a29e4?logo=axios&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts_3-22b5bf) <br> CSS Modules với design token, i18next, lucide-react, motion, vite-plugin-pwa |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js_24-5fa04e?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger-85ea2d?logo=swagger&logoColor=black) <br> REST API, JWT + bcryptjs, helmet, express-rate-limit, compression, swagger-jsdoc + swagger-ui-express |
| **Cơ sở dữ liệu** | ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47a248?logo=mongodb&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose_9-880000?logo=mongoose&logoColor=white) |
| **Thời gian thực** | ![Socket.IO](https://img.shields.io/badge/Socket.IO_4-010101?logo=socketdotio&logoColor=white) chạy chung server với API |
| **Kiểm thử** | ![Vitest](https://img.shields.io/badge/Vitest_5-6e9f18?logo=vitest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-e33332?logo=testinglibrary&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2ead33?logo=playwright&logoColor=white) <br> Supertest, mongodb-memory-server, axe-core, ESLint |
| **CI/CD** | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088ff?logo=githubactions&logoColor=white) `ci.yml` cho mỗi push và pull request, `live-smoke.yml` sau mỗi lần deploy `main` |
| **Hosting** | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ứng dụng · ![Render](https://img.shields.io/badge/Render-46e3b7?logo=render&logoColor=black) API · ![MongoDB Atlas](https://img.shields.io/badge/Atlas-47a248?logo=mongodb&logoColor=white) cơ sở dữ liệu |

## Kiến trúc

```mermaid
flowchart LR
    subgraph Browser["Trình duyệt"]
        App["Ứng dụng React (PWA)<br/>pages, context, src/api"]
        SW["Service worker<br/>bản offline của dữ liệu đã tải"]
    end
    Vercel["Vercel<br/>bản build tĩnh, SPA rewrite,<br/>security headers"]
    subgraph Render["Render (Node.js 24)"]
        MW["Middleware Express<br/>helmet, CORS, rate limit,<br/>giới hạn JSON, chặn toán tử"]
        Layers["routes → validation →<br/>controllers → services → models"]
        Socket["Socket.IO<br/>data:changed, notification:new"]
        Docs["Swagger UI /api-docs"]
    end
    Atlas[("MongoDB Atlas")]

    Vercel -->|HTML, JS, CSS| App
    App -->|"HTTPS + Bearer JWT"| MW
    MW --> Layers
    Layers -->|Mongoose| Atlas
    Layers -->|sau mỗi lần ghi| Socket
    Socket <-->|"WebSocket + JWT"| App
    App -.- SW
```

Mỗi lớp của server làm đúng một việc: **route** khai báo đường dẫn, chú thích Swagger và middleware kiểm tra dữ liệu;
**controller** đọc request và trả response; **service** chứa nghiệp vụ; **model** là schema Mongoose. Client chỉ gọi API
qua `client/src/api` (một instance Axios gắn token và chuyển lỗi thành mã). Đường đi đầy đủ của một request, luồng thời
gian thực, chế độ offline và i18n được giải thích trong [docs/architecture.md](docs/architecture.md).

### Mô hình dữ liệu

Mười collection; mọi document (trừ user) thuộc về một người dùng qua `userId`. Field, index và lý do thiết kế:
[docs/database.md](docs/database.md).

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ TRANSACTION : records
    USER ||--o{ WALLET : holds
    USER ||--o{ TRANSFER : makes
    USER ||--o{ BUDGET : sets
    USER ||--o{ RECURRING_RULE : schedules
    USER ||--o{ GOAL : saves
    USER ||--o{ TRANSACTION_TEMPLATE : keeps
    USER ||--o{ NOTIFICATION : receives
    CATEGORY ||--o{ TRANSACTION : classifies
    CATEGORY ||--o{ BUDGET : limits
    CATEGORY ||--o{ RECURRING_RULE : classifies
    CATEGORY ||--o{ TRANSACTION_TEMPLATE : prefills
    WALLET |o--o{ TRANSACTION : keeps
    WALLET ||--o{ TRANSFER : "sends / receives"
    RECURRING_RULE |o--o{ TRANSACTION : creates
    GOAL ||--o{ CONTRIBUTION : "holds (embedded)"

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "user | admin"
        string status "active | disabled"
        number tokenVersion
        object preferences
        object avatar
    }
    CATEGORY {
        ObjectId userId FK
        string name "unique per user and type"
        string type "income | expense"
        string color
        string icon
    }
    TRANSACTION {
        ObjectId userId FK
        ObjectId categoryId FK
        ObjectId walletId FK
        ObjectId recurringRuleId FK
        string type
        number amount "whole VND"
        string currency
        string note
        string_array tags
        date date
    }
    WALLET {
        ObjectId userId FK
        string name
        string type "cash | bank | ewallet"
        string color
        number initialBalance
        boolean archived
        boolean isDefault
    }
    TRANSFER {
        ObjectId userId FK
        ObjectId fromWalletId FK
        ObjectId toWalletId FK
        number amount
        string note
        date date
    }
    BUDGET {
        ObjectId userId FK
        ObjectId categoryId FK
        string month "YYYY-MM"
        number amount
    }
    RECURRING_RULE {
        ObjectId userId FK
        ObjectId categoryId FK
        number amount
        string note
        string frequency "weekly | monthly"
        date startDate
        date nextRunDate
        date endDate
        boolean active
    }
    GOAL {
        ObjectId userId FK
        string name
        number targetAmount
        number savedAmount
        date deadline
        string color
    }
    CONTRIBUTION {
        number amount "+ deposit, - withdrawal"
        string note
        date date
    }
    TRANSACTION_TEMPLATE {
        ObjectId userId FK
        ObjectId categoryId FK
        string name
        number amount
        string note
    }
    NOTIFICATION {
        ObjectId userId FK
        string type
        string title
        string message
        string link
        object params
        boolean read
        string dedupeKey "unique per user"
    }
```

## Tổng quan API

Base URL `https://ledgerling-api.onrender.com/api`. Mọi response có dạng `{ success: true, data }` hoặc
`{ success: false, message, code }`. **JWT** nghĩa là cần header `Authorization: Bearer <token>`; **Admin** là JWT của
tài khoản có vai trò `admin`. Thử mọi route trong **[Swagger UI](https://ledgerling-api.onrender.com/api-docs)**; quy
ước, mã lỗi, phân trang và ví dụ `curl` nằm ở [docs/api.md](docs/api.md), từng request và response ở
[docs/api-plan.md](docs/api-plan.md).

<details>
<summary><b>Toàn bộ 71 endpoint</b> (bấm để mở)</summary>

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/health` | – | API có đang chạy không, và commit nào đang trả lời |
| POST | `/auth/register` | – | Tạo tài khoản và nhận token |
| POST | `/auth/login` | – | Đăng nhập và nhận token |
| POST | `/auth/demo` | – | Đăng nhập vào tài khoản demo dùng chung |
| GET | `/auth/me` | JWT | Người dùng hiện tại |
| POST | `/auth/logout-all` | JWT | Đăng xuất mọi thiết bị (không áp dụng cho demo) |
| GET | `/categories` | JWT | Danh sách danh mục (`?type=`) |
| POST | `/categories` | JWT | Tạo danh mục |
| GET | `/categories/:id` | JWT | Một danh mục |
| PATCH | `/categories/:id` | JWT | Đổi tên, màu hoặc biểu tượng |
| DELETE | `/categories/:id` | JWT | Xoá (409 khi còn giao dịch hoặc luật định kỳ dùng nó) |
| GET | `/transactions` | JWT | Danh sách có tìm kiếm, lọc, sắp xếp và phân trang |
| POST | `/transactions` | JWT | Tạo giao dịch (loại lấy theo danh mục) |
| GET | `/transactions/export` | JWT | Tải về CSV (cùng bộ lọc, không phân trang) |
| POST | `/transactions/import` | JWT | Nhập các dòng CSV (tối đa 500) |
| POST | `/transactions/bulk-delete` | JWT | Xoá 1–200 giao dịch một lần |
| PATCH | `/transactions/bulk-category` | JWT | Chuyển 1–200 giao dịch sang danh mục khác |
| GET | `/transactions/:id` | JWT | Một giao dịch |
| PATCH | `/transactions/:id` | JWT | Sửa giao dịch |
| DELETE | `/transactions/:id` | JWT | Xoá giao dịch |
| GET | `/tags` | JWT | Các thẻ đã dùng và số giao dịch mang mỗi thẻ |
| GET | `/wallets` | JWT | Danh sách ví kèm số dư |
| POST | `/wallets` | JWT | Tạo ví |
| GET | `/wallets/:id` | JWT | Một ví kèm số dư |
| PATCH | `/wallets/:id` | JWT | Sửa, lưu trữ hoặc khôi phục ví |
| DELETE | `/wallets/:id` | JWT | Xoá (409 với ví mặc định hoặc ví đã có lịch sử) |
| GET | `/transfers` | JWT | Các lần chuyển tiền, mới nhất trước, một trang |
| POST | `/transfers` | JWT | Chuyển tiền giữa hai ví của mình |
| DELETE | `/transfers/:id` | JWT | Xoá lần chuyển (tiền quay về ví cũ) |
| GET | `/stats/summary` | JWT | Số liệu Dashboard của một tháng |
| GET | `/budgets` | JWT | Ngân sách của một tháng, kèm số đã chi |
| POST | `/budgets` | JWT | Tạo ngân sách cho một danh mục chi |
| POST | `/budgets/copy` | JWT | Chép ngân sách từ tháng này sang tháng khác |
| PATCH | `/budgets/:id` | JWT | Đổi số tiền |
| DELETE | `/budgets/:id` | JWT | Xoá ngân sách |
| GET | `/recurring` | JWT | Danh sách luật định kỳ |
| POST | `/recurring` | JWT | Tạo luật |
| PUT | `/recurring/:id` | JWT | Thay toàn bộ một luật |
| PATCH | `/recurring/:id/toggle` | JWT | Bật hoặc tắt luật |
| DELETE | `/recurring/:id` | JWT | Xoá luật (giữ các giao dịch đã tạo) |
| GET | `/goals` | JWT | Danh sách mục tiêu tiết kiệm |
| POST | `/goals` | JWT | Tạo mục tiêu |
| GET | `/goals/:id` | JWT | Một mục tiêu kèm lịch sử |
| PUT | `/goals/:id` | JWT | Thay toàn bộ một mục tiêu |
| DELETE | `/goals/:id` | JWT | Xoá mục tiêu và lịch sử của nó |
| POST | `/goals/:id/contributions` | JWT | Nạp vào hoặc rút ra khỏi mục tiêu |
| DELETE | `/goals/:id/contributions/:contributionId` | JWT | Xoá một lần nạp/rút |
| GET | `/reports/monthly` | JWT | Một tháng so với tháng trước |
| GET | `/reports/yearly` | JWT | Thu và chi của 12 tháng |
| GET | `/insights` | JWT | Tối đa 6 gợi ý theo luật về một tháng |
| GET | `/templates` | JWT | Danh sách mẫu giao dịch |
| POST | `/templates` | JWT | Tạo mẫu |
| GET | `/templates/:id` | JWT | Một mẫu |
| PATCH | `/templates/:id` | JWT | Sửa mẫu |
| DELETE | `/templates/:id` | JWT | Xoá mẫu |
| GET | `/notifications` | JWT | Thông báo, mới nhất trước |
| GET | `/notifications/unread-count` | JWT | Số thông báo chưa đọc |
| PATCH | `/notifications/read-all` | JWT | Đánh dấu tất cả là đã đọc |
| PATCH | `/notifications/:id/read` | JWT | Đánh dấu một thông báo là đã đọc |
| DELETE | `/notifications/:id` | JWT | Xoá thông báo |
| PATCH | `/users/me` | JWT | Đổi tên |
| DELETE | `/users/me` | JWT | Xoá tài khoản và toàn bộ dữ liệu (không áp dụng cho demo) |
| PATCH | `/users/me/password` | JWT | Đổi mật khẩu (không áp dụng cho demo) |
| PATCH | `/users/me/avatar` | JWT | Chọn avatar có sẵn hoặc tải ảnh lên (không áp dụng cho demo) |
| DELETE | `/users/me/avatar` | JWT | Bỏ avatar (không áp dụng cho demo) |
| PATCH | `/users/me/preferences` | JWT | Giao diện, ngày đầu tuần, ngôn ngữ, thông báo |
| GET | `/users/me/export` | JWT | Tải toàn bộ dữ liệu dạng JSON |
| GET | `/admin/stats` | Admin | Số liệu cho trang Admin |
| GET | `/admin/users` | Admin | Danh sách tài khoản, mới nhất trước |
| PATCH | `/admin/users/:id/status` | Admin | Khoá hoặc mở khoá tài khoản |

</details>

## Cài đặt và chạy

### Yêu cầu

- **Node.js 24** (trường `engines` của cả hai package và file [.nvmrc](.nvmrc); dùng nvm thì chạy `nvm use`)
- **MongoDB**: một cluster [MongoDB Atlas](https://www.mongodb.com/atlas) miễn phí hoặc MongoDB server cài trên máy
- Git, và mỗi phía một cửa sổ terminal

### Chạy trên máy

```bash
git clone https://github.com/minhtriqn05/ledgerling.git
cd ledgerling

# 1. API ở http://localhost:4000 (Swagger ở http://localhost:4000/api-docs)
cd server
npm ci
cp .env.example .env      # điền MONGODB_URI, JWT_SECRET và DEMO_PASSWORD
npm run seed              # tuỳ chọn: tạo tài khoản demo có dữ liệu mẫu
npm run dev

# 2. Ứng dụng ở http://localhost:5173 (ở terminal thứ hai)
cd client
npm ci
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm run dev
```

- `npm run seed` chỉ đụng tới document của người dùng demo (`demo@example.com`) nên chạy lại bao nhiêu lần cũng được; mỗi
  lần chạy sẽ dời ngày của dữ liệu mẫu về đến hôm nay. Chưa seed thì nút **Try the demo** trả về 503 `DEMO_UNAVAILABLE`.
- Admin chỉ tạo được từ terminal (không route nào làm được): `npm run make-admin -- you@example.com` trong `server/`.

### Biến môi trường

**server/.env** (chép từ [server/.env.example](server/.env.example))

| Tên | Bắt buộc | Ví dụ (giả) | Tác dụng |
|-----|----------|-------------|----------|
| `MONGODB_URI` | có | `mongodb+srv://user:password@cluster0.example.mongodb.net/ledgerling` | Chuỗi kết nối cơ sở dữ liệu |
| `JWT_SECRET` | có | `change-me-to-a-long-random-string` | Khoá ký token |
| `CLIENT_URL` | có | `http://localhost:5173` | Địa chỉ ứng dụng được CORS và Socket.IO cho phép, cách nhau bằng dấu phẩy |
| `JWT_EXPIRES_IN` | không | `7d` (mặc định) | Thời hạn token: `12h`, `7d`, `3600`... |
| `PORT` | không | `4000` | Cổng của API (Render tự đặt) |
| `NODE_ENV` | không | `production` | Dùng trên Render; ẩn chi tiết lỗi validation của cơ sở dữ liệu |
| `DEMO_PASSWORD` | khi chạy `npm run seed` | `demo-password-123` | Mật khẩu tài khoản demo, ít nhất 6 ký tự |
| `RATE_LIMIT_OFF` | không | `true` | Tắt rate limit; chỉ dành cho API của test end-to-end |
| `RENDER_GIT_COMMIT` | Render tự đặt | – | `/api/health` hiển thị nó trong `version` |

Server không chịu khởi động, và báo rõ tên biến, khi thiếu `MONGODB_URI`, `JWT_SECRET` hoặc `CLIENT_URL`, hoặc khi
`JWT_EXPIRES_IN` không phải một khoảng thời gian hợp lệ.

**client/.env** (chép từ [client/.env.example](client/.env.example))

| Tên | Bắt buộc | Ví dụ (giả) | Tác dụng |
|-----|----------|-------------|----------|
| `VITE_API_URL` | có | `http://localhost:4000/api` | Base URL của API, kết thúc bằng `/api` |
| `VITE_SITE_URL` | không | `https://ledgerling.example.com` | Địa chỉ công khai cho link canonical và ảnh chia sẻ; mặc định là địa chỉ Vercel cấp cho bản build |

### npm scripts

| Thư mục | Script | Tác dụng |
|---------|--------|----------|
| server | `npm run dev` | API chạy bằng nodemon (tự khởi động lại khi lưu file) |
| server | `npm start` | API chạy bằng Node (Render dùng lệnh này) |
| server | `npm run seed` | Tạo hoặc làm mới tài khoản demo |
| server | `npm run make-admin -- <email>` | Cấp vai trò admin cho một tài khoản |
| server | `npm run start:e2e` | API ở cổng 4100 với MongoDB trong bộ nhớ, cho Playwright |
| server | `npm test` / `npm run test:coverage` | Vitest + Supertest, có ngưỡng coverage |
| server | `npm run lint` | ESLint, không cho phép cảnh báo nào |
| client | `npm run dev` | Vite dev server ở cổng 5173 |
| client | `npm run build` / `npm run preview` | Build production vào `dist/` và chạy thử bản build |
| client | `npm test` / `npm run test:coverage` | Vitest + React Testing Library, có ngưỡng coverage |
| client | `npm run test:e2e` | Playwright: Chrome máy tính và điện thoại, rồi `@smoke` trên Firefox và WebKit |
| client | `npm run test:e2e:chromium` / `test:e2e:smoke` | Chạy riêng một trong hai phần trên |
| client | `npm run test:e2e:live` | Kiểm tra site đã deploy bằng một tài khoản tạm |
| client | `npm run lint` / `npm run i18n:check` | ESLint; mọi key có đủ ở 8 ngôn ngữ |
| client | `npm run screenshots:docs` | Chụp lại các ảnh trong `docs/screenshots` |
| client | `npm run og-image` / `generate-pwa-assets` | Ảnh chia sẻ và icon PWA |

## Kiểm thử

| Loại | Công cụ | Kết quả (3/11/2026) |
|------|---------|---------------------|
| Test API | Vitest, Supertest, mongodb-memory-server | **665 test** trong 38 file: mọi route, quyền sở hữu (404 với id của người khác), validation, giờ Việt Nam, đối chiếu số tiền, chạy đồng thời, index, và đối chiếu tài liệu với code |
| Coverage API | @vitest/coverage-v8 | **94,8% dòng, 90,8% nhánh** (dưới 80% là fail) |
| Test đơn vị client | Vitest, React Testing Library, jsdom | **847 test** trong 97 file |
| Coverage client | @vitest/coverage-v8 | **68,4% dòng**; `src/utils` 94,0%, `src/hooks` 100% (dưới 60% / 80% là fail) |
| End-to-end | Playwright trên bản build production | **337 pass, 7 bỏ qua** (test chỉ dành cho điện thoại hoặc chỉ cho máy tính) trên Chrome desktop + Pixel 7; **52 pass** test `@smoke` trên Firefox + Safari iPhone 14 |
| Khả năng truy cập | axe-core trong Playwright | **0 lỗi mức serious hay critical** trên mọi trang, cả sáng và tối, kèm hộp thoại, drawer, tour và bảng lệnh |
| Site thật | Playwright trên bản đã deploy | health, Swagger, ứng dụng và header của nó, demo, rate limit và luồng chính với một tài khoản tạm bị xoá khi xong |
| Tĩnh | ESLint, `i18n:check` | 0 cảnh báo ở cả hai phía; 8 ngôn ngữ × 967 key |

Test end-to-end tự khởi động API riêng với cơ sở dữ liệu trong bộ nhớ, nên không bao giờ đụng tới Atlas. Cách tổ chức
từng bộ test và cách chạy riêng một file: [docs/testing.md](docs/testing.md).

## Hiệu năng

- Mỗi trang là một chunk riêng (`React.lazy`), và bảy ngôn ngữ ngoài tiếng Anh chỉ tải khi được chọn: trang đầu tiên chỉ
  cần khoảng **268 kB JavaScript đã gzip** (trước đây 370 kB).
- API nén response (gzip), và mọi danh sách, mọi phép kiểm tra đều đi qua index (`server/tests/indexes.test.js` kiểm tra
  các truy vấn chính bằng `explain()`).
- Lighthouse, lần truy cập đầu, bản build production: hiệu năng **98** trên máy tính cho cả `/welcome` lẫn Dashboard;
  trên điện thoại giả lập chậm là **77** (`/welcome`) và **67** (Dashboard), vì trang được vẽ bằng JavaScript.
  Accessibility, Best Practices và SEO đều **100**.

## Khả năng truy cập

- axe-core chạy trên mọi trang ở cả hai giao diện trong bộ test end-to-end: không cho phép lỗi mức serious hay critical.
- Mọi màu chữ đạt tương phản WCAG AA (4.5:1) trên nền của nó; màu không bao giờ là tín hiệu duy nhất (số tiền có `+` /
  `−`, trạng thái có biểu tượng).
- Dùng được hoàn toàn bằng bàn phím: link bỏ qua menu, focus nhìn thấy được, focus quay về nút đã mở hộp thoại, phím tắt.
- Mọi chuyển động tuân theo `prefers-reduced-motion`.

## Bảo mật

- Mật khẩu được băm bằng bcrypt; đăng nhập mất cùng một khoảng thời gian dù email có tồn tại hay không.
- JWT có hạn dùng và số phiên bản token: đổi mật khẩu, "đăng xuất mọi thiết bị" hoặc tài khoản bị khoá đều làm mọi token
  cũ mất hiệu lực và đóng các kết nối thời gian thực của nó.
- Mọi route kiểm tra dữ liệu vào và bỏ các field lạ; toán tử MongoDB trong body hay query bị từ chối; kích thước body có
  giới hạn (100 kB, 300 kB khi nhập CSV, 200 kB cho ảnh).
- Mọi truy vấn chỉ trong phạm vi người dùng đang đăng nhập: id của người khác trả về 404, nên id không tiết lộ gì.
- Header của helmet, danh sách CORS cho phép, rate limit theo người truy cập (300 request / 15 phút cho API, 20 / 15 phút
  cho đăng nhập, đăng ký và demo), và không có stack trace trong response lỗi.
- File CSV xuất ra được chống formula injection; ảnh tải lên được kiểm tra theo kiểu file thật.
- Báo lỗ hổng một cách riêng tư: [SECURITY.md](SECURITY.md).

## Đa ngôn ngữ

- 8 ngôn ngữ: English (mặc định và là bản gốc), Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語, 한국어.
- i18next có tự nhận diện ngôn ngữ; lựa chọn được lưu trong `localStorage` và trong tuỳ chọn của người dùng, `<html lang>`
  đổi theo. Tiếng Trung, Nhật, Hàn chuyển sang font hệ thống của chữ viết đó.
- Ngày và số đi qua `Intl` (`client/src/utils/format.js`); số tiền luôn là VND.
- API trả lời bằng tiếng Anh kèm `code` cố định, và ứng dụng hiển thị bản dịch của mã đó.
- `npm run i18n:check` báo lỗi khi thiếu key ở bất kỳ ngôn ngữ nào; một test phía server kiểm tra mọi mã lỗi API đều có
  bản dịch.

## Triển khai

| Phần | Nơi chạy | Thiết lập |
|------|----------|-----------|
| API | Web service trên [Render](https://render.com) | root `server`, build `npm ci`, start `npm start`, Node 24 theo `engines`, biến môi trường như bảng trên |
| Ứng dụng | [Vercel](https://vercel.com) | root `client`, framework Vite, build `npm run build`, output `dist`, `VITE_API_URL` |
| Cơ sở dữ liệu | [MongoDB Atlas](https://www.mongodb.com/atlas) | cluster M0 miễn phí, một database user cho API, mở network access cho Render |

Push lên `main` là cả hai phía tự deploy. Từng bước, kể cả cách deploy lại và quay về bản cũ:
[docs/deployment.md](docs/deployment.md).

## CI/CD

| Workflow | Khi nào | Làm gì |
|----------|---------|--------|
| [ci.yml](.github/workflows/ci.yml) | mỗi push và pull request | server: lint + test có coverage; client: lint, kiểm tra i18n, test có coverage và build; Playwright trên Chrome (mọi test) và trên Firefox + WebKit (`@smoke`) ở các job song song |
| [live-smoke.yml](.github/workflows/live-smoke.yml) | sau mỗi push lên `main`, hoặc chạy tay | chờ đến khi Render chạy commit mới (`/api/health` hiển thị nó), kiểm tra Vercel có trả lời, rồi chạy `npm run test:e2e:live` |

Không cần secret nào: test dùng MongoDB trong bộ nhớ, còn test site thật tự tạo tài khoản tạm.

## Cấu trúc thư mục

```text
ledgerling/
├── .github/            workflow CI và live-smoke, mẫu issue, mẫu pull request
├── client/             ứng dụng React (Vite)
│   ├── e2e/            test Playwright (e2e/live/ kiểm tra site đã deploy)
│   ├── public/         icon, ảnh chia sẻ, robots.txt
│   ├── scripts/        kiểm tra i18n, địa chỉ site, ảnh chia sẻ
│   └── src/
│       ├── api/        mọi lời gọi API (một instance Axios)
│       ├── components/ UI dùng chung: Button, Modal, Drawer, Select, DatePicker, Tour...
│       ├── config/     menu, breadcrumb, các mục của Settings
│       ├── context/    đăng nhập, giao diện, toast, thông báo, socket thời gian thực
│       ├── hooks/      React hook dùng lại
│       ├── i18n/       cấu hình i18next
│       ├── locales/    en.json (bản gốc) + 7 bản dịch
│       ├── pages/      mỗi trang một file hoặc một thư mục
│       ├── styles/     tokens.css: mọi màu, font và khoảng cách
│       └── utils/      định dạng, ngày giờ Việt Nam, CSV, bộ phân tích nhập nhanh...
├── server/             API Express
│   ├── src/
│   │   ├── config/     kiểm tra biến môi trường, database, CORS, Swagger
│   │   ├── routes/     router kèm chú thích Swagger
│   │   ├── middlewares/ xác thực, vai trò, validation, rate limit, lỗi
│   │   ├── controllers/ nhận request, trả response
│   │   ├── services/   nghiệp vụ, sự kiện thời gian thực
│   │   ├── models/     schema Mongoose
│   │   ├── utils/      hàm tiện ích dùng chung
│   │   └── scripts/    make-admin
│   └── tests/          Vitest + Supertest
└── docs/               kiến trúc, cơ sở dữ liệu, API, kiểm thử, triển khai, ảnh chụp, tài sản hình ảnh
```

## Hướng phát triển

- Prerender trang giới thiệu để điểm Lighthouse trên điện thoại vượt 90.
- Hỗ trợ nhiều loại tiền kèm tỷ giá (hiện mọi số tiền là VND).
- Rate limit dùng chung giữa nhiều instance server (hiện đếm trong bộ nhớ).
- Xoá một danh mục đúng lúc thiết bị khác tạo giao dịch cho danh mục đó có thể để lại một giao dịch mồ côi; dùng
  transaction của MongoDB trên hai collection sẽ xử lý được trường hợp này.
- Tính năng email: đặt lại mật khẩu và gửi bản tóm tắt hằng tuần qua email.

## Môn học

| | |
|---|---|
| **Môn học** | Phát triển ứng dụng web và cơ sở dữ liệu |
| **Lớp** | CSBU109.R11.KHBC |
| **Trường** | Trường Đại học Công nghệ Thông tin (UIT), Đại học Quốc gia Thành phố Hồ Chí Minh (ĐHQG-HCM) |
| **Sinh viên** | Nguyễn Minh Trí (23560042) |
| **Giảng viên** | Nguyễn Thanh Bình |
| **Hình thức** | Đồ án cá nhân: backend, frontend, cơ sở dữ liệu và triển khai đều do mình tự làm |

## Tác giả

**Nguyễn Minh Trí**

- GitHub: [@minhtriqn05](https://github.com/minhtriqn05)
- LinkedIn: [nguyenminhtri-uit](https://www.linkedin.com/in/nguyenminhtri-uit)

Câu hỏi và ý tưởng xin gửi vào [Issues](https://github.com/minhtriqn05/ledgerling/issues); đọc
[CONTRIBUTING.md](CONTRIBUTING.md) trước nhé.

## Ghi nhận

- [React](https://react.dev), [Vite](https://vite.dev), [React Router](https://reactrouter.com),
  [Axios](https://axios-http.com), [Recharts](https://recharts.org), [i18next](https://www.i18next.com),
  [motion](https://motion.dev), [vite-plugin-pwa](https://vite-pwa-org.netlify.app) và
  [PapaParse](https://www.papaparse.com) ở phía client.
- [Express](https://expressjs.com), [Mongoose](https://mongoosejs.com), [Socket.IO](https://socket.io),
  [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc), [helmet](https://helmetjs.github.io) và
  [bcrypt.js](https://github.com/dcodeIO/bcrypt.js) ở phía server.
- [Vitest](https://vitest.dev), [Testing Library](https://testing-library.com), [Playwright](https://playwright.dev),
  [axe-core](https://github.com/dequelabs/axe-core) và
  [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) cho phần kiểm thử.
- [React Bits](https://reactbits.dev), [GSAP](https://gsap.com) và [Lenis](https://lenis.darkroom.engineering): các
  demo của họ là nguồn cảm hứng cho chuyển động của trang giới thiệu. Bản thân ứng dụng dùng `motion` và CSS; không thư
  viện nào trong ba cái này được đóng gói vào app.
- Icon: [Lucide](https://lucide.dev) (giấy phép ISC). Font: [Manrope](https://fonts.google.com/specimen/Manrope) và
  [Newsreader](https://fonts.google.com/specimen/Newsreader) từ Google Fonts (SIL Open Font License).
- Badge từ [Shields.io](https://shields.io). Logo được vẽ tay bằng SVG cho dự án này ([docs/brand](docs/brand/README.md)).

## Giấy phép

[MIT](LICENSE) © 2026 Nguyễn Minh Trí

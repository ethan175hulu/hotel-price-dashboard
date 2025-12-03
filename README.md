# 酒店竞对监控Web系统

一个轻量级的酒店竞对价格监控分析系统，纯前端实现，支持Excel数据上传和可视化分析。

## 功能特性

### 核心功能
- **Excel数据解析**：支持 `.xlsx`, `.xlsm`, `.xls` 格式
- **批次识别对比**：自动识别数据批次，对比价格变化
- **价格分析**：排名、市场均价、竞对均价、价格优势
- **F1 竞品异常检测**：智能分档阈值，检测异常涨跌
- **F2 价格战检测**：多家降价预警（≥3家中风险，≥5家高风险）
- **可视化图表**：价格趋势图、排名波动图

### UI特点
- 响应式设计，支持PC/平板/手机
- 现代化界面，Tailwind CSS样式
- 交互式图表（Chart.js）

## 数据格式要求

Excel文件需包含名为 `酒店信息` 的Sheet，列定义如下：

| 列 | 内容 |
|---|---|
| A | 酒店名称 |
| B | 抓取日期 |
| E | 价格 |
| H | 抓取时间（批次标识） |

## 项目结构

```
hotel-competitor-web/
├── index.html              # 登录页
├── dashboard.html          # 主看板页
├── README.md
│
├── js/
│   ├── main.js             # 主入口
│   ├── config/
│   │   └── constants.js    # 配置常量
│   └── modules/
│       ├── auth.js         # 认证模块
│       ├── excelParser.js  # Excel解析
│       ├── dataProcessor.js# 数据处理
│       └── chartRenderer.js# 图表渲染
│
└── css/                    # 样式目录（使用Tailwind CDN）
```

## 快速开始

### 本地运行

1. 使用任意HTTP服务器启动项目：
   ```bash
   # 使用Python
   python -m http.server 8080
   
   # 或使用Node.js的http-server
   npx http-server -p 8080
   
   # 或使用VS Code的Live Server插件
   ```

2. 访问 `http://localhost:8080`

3. 登录（默认账号）：
   - 用户名: `admin`
   - 密码: `hotel2024`

4. 上传Excel文件，查看分析结果

### 部署到Zeabur

1. 将项目推送到GitHub
2. 登录 [Zeabur](https://zeabur.com)
3. 创建新项目，连接GitHub仓库
4. 自动识别为静态网站并部署

## 技术栈

- **前端框架**：原生HTML/CSS/JavaScript (ES6+)
- **UI样式**：Tailwind CSS (CDN)
- **图表库**：Chart.js
- **Excel解析**：SheetJS (XLSX)

## 用户配置

默认用户在 `js/config/constants.js` 中配置：

```javascript
export const USERS = {
    'admin': 'hotel2024',
    'user1': 'pass123',
    'user2': 'pass456',
    'user3': 'pass789'
};
```

> ⚠️ 注意：密码存储在前端代码中，仅适用于内部小团队使用。

## 预警规则

### F1 竞品异常检测

根据目标酒店价格分档设置阈值：

| 价格区间 | 中风险阈值 | 高风险阈值 |
|---------|----------|----------|
| 100-200元 | ≥30元 | ≥60元 |
| 200-300元 | ≥40元 | ≥80元 |
| 300-400元 | ≥50元 | ≥100元 |
| ... | ... | ... |

### F2 价格战检测

| 降价酒店数量 | 风险等级 |
|------------|---------|
| < 3家 | 无风险 |
| 3-4家 | 中风险 |
| ≥ 5家 | 高风险 |

## License

MIT
123


123123123
1231231561


1265156
156165
156



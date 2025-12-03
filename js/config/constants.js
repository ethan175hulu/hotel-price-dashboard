/**
 * 系统配置常量
 */

// 用户配置（简单密码验证）
export const USERS = {
    'admin': 'hotel2024',
    'user1': 'pass123',
    'user2': 'pass456',
    'user3': 'pass789'
};

// 登录有效期（7天）
export const LOGIN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Excel列映射 - 根据用户Excel结构配置
export const EXCEL_COLUMNS = {
    HOTEL_NAME: 'A',     // 酒店名称
    DATE: 'B',           // 抓取日期
    PRICE: 'E',          // 价格
    BATCH_TIME: 'H',     // 抓取时间（批次标识）
    SHEET_NAME: '酒店信息' // 数据Sheet名称
};

// 支持的Excel文件格式
export const SUPPORTED_FORMATS = ['.xlsx', '.xlsm', '.xls'];

// 价格异常检测阈值配置
export const ANOMALY_THRESHOLDS = {
    BASE_MEDIUM_RISK: 30,   // 基础中风险阈值
    LEVEL_INCREMENT: 10,    // 每档增加
    HIGH_RISK_MULTIPLIER: 2 // 高风险倍数
};

// 价格战检测阈值
export const PRICE_WAR_THRESHOLDS = {
    MEDIUM_RISK: 3,  // 中风险：3-4家降价
    HIGH_RISK: 5     // 高风险：5家及以上降价
};

// 图表颜色配置
export const CHART_COLORS = {
    PRIMARY: '#3b82f6',      // 蓝色 - 目标酒店
    SECONDARY: '#9ca3af',    // 灰色 - 市场均价
    ACCENT: '#f59e0b',       // 橙色 - 竞对均价
    SUCCESS: '#10b981',      // 绿色 - 降价/优势
    DANGER: '#ef4444',       // 红色 - 涨价/劣势
    WARNING: '#f97316',      // 橙色 - 警告
    PURPLE: '#8b5cf6'        // 紫色 - 排名
};

// 风险等级配置
export const RISK_LEVELS = {
    HIGH: {
        label: '高风险',
        color: 'red',
        bgClass: 'bg-red-100 text-red-800',
        borderClass: 'border-red-500'
    },
    MEDIUM: {
        label: '中风险',
        color: 'orange',
        bgClass: 'bg-orange-100 text-orange-800',
        borderClass: 'border-orange-500'
    },
    LOW: {
        label: '低风险',
        color: 'green',
        bgClass: 'bg-green-100 text-green-800',
        borderClass: 'border-green-500'
    }
};

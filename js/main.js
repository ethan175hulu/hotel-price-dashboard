/**
 * 主入口 - 协调各模块
 */

import { requireAuth, getCurrentUser, logout } from './modules/auth.js';
import { parseExcelFile, validateFileFormat, getTargetHotel } from './modules/excelParser.js';
import { 
    getUniqueDates, 
    analyzeDateData, 
    calculateSummary, 
    calculateCompetitorSummary 
} from './modules/dataProcessor.js';
import { renderPriceChart, renderRankChart, destroyCharts } from './modules/chartRenderer.js';

// 全局状态
let appState = {
    rawData: [],
    targetHotel: '',
    analysisResults: [],
    summary: null,
    competitorSummary: [],
    activeDateIndex: 0
};

/**
 * 初始化应用
 */
export function initApp() {
    // 检查认证
    if (!requireAuth()) return;
    
    // 显示用户名
    const userEl = document.getElementById('currentUser');
    if (userEl) {
        userEl.textContent = getCurrentUser() || '用户';
    }
    
    // 绑定登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 初始化文件上传
    initFileUpload();
}

/**
 * 初始化文件上传
 */
function initFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!dropZone || !fileInput) return;
    
    // 点击上传
    dropZone.addEventListener('click', () => fileInput.click());
    
    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

/**
 * 处理文件上传
 */
async function handleFileUpload(file) {
    showLoading(true);
    hideError();
    
    try {
        // 验证格式
        if (!validateFileFormat(file)) {
            throw new Error('不支持的文件格式，请上传 .xlsx, .xlsm 或 .xls 文件');
        }
        
        // 显示文件名
        updateFileName(file.name);
        
        // 解析Excel
        const data = await parseExcelFile(file);
        
        if (data.length === 0) {
            throw new Error('Excel文件中没有找到有效数据');
        }
        
        // 保存数据
        appState.rawData = data;
        appState.targetHotel = getTargetHotel(data);
        
        // 分析数据
        processData();
        
        // 渲染界面
        renderDashboard();
        
        showLoading(false);
        
    } catch (error) {
        console.error('文件处理失败:', error);
        showError(error.message);
        showLoading(false);
    }
}

/**
 * 处理数据分析
 */
function processData() {
    const dates = getUniqueDates(appState.rawData);
    
    // 分析每个日期的数据
    appState.analysisResults = dates
        .map(date => analyzeDateData(appState.rawData, date, appState.targetHotel))
        .filter(r => r !== null);
    
    // 计算汇总数据
    appState.summary = calculateSummary(appState.analysisResults);
    
    // 计算竞对汇总
    appState.competitorSummary = calculateCompetitorSummary(appState.analysisResults);
    
    // 重置选中日期
    appState.activeDateIndex = 0;
}

/**
 * 渲染主看板
 */
function renderDashboard() {
    // 隐藏上传区域，显示数据区域
    document.getElementById('uploadSection')?.classList.add('hidden');
    document.getElementById('dataSection')?.classList.remove('hidden');
    
    // 更新顶部信息
    updateHeaderInfo();
    
    // 渲染概览卡片
    renderSummaryCards();
    
    // 渲染图表
    renderPriceChart('priceChart', appState.analysisResults);
    renderRankChart('rankChart', appState.analysisResults);
    
    // 渲染日期Tab
    renderDateTabs();
    
    // 渲染当日详情
    renderDateDetail(appState.activeDateIndex);
    
    // 渲染竞对汇总表
    renderCompetitorTable();
}

/**
 * 更新顶部信息
 */
function updateHeaderInfo() {
    const targetEl = document.getElementById('targetHotelName');
    const timeEl = document.getElementById('dataTime');
    
    if (targetEl) {
        targetEl.textContent = appState.targetHotel || '未知酒店';
    }
    
    if (timeEl && appState.analysisResults.length > 0) {
        const latest = appState.analysisResults[appState.analysisResults.length - 1];
        timeEl.textContent = latest.currentBatch || '-';
    }
}

/**
 * 渲染概览卡片
 */
function renderSummaryCards() {
    const summary = appState.summary;
    if (!summary) return;
    
    // 平均房价
    const avgPriceEl = document.getElementById('avgPrice');
    const marketPriceEl = document.getElementById('marketPrice');
    if (avgPriceEl) avgPriceEl.textContent = `¥${summary.avgPrice}`;
    if (marketPriceEl) marketPriceEl.textContent = `市场均价: ¥${summary.avgMarketPrice}`;
    
    // 平均排名
    const avgRankEl = document.getElementById('avgRank');
    const rankRangeEl = document.getElementById('rankRange');
    if (avgRankEl) avgRankEl.textContent = summary.avgRanking;
    if (rankRangeEl) rankRangeEl.textContent = `最高: ${summary.bestRank} | 最低: ${summary.worstRank}`;
    
    // 价格竞争力
    const competitivenessEl = document.getElementById('competitiveness');
    const competitiveDetailEl = document.getElementById('competitiveDetail');
    if (competitivenessEl) {
        competitivenessEl.textContent = summary.competitiveness;
        competitivenessEl.className = getCompetitivenessClass(summary.competitiveness);
    }
    if (competitiveDetailEl) {
        competitiveDetailEl.textContent = `${summary.daysBelowAvg}天低于均价，${summary.daysAboveAvg}天高于均价`;
    }
    
    // 监控日期范围
    const dateRangeEl = document.getElementById('dateRange');
    const totalDaysEl = document.getElementById('totalDays');
    if (dateRangeEl && summary.dateRange) {
        const start = formatShortDate(summary.dateRange.start);
        const end = formatShortDate(summary.dateRange.end);
        dateRangeEl.textContent = `${start} - ${end}`;
    }
    if (totalDaysEl) {
        totalDaysEl.textContent = `共计 ${summary.totalDays} 天数据`;
    }
}

/**
 * 渲染日期Tab
 */
function renderDateTabs() {
    const container = document.getElementById('dateTabs');
    if (!container) return;
    
    container.innerHTML = appState.analysisResults.map((result, index) => `
        <button 
            onclick="window.selectDate(${index})"
            class="px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                index === appState.activeDateIndex 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }"
            id="tab-${index}"
        >
            ${formatShortDate(result.date)}
        </button>
    `).join('');
}

/**
 * 选择日期
 */
window.selectDate = function(index) {
    appState.activeDateIndex = index;
    
    // 更新Tab样式
    document.querySelectorAll('[id^="tab-"]').forEach((el, idx) => {
        if (idx === index) {
            el.className = 'px-3 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-700 transition-colors';
        } else {
            el.className = 'px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors';
        }
    });
    
    renderDateDetail(index);
};

/**
 * 渲染日期详情
 */
function renderDateDetail(index) {
    const result = appState.analysisResults[index];
    if (!result) return;
    
    // 更新核心指标
    document.getElementById('detailTargetPrice').textContent = `¥${result.stats.targetPrice}`;
    document.getElementById('detailMarketAvg').textContent = `¥${result.stats.marketAvg}`;
    document.getElementById('detailCompAvg').textContent = `¥${result.stats.competitorAvg}`;
    document.getElementById('detailRank').textContent = `第 ${result.stats.ranking} / ${result.stats.totalHotels} 位`;
    
    // 价差标签
    const gap = result.stats.targetPrice - result.stats.marketAvg;
    const badge = document.getElementById('detailPriceGapBadge');
    if (badge) {
        if (gap < 0) {
            badge.className = 'px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800';
            badge.textContent = `低 ${Math.abs(gap)}元`;
        } else if (gap > 0) {
            badge.className = 'px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-800';
            badge.textContent = `高 ${gap}元`;
        } else {
            badge.className = 'px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-800';
            badge.textContent = '持平';
        }
    }
    
    // 渲染预警信息
    renderAlerts(result);
    
    // 渲染排名表
    renderRankingTable(result);
}

/**
 * 渲染预警信息
 */
function renderAlerts(result) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    
    let html = '';
    
    // F2: 价格战预警
    if (result.priceWarDetection?.hasPriceWar) {
        const pw = result.priceWarDetection;
        const isHigh = pw.riskLevel === 'high';
        html += `
            <div class="p-4 rounded-lg ${isHigh ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${isHigh ? '🔴' : '🟡'}</span>
                    <span class="font-semibold ${isHigh ? 'text-red-800' : 'text-orange-800'}">
                        ${isHigh ? '【高风险】价格战预警' : '【中风险】价格竞争提示'}
                    </span>
                </div>
                <p class="mt-1 text-sm ${isHigh ? 'text-red-600' : 'text-orange-600'}">${pw.message}</p>
            </div>
        `;
    }
    
    // F1: 竞品异常预警
    if (result.anomalyDetection?.hasAnomalies) {
        const ad = result.anomalyDetection;
        html += `
            <div class="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div class="flex items-center gap-2">
                    <span class="text-lg">⚠️</span>
                    <span class="font-semibold text-yellow-800">竞品价格异常预警</span>
                </div>
                <div class="mt-2 space-y-1 text-sm">
        `;
        
        if (ad.highRisk.length > 0) {
            html += `<div class="text-red-600 font-medium">【高风险】${ad.highRisk.length}家</div>`;
            ad.highRisk.forEach(h => {
                html += `<div class="text-red-600 ml-4">▸ ${h.name}: ${h.label}</div>`;
            });
        }
        
        if (ad.mediumRisk.length > 0) {
            html += `<div class="text-orange-600 font-medium mt-1">【中风险】${ad.mediumRisk.length}家</div>`;
            ad.mediumRisk.forEach(m => {
                html += `<div class="text-orange-600 ml-4">▸ ${m.name}: ${m.label}</div>`;
            });
        }
        
        html += '</div></div>';
    }
    
    // 价格变化汇总
    if (result.changes) {
        const c = result.changes;
        html += `
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="font-semibold text-gray-800 mb-2">价格变化统计</div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div class="text-green-600">
                        <span class="font-medium">降价:</span> ${c.decreased.length}家
                    </div>
                    <div class="text-red-600">
                        <span class="font-medium">涨价:</span> ${c.increased.length}家
                    </div>
                    <div class="text-gray-600">
                        <span class="font-medium">持平:</span> ${c.stable.length}家
                    </div>
                    <div class="text-orange-600">
                        <span class="font-medium">缺失:</span> ${c.missing.length}家
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html || '<div class="text-gray-500 text-sm">暂无预警信息</div>';
}

/**
 * 渲染排名表
 */
function renderRankingTable(result) {
    const tbody = document.getElementById('rankingTableBody');
    if (!tbody) return;
    
    // 获取价格变化信息
    const changesMap = new Map();
    if (result.changes) {
        [...result.changes.decreased, ...result.changes.increased, ...result.changes.stable]
            .forEach(c => changesMap.set(c.name, c.change));
    }
    
    tbody.innerHTML = result.competitors.map((comp, i) => {
        const rank = i + 1;
        const isTarget = comp.isTarget;
        const change = changesMap.get(comp.name);
        
        // 价差计算
        const diff = comp.price - result.stats.targetPrice;
        let diffText = '-';
        let diffClass = 'text-gray-400';
        
        if (!isTarget) {
            if (diff > 0) {
                diffText = `+${diff}`;
                diffClass = 'text-red-600';
            } else if (diff < 0) {
                diffText = `${diff}`;
                diffClass = 'text-green-600';
            }
        }
        
        // 价格变化样式
        let priceClass = '';
        let changeIndicator = '';
        if (change !== undefined && change !== 0) {
            if (change < 0) {
                priceClass = 'text-green-600';
                changeIndicator = `<span class="text-xs ml-1">(${change})</span>`;
            } else {
                priceClass = 'text-red-600';
                changeIndicator = `<span class="text-xs ml-1">(+${change})</span>`;
            }
        }
        
        // 排名图标
        let rankDisplay = rank;
        if (rank === 1) rankDisplay = '🥇';
        else if (rank === 2) rankDisplay = '🥈';
        else if (rank === 3) rankDisplay = '🥉';
        
        return `
            <tr class="${isTarget ? 'bg-yellow-50' : ''}">
                <td class="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    ${rankDisplay}
                </td>
                <td class="whitespace-nowrap px-3 py-3 text-sm">
                    <div class="font-medium ${isTarget ? 'text-blue-900 font-bold' : 'text-gray-900'}">
                        ${comp.name}
                        ${isTarget ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">本店</span>' : ''}
                    </div>
                </td>
                <td class="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold ${priceClass || 'text-gray-900'}">
                    ¥${comp.price}${changeIndicator}
                </td>
                <td class="whitespace-nowrap px-3 py-3 text-sm text-center font-medium ${diffClass}">
                    ${isTarget ? '<span class="text-blue-600">当前</span>' : diffText}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 渲染竞对汇总表
 */
function renderCompetitorTable() {
    const tbody = document.getElementById('competitorSummaryBody');
    if (!tbody) return;
    
    tbody.innerHTML = appState.competitorSummary.map(comp => {
        // 标签
        let tagHtml = '';
        switch (comp.tag) {
            case 'target':
                tagHtml = '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">本酒店</span>';
                break;
            case 'budget':
                tagHtml = '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">经济型竞对</span>';
                break;
            case 'luxury':
                tagHtml = '<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">高端竞对</span>';
                break;
            default:
                tagHtml = '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">核心竞对</span>';
        }
        
        return `
            <tr class="${comp.isTarget ? 'bg-yellow-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${comp.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">¥${comp.avgPrice}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    ${comp.priceRange === 0 ? '稳定' : '¥' + comp.priceRange}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-left">${tagHtml}</td>
            </tr>
        `;
    }).join('');
}

// 辅助函数
function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
        return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
}

function getCompetitivenessClass(level) {
    switch (level) {
        case '强': return 'text-2xl font-bold text-green-600';
        case '弱': return 'text-2xl font-bold text-red-600';
        default: return 'text-2xl font-bold text-yellow-600';
    }
}

function showLoading(show) {
    const el = document.getElementById('loadingOverlay');
    if (el) {
        el.classList.toggle('hidden', !show);
    }
}

function showError(message) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.classList.add('hidden');
    }
}

function updateFileName(name) {
    const el = document.getElementById('uploadedFileName');
    if (el) {
        el.textContent = name;
        el.classList.remove('hidden');
    }
}

// 重新上传
window.resetUpload = function() {
    destroyCharts();
    appState = {
        rawData: [],
        targetHotel: '',
        analysisResults: [],
        summary: null,
        competitorSummary: [],
        activeDateIndex: 0
    };
    
    document.getElementById('uploadSection')?.classList.remove('hidden');
    document.getElementById('dataSection')?.classList.add('hidden');
    document.getElementById('uploadedFileName')?.classList.add('hidden');
    document.getElementById('fileInput').value = '';
};

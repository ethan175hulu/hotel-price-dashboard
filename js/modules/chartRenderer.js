/**
 * 图表渲染模块 - 使用 Chart.js
 */

import { CHART_COLORS } from '../config/constants.js';

let priceChartInstance = null;
let rankChartInstance = null;

/**
 * 初始化价格趋势图
 * @param {string} canvasId 
 * @param {Array} analysisResults 
 */
export function renderPriceChart(canvasId, analysisResults) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // 销毁旧图表
    if (priceChartInstance) {
        priceChartInstance.destroy();
    }
    
    const labels = analysisResults.map(r => formatDateLabel(r.date));
    const targetPrices = analysisResults.map(r => r.stats?.targetPrice || 0);
    const marketAvgs = analysisResults.map(r => r.stats?.marketAvg || 0);
    const competitorAvgs = analysisResults.map(r => r.stats?.competitorAvg || 0);
    
    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '我的酒店',
                    data: targetPrices,
                    borderColor: CHART_COLORS.PRIMARY,
                    backgroundColor: hexToRgba(CHART_COLORS.PRIMARY, 0.1),
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '市场均价',
                    data: marketAvgs,
                    borderColor: CHART_COLORS.SECONDARY,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4
                },
                {
                    label: '竞对均价',
                    data: competitorAvgs,
                    borderColor: CHART_COLORS.ACCENT,
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ¥${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { 
                        borderDash: [2, 2],
                        color: '#e5e7eb'
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * 初始化排名趋势图
 * @param {string} canvasId 
 * @param {Array} analysisResults 
 */
export function renderRankChart(canvasId, analysisResults) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // 销毁旧图表
    if (rankChartInstance) {
        rankChartInstance.destroy();
    }
    
    const labels = analysisResults.map(r => formatDateLabel(r.date));
    const rankings = analysisResults.map(r => r.stats?.ranking || 0);
    const maxRank = Math.max(...analysisResults.map(r => r.stats?.totalHotels || 10)) + 2;
    
    rankChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '排名走势 (越低越好)',
                data: rankings,
                borderColor: CHART_COLORS.PURPLE,
                backgroundColor: hexToRgba(CHART_COLORS.PURPLE, 0.1),
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const result = analysisResults[context.dataIndex];
                            return `排名: 第 ${context.raw} / ${result?.stats?.totalHotels || '-'} 位`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,
                    min: 1,
                    max: maxRank,
                    ticks: { 
                        stepSize: 1,
                        callback: function(value) {
                            return '第' + value + '位';
                        }
                    },
                    grid: {
                        borderDash: [2, 2],
                        color: '#e5e7eb'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * 格式化日期标签 (mm/dd)
 */
function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
        return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
}

/**
 * Hex颜色转RGBA
 */
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 销毁所有图表
 */
export function destroyCharts() {
    if (priceChartInstance) {
        priceChartInstance.destroy();
        priceChartInstance = null;
    }
    if (rankChartInstance) {
        rankChartInstance.destroy();
        rankChartInstance = null;
    }
}

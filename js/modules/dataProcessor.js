/**
 * 数据处理模块 - 批次识别、价格分析、异常检测
 */

import { ANOMALY_THRESHOLDS, PRICE_WAR_THRESHOLDS } from '../config/constants.js';

/**
 * 提取所有唯一的房间日期
 * @param {Array} data 
 * @returns {Array<string>} 排序后的日期数组
 */
export function getUniqueDates(data) {
    const dates = [...new Set(data.map(d => d.date).filter(Boolean))];
    return dates.sort();
}

/**
 * 获取指定日期的所有批次（按时间排序）
 * @param {Array} data 
 * @param {string} date 
 * @returns {Array<string>}
 */
export function getBatchesByDate(data, date) {
    const batches = [...new Set(
        data.filter(d => d.date === date)
            .map(d => d.batchTime)
            .filter(Boolean)
    )];
    return batches.sort();
}

/**
 * 获取指定日期和批次的数据
 * @param {Array} data 
 * @param {string} date 
 * @param {string} batchTime 
 * @returns {Array}
 */
export function getDataByDateAndBatch(data, date, batchTime) {
    return data.filter(d => d.date === date && d.batchTime === batchTime);
}

/**
 * 分析单个日期的价格数据
 * @param {Array} data 完整数据
 * @param {string} date 目标日期
 * @param {string} targetHotel 目标酒店名
 * @returns {Object} 分析结果
 */
export function analyzeDateData(data, date, targetHotel) {
    const batches = getBatchesByDate(data, date);
    
    if (batches.length === 0) {
        return null;
    }
    
    // 获取最新批次数据
    const currentBatch = batches[batches.length - 1];
    const currentData = getDataByDateAndBatch(data, date, currentBatch);
    
    // 如果有多个批次，获取前一批次用于对比
    const prevBatch = batches.length > 1 ? batches[batches.length - 2] : null;
    const prevData = prevBatch ? getDataByDateAndBatch(data, date, prevBatch) : [];
    
    // 计算当前批次的统计数据
    const stats = calculateStats(currentData, targetHotel);
    
    // 如果有历史数据，计算价格变化
    const changes = prevData.length > 0 
        ? calculatePriceChanges(currentData, prevData, targetHotel)
        : null;
    
    // F1: 竞品异常检测
    const anomalyDetection = changes 
        ? detectAnomalies(changes, stats.targetPrice)
        : null;
    
    // F2: 价格战检测
    const priceWarDetection = changes 
        ? detectPriceWar(changes)
        : null;
    
    return {
        date,
        currentBatch,
        prevBatch,
        batches,
        stats,
        changes,
        anomalyDetection,
        priceWarDetection,
        competitors: currentData.map(d => ({
            name: d.hotelName,
            price: d.price,
            isTarget: d.hotelName === targetHotel
        })).sort((a, b) => a.price - b.price)
    };
}

/**
 * 计算统计数据
 * @param {Array} data 
 * @param {string} targetHotel 
 * @returns {Object}
 */
function calculateStats(data, targetHotel) {
    const prices = data.map(d => d.price).filter(p => p > 0);
    const targetRecord = data.find(d => d.hotelName === targetHotel);
    const targetPrice = targetRecord?.price || 0;
    
    // 竞对价格（不含目标酒店）
    const competitorPrices = data
        .filter(d => d.hotelName !== targetHotel && d.price > 0)
        .map(d => d.price);
    
    // 市场均价（含目标酒店）
    const marketAvg = prices.length > 0 
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
    
    // 竞对均价（不含目标酒店）
    const competitorAvg = competitorPrices.length > 0
        ? Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
        : 0;
    
    // 价格优势
    const priceAdvantage = competitorAvg - targetPrice;
    
    // 计算排名（价格越低排名越前）
    const ranking = prices.filter(p => p < targetPrice).length + 1;
    const totalHotels = prices.length;
    
    return {
        targetPrice,
        marketAvg,
        competitorAvg,
        priceAdvantage,
        ranking,
        totalHotels,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        priceRange: Math.max(...prices) - Math.min(...prices)
    };
}

/**
 * 计算价格变化
 * @param {Array} currentData 
 * @param {Array} prevData 
 * @param {string} targetHotel 
 * @returns {Object}
 */
function calculatePriceChanges(currentData, prevData, targetHotel) {
    const currentMap = new Map(currentData.map(d => [d.hotelName, d.price]));
    const prevMap = new Map(prevData.map(d => [d.hotelName, d.price]));
    
    const decreased = [];  // 降价酒店
    const increased = [];  // 涨价酒店
    const stable = [];     // 价格稳定
    const missing = [];    // 数据缺失
    
    // 目标酒店价格变化
    let targetChange = null;
    
    // 遍历当前数据
    currentData.forEach(d => {
        const prevPrice = prevMap.get(d.hotelName);
        const currentPrice = d.price;
        
        if (prevPrice === undefined) {
            // 新增酒店（之前没有数据）
            return;
        }
        
        const change = currentPrice - prevPrice;
        const changeInfo = {
            name: d.hotelName,
            prevPrice,
            currentPrice,
            change,
            isTarget: d.hotelName === targetHotel
        };
        
        if (d.hotelName === targetHotel) {
            targetChange = changeInfo;
        }
        
        if (change < 0) {
            decreased.push(changeInfo);
        } else if (change > 0) {
            increased.push(changeInfo);
        } else {
            stable.push(changeInfo);
        }
    });
    
    // 检查缺失的酒店（之前有但现在没有）
    prevData.forEach(d => {
        if (!currentMap.has(d.hotelName)) {
            missing.push({
                name: d.hotelName,
                prevPrice: d.price,
                isTarget: d.hotelName === targetHotel
            });
        }
    });
    
    return {
        targetChange,
        decreased: decreased.sort((a, b) => a.change - b.change),  // 降价幅度从大到小
        increased: increased.sort((a, b) => b.change - a.change),  // 涨价幅度从大到小
        stable,
        missing
    };
}

/**
 * F1: 竞品价格异常检测
 * @param {Object} changes 
 * @param {number} targetPrice 
 * @returns {Object}
 */
function detectAnomalies(changes, targetPrice) {
    const { mediumThreshold, highThreshold } = getAnomalyThresholds(targetPrice);
    
    const highRiskAnomalies = [];
    const mediumRiskAnomalies = [];
    
    // 检测降价异常（不含目标酒店）
    changes.decreased
        .filter(d => !d.isTarget)
        .forEach(d => {
            const absChange = Math.abs(d.change);
            if (absChange >= highThreshold) {
                highRiskAnomalies.push({
                    ...d,
                    type: 'decrease',
                    label: `价格暴跌${absChange}元`
                });
            } else if (absChange >= mediumThreshold) {
                mediumRiskAnomalies.push({
                    ...d,
                    type: 'decrease',
                    label: `价格下降${absChange}元`
                });
            }
        });
    
    // 检测涨价异常（不含目标酒店）
    changes.increased
        .filter(d => !d.isTarget)
        .forEach(d => {
            const absChange = Math.abs(d.change);
            if (absChange >= highThreshold) {
                highRiskAnomalies.push({
                    ...d,
                    type: 'increase',
                    label: `价格暴涨${absChange}元`
                });
            } else if (absChange >= mediumThreshold) {
                mediumRiskAnomalies.push({
                    ...d,
                    type: 'increase',
                    label: `价格上涨${absChange}元`
                });
            }
        });
    
    const hasAnomalies = highRiskAnomalies.length > 0 || mediumRiskAnomalies.length > 0;
    
    return {
        hasAnomalies,
        highRisk: highRiskAnomalies,
        mediumRisk: mediumRiskAnomalies,
        thresholds: { mediumThreshold, highThreshold }
    };
}

/**
 * 获取异常检测阈值（基于目标酒店价格分档）
 * @param {number} targetPrice 
 * @returns {Object}
 */
function getAnomalyThresholds(targetPrice) {
    let priceLevel = 1;
    
    if (targetPrice >= 100) {
        priceLevel = Math.floor((targetPrice - 1) / 100) + 1;
    }
    
    // 限制最高档位为10
    if (priceLevel > 10) priceLevel = 10;
    
    const mediumThreshold = ANOMALY_THRESHOLDS.BASE_MEDIUM_RISK + 
        (priceLevel - 1) * ANOMALY_THRESHOLDS.LEVEL_INCREMENT;
    const highThreshold = mediumThreshold * ANOMALY_THRESHOLDS.HIGH_RISK_MULTIPLIER;
    
    return { mediumThreshold, highThreshold };
}

/**
 * F2: 价格战检测
 * @param {Object} changes 
 * @returns {Object}
 */
function detectPriceWar(changes) {
    // 统计降价酒店数量（不含目标酒店）
    const decreasedCount = changes.decreased.filter(d => !d.isTarget).length;
    
    let hasPriceWar = false;
    let riskLevel = null;
    let message = '';
    
    if (decreasedCount >= PRICE_WAR_THRESHOLDS.HIGH_RISK) {
        hasPriceWar = true;
        riskLevel = 'high';
        message = `${decreasedCount}家竞品集体降价，建议制定应对策略`;
    } else if (decreasedCount >= PRICE_WAR_THRESHOLDS.MEDIUM_RISK) {
        hasPriceWar = true;
        riskLevel = 'medium';
        message = `${decreasedCount}家竞品同时降价，市场竞争加剧`;
    }
    
    return {
        hasPriceWar,
        riskLevel,
        competitorCount: decreasedCount,
        message
    };
}

/**
 * 计算多日期汇总数据
 * @param {Array} analysisResults 多个日期的分析结果
 * @returns {Object}
 */
export function calculateSummary(analysisResults) {
    const validResults = analysisResults.filter(r => r && r.stats);
    
    if (validResults.length === 0) {
        return null;
    }
    
    const avgPrice = Math.round(
        validResults.reduce((sum, r) => sum + r.stats.targetPrice, 0) / validResults.length
    );
    
    const avgMarketPrice = Math.round(
        validResults.reduce((sum, r) => sum + r.stats.marketAvg, 0) / validResults.length
    );
    
    const avgRanking = (
        validResults.reduce((sum, r) => sum + r.stats.ranking, 0) / validResults.length
    ).toFixed(1);
    
    const avgTotal = Math.round(
        validResults.reduce((sum, r) => sum + r.stats.totalHotels, 0) / validResults.length
    );
    
    const rankings = validResults.map(r => r.stats.ranking);
    const bestRank = Math.min(...rankings);
    const worstRank = Math.max(...rankings);
    
    // 统计高于/低于均价的天数
    const daysAboveAvg = validResults.filter(r => r.stats.targetPrice > r.stats.marketAvg).length;
    const daysBelowAvg = validResults.length - daysAboveAvg;
    
    // 判断价格竞争力
    let competitiveness = '中等';
    if (daysBelowAvg > daysAboveAvg * 2) {
        competitiveness = '强';
    } else if (daysAboveAvg > daysBelowAvg * 2) {
        competitiveness = '弱';
    }
    
    return {
        avgPrice,
        avgMarketPrice,
        avgRanking: parseFloat(avgRanking),
        avgTotal,
        bestRank,
        worstRank,
        daysAboveAvg,
        daysBelowAvg,
        competitiveness,
        totalDays: validResults.length,
        dateRange: {
            start: validResults[0].date,
            end: validResults[validResults.length - 1].date
        }
    };
}

/**
 * 计算竞对综合表现
 * @param {Array} analysisResults 
 * @returns {Array}
 */
export function calculateCompetitorSummary(analysisResults) {
    const validResults = analysisResults.filter(r => r && r.competitors);
    const competitorStats = new Map();
    
    validResults.forEach(result => {
        result.competitors.forEach(comp => {
            if (!competitorStats.has(comp.name)) {
                competitorStats.set(comp.name, {
                    name: comp.name,
                    prices: [],
                    isTarget: comp.isTarget
                });
            }
            competitorStats.get(comp.name).prices.push(comp.price);
        });
    });
    
    const summary = [];
    competitorStats.forEach(stats => {
        const avg = Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length);
        const min = Math.min(...stats.prices);
        const max = Math.max(...stats.prices);
        const range = max - min;
        
        // 定位标签
        let tag = 'core';  // 核心竞对
        if (stats.isTarget) {
            tag = 'target';
        } else if (avg < 250) {
            tag = 'budget';  // 经济型
        } else if (avg > 400) {
            tag = 'luxury';  // 高端
        }
        
        summary.push({
            name: stats.name,
            avgPrice: avg,
            minPrice: min,
            maxPrice: max,
            priceRange: range,
            tag,
            isTarget: stats.isTarget,
            appearances: stats.prices.length
        });
    });
    
    return summary.sort((a, b) => a.avgPrice - b.avgPrice);
}

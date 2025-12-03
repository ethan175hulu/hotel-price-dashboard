/**
 * Excel解析模块 - 支持 xlsm, xlsx, xls 格式
 */

import { EXCEL_COLUMNS, SUPPORTED_FORMATS } from '../config/constants.js';

/**
 * 验证文件格式
 * @param {File} file 
 * @returns {boolean}
 */
export function validateFileFormat(file) {
    const fileName = file.name.toLowerCase();
    return SUPPORTED_FORMATS.some(format => fileName.endsWith(format));
}

/**
 * 解析Excel文件
 * @param {File} file 
 * @returns {Promise<Array>} 解析后的数据数组
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        if (!validateFileFormat(file)) {
            reject(new Error(`不支持的文件格式。支持的格式: ${SUPPORTED_FORMATS.join(', ')}`));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                
                // 查找数据Sheet
                const sheetName = EXCEL_COLUMNS.SHEET_NAME;
                if (!workbook.SheetNames.includes(sheetName)) {
                    // 尝试第一个sheet
                    const firstSheet = workbook.SheetNames[0];
                    console.warn(`未找到"${sheetName}"工作表，使用第一个工作表: ${firstSheet}`);
                    const sheet = workbook.Sheets[firstSheet];
                    const jsonData = extractDataFromSheet(sheet);
                    resolve(jsonData);
                    return;
                }
                
                const sheet = workbook.Sheets[sheetName];
                const jsonData = extractDataFromSheet(sheet);
                resolve(jsonData);
                
            } catch (error) {
                reject(new Error(`Excel解析失败: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 从Sheet中提取数据
 * @param {Object} sheet 
 * @returns {Array}
 */
function extractDataFromSheet(sheet) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const data = [];
    
    // 从第2行开始读取（跳过标题行）
    for (let row = 1; row <= range.e.r; row++) {
        const hotelCell = sheet[`A${row + 1}`];
        const dateCell = sheet[`B${row + 1}`];
        const priceCell = sheet[`E${row + 1}`];
        const batchTimeCell = sheet[`H${row + 1}`];
        
        // 跳过空行
        if (!hotelCell && !priceCell) continue;
        
        const record = {
            hotelName: getCellValue(hotelCell),
            date: formatDate(getCellValue(dateCell)),
            price: parsePrice(getCellValue(priceCell)),
            batchTime: formatBatchTime(getCellValue(batchTimeCell)),
            rawRow: row + 1
        };
        
        // 只保留有效数据（酒店名和价格都存在）
        if (record.hotelName && record.price > 0) {
            data.push(record);
        }
    }
    
    return data;
}

/**
 * 获取单元格值
 * @param {Object} cell 
 * @returns {*}
 */
function getCellValue(cell) {
    if (!cell) return null;
    
    // 如果是日期类型
    if (cell.t === 'd') {
        return cell.v;
    }
    
    // 优先使用原始值(v)而不是格式化值(w)，确保日期数据完整
    return cell.v || cell.w || null;
}

/**
 * 格式化日期为 yyyy-mm-dd
 * @param {*} value 
 * @returns {string}
 */
function formatDate(value) {
    if (!value) return '';
    
    // 如果已经是Date对象
    if (value instanceof Date) {
        return formatDateObj(value);
    }
    
    // Excel数字日期（必须先检查数字类型，避免字符串被误判）
    if (typeof value === 'number' && value > 0) {
        const date = excelDateToJS(value);
        return formatDateObj(date);
    }
    
    // 字符串格式处理
    const strValue = String(value).trim();
    
    // 尝试多种日期格式
    // 2025年10月21日
    let match = strValue.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
        return `${match[1]}-${padZero(match[2])}-${padZero(match[3])}`;
    }
    
    // 2025/10/21 or 2025-10-21
    match = strValue.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
        return `${match[1]}-${padZero(match[2])}-${padZero(match[3])}`;
    }
    
    // 不完整日期：11/25 或 11-25（补充当前年份）
    match = strValue.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${padZero(match[1])}-${padZero(match[2])}`;
    }
    
    return strValue;
}

/**
 * Date对象转字符串
 */
function formatDateObj(date) {
    const y = date.getFullYear();
    const m = padZero(date.getMonth() + 1);
    const d = padZero(date.getDate());
    return `${y}-${m}-${d}`;
}

/**
 * 补零
 */
function padZero(num) {
    return String(num).padStart(2, '0');
}

/**
 * Excel日期序列号转JS Date
 */
function excelDateToJS(excelDate) {
    const utc_days = Math.floor(excelDate - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date;
}

/**
 * 格式化批次时间
 * @param {*} value 
 * @returns {string}
 */
function formatBatchTime(value) {
    if (!value) return '';
    
    // 如果是Date对象
    if (value instanceof Date) {
        return formatDateTime(value);
    }
    
    const strValue = String(value).trim();
    
    // 尝试解析日期时间格式
    // 2025-10-29 14:00 or 2025/10/29 14:00
    let match = strValue.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1]}-${padZero(match[2])}-${padZero(match[3])} ${padZero(match[4])}:${match[5]}`;
    }
    
    // Excel数字日期时间
    if (!isNaN(value) && value > 0) {
        const date = excelDateTimeToJS(value);
        return formatDateTime(date);
    }
    
    return strValue;
}

/**
 * Excel日期时间序列号转JS Date（包含时间部分）
 */
function excelDateTimeToJS(excelDateTime) {
    const utc_value = (excelDateTime - 25569) * 86400 * 1000;
    return new Date(utc_value);
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    const y = date.getFullYear();
    const m = padZero(date.getMonth() + 1);
    const d = padZero(date.getDate());
    const h = padZero(date.getHours());
    const min = padZero(date.getMinutes());
    return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * 解析价格
 * @param {*} value 
 * @returns {number}
 */
function parsePrice(value) {
    if (!value) return 0;
    
    // 如果已经是数字
    if (typeof value === 'number') {
        return value > 0 ? Math.round(value) : 0;
    }
    
    // 字符串处理：去除¥、,等符号
    const strValue = String(value)
        .replace(/[¥￥,，\s]/g, '')
        .trim();
    
    const price = parseFloat(strValue);
    return isNaN(price) || price <= 0 ? 0 : Math.round(price);
}

/**
 * 获取目标酒店（第一行数据的酒店名，通常是自己的酒店）
 * @param {Array} data 
 * @returns {string}
 */
export function getTargetHotel(data) {
    if (data.length === 0) return '';
    
    // 按行号排序，取最早出现的酒店
    const sorted = [...data].sort((a, b) => a.rawRow - b.rawRow);
    return sorted[0]?.hotelName || '';
}

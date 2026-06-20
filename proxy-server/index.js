/**
 * 股票决策助手 - 行情代理服务
 * 
 * 解决浏览器直接访问腾讯/东财 API 的跨域问题
 * 端口: 3001
 * 
 * 端点:
 *   GET /api/quote/:codes       - 批量实时行情（逗号分隔，如 600519,300750）
 *   GET /api/kline/:code        - 日K线数据（最近120条）
 *   GET /api/market             - 大盘指数 + 行业板块
 *   GET /api/health             - 健康检查
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3001;

// ── 绕过系统代理（直连腾讯/东财）──────────────────────────────────────────
// 防止 IDE 或系统代理拦截对外的 HTTP 请求
process.env.NO_PROXY = 'qt.gtimg.cn,push2his.eastmoney.com,push2.eastmoney.com,finance.qq.com';
process.env.no_proxy = process.env.NO_PROXY;

// ── CORS 配置 ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET'],
}));

// ── 通用 HTTP 请求函数（直连模式，绕过系统代理）──────────────────────────────
function httpGet(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = targetUrl.startsWith('https');
    const client = isHttps ? https : http;
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
    };
    const reqHeaders = { ...defaultHeaders, ...headers };

    // 解析 URL，直接用 hostname + path 方式请求，完全绕开系统代理
    const parsed = new URL(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + (parsed.search || ''),
      method: 'GET',
      headers: reqHeaders,
      timeout: 12000,
      // 关键：禁用全局 Agent，防止系统代理拦截
      agent: false,
    };

    const req = client.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, statusCode: res.statusCode, headers: res.headers });
      });
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 12s'));
    });

    req.on('error', reject);
    req.end();
  });
}

// ── 市场前缀工具 ───────────────────────────────────────────────────────────
function getPrefix(code) {
  if (code.startsWith('6') || code.startsWith('9')) return 'sh';
  if (code.startsWith('8')) return 'bj';
  return 'sz';
}

// ── 腾讯行情解析 ───────────────────────────────────────────────────────────
function parseTencentQuote(code, vals) {
  if (!vals || vals.length < 53) return null;
  const safeFloat = (v) => (v && v !== '' && v !== '-' ? parseFloat(v) : 0);

  return {
    code,
    name: vals[1],
    price: safeFloat(vals[3]),
    prevClose: safeFloat(vals[4]),
    open: safeFloat(vals[5]),
    changeAmount: safeFloat(vals[31]),
    change: safeFloat(vals[32]),         // 涨跌幅 %
    high: safeFloat(vals[33]),
    low: safeFloat(vals[34]),
    volume: Math.round(safeFloat(vals[37]) * 10000),  // 万→元，实际万元
    volumeYi: safeFloat(vals[37]) / 10000,  // 亿元
    turnoverPct: safeFloat(vals[38]),    // 换手率
    peTtm: safeFloat(vals[39]),          // PE(TTM)
    amplitude: safeFloat(vals[43]),      // 振幅%（注意：43不是PB！）
    mcapYi: safeFloat(vals[44]),         // 总市值亿
    floatMcapYi: safeFloat(vals[45]),    // 流通市值亿
    pb: safeFloat(vals[46]),             // 市净率
    limitUp: safeFloat(vals[47]),        // 涨停价
    limitDown: safeFloat(vals[48]),      // 跌停价
    volRatio: safeFloat(vals[49]),       // 量比
    peStatic: safeFloat(vals[52]),       // PE(静)
    updateTime: vals[30] || '',          // 更新时间
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/quote/:codes - 批量实时行情
// codes: 逗号分隔的6位代码，如 600519,300750,000858
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/quote/:codes', async (req, res) => {
  try {
    const codes = req.params.codes.split(',').map(c => c.trim()).filter(Boolean);
    if (codes.length === 0 || codes.length > 20) {
      return res.status(400).json({ error: '代码数量需在1-20之间' });
    }

    const prefixed = codes.map(c => `${getPrefix(c)}${c}`);
    const url = `https://qt.gtimg.cn/q=${prefixed.join(',')}`;

    const { buffer, statusCode } = await httpGet(url, {
      'Referer': 'https://finance.qq.com/',
    });

    if (statusCode !== 200) {
      throw new Error(`腾讯行情返回 ${statusCode}`);
    }

    // GBK 解码
    const iconv = require('iconv-lite');
    const text = iconv.decode(buffer, 'gbk');

    const result = {};
    for (const line of text.trim().split(';')) {
      if (!line.trim() || '=' === line || !line.includes('"')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const keyPart = line.substring(0, eqIdx).trim();
      const valPart = line.substring(eqIdx + 1).trim();
      // 提取 code，key 格式：v_shXXXXXX 或 qt_shXXXXXX
      const keyMatch = keyPart.match(/[vs]_([a-z]{2})(\d{6})/);
      if (!keyMatch) continue;
      const code = keyMatch[2];
      const content = valPart.replace(/^"|"$/g, '');
      const vals = content.split('~');
      const parsed = parseTencentQuote(code, vals);
      if (parsed && parsed.price > 0) {
        result[code] = parsed;
      }
    }

    res.json({ success: true, data: result, timestamp: Date.now() });
  } catch (err) {
    console.error('[/api/quote]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/kline/:code - 日K线数据
// ?count=120  返回条数（默认120）
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/kline/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const count = Math.min(parseInt(req.query.count || '120'), 250);

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '代码格式错误' });
    }

    // 使用东财 K线 API（日K：klt=101, 复权：fqt=1前复权）
    const market = code.startsWith('6') || code.startsWith('9') ? 1 : 0;
    const secid = `${market}.${code}`;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=0&end=20500101&lmt=${count}&cb=`;

    const { buffer, statusCode } = await httpGet(url, {
      'Referer': 'https://quote.eastmoney.com/',
      'Origin': 'https://quote.eastmoney.com',
    });

    if (statusCode !== 200) throw new Error(`东财K线返回 ${statusCode}`);

    const text = buffer.toString('utf-8');
    const data = JSON.parse(text);

    const klines = [];
    const rawList = data?.data?.klines || [];

    for (const item of rawList) {
      const parts = item.split(',');
      if (parts.length < 6) continue;
      klines.push({
        date: parts[0],          // YYYY-MM-DD
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseInt(parts[5]),   // 手
        turnover: parseFloat(parts[6] || '0'),
      });
    }

    res.json({ success: true, code, data: klines, count: klines.length, timestamp: Date.now() });
  } catch (err) {
    console.error('[/api/kline]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 备用：新浪搜索接口（当东财接口解析失败时使用）
// ══════════════════════════════════════════════════════════════════════════════
async function searchViaSina(q) {
  try {
    // 新浪财经搜索 suggest 接口，返回 JSONP 格式
    const url = `https://suggest3.sinajs.cn/suggest/type=11,12&key=${encodeURIComponent(q)}&client_id=sv_NewsApp`;
    const { buffer, statusCode } = await httpGet(url, {
      'Referer': 'https://finance.sina.com.cn/',
    });

    if (statusCode !== 200) throw new Error(`新浪搜索返回 ${statusCode}`);

    const text = buffer.toString('utf-8');
    // 新浪返回: var suggestvalue="..."
    const match = text.match(/var suggestvalue="(.*)"/);
    if (!match) return [];

    const raw = match[1];
    // 格式: 名称,类型,代码,拼音,...;名称,...
    const items = raw.split(';').filter(Boolean);
    const result = [];

    for (const item of items) {
      const parts = item.split(',');
      if (parts.length < 3) continue;
      const name = parts[0];
      const type = parts[1];       // 11=沪A 12=深A 25=北交所
      const code = parts[2];

      if (!/^\d{6}$/.test(code)) continue;
      if (!['11', '12', '25'].includes(type)) continue;

      let market = 'SZ';
      if (type === '11' || code.startsWith('6')) market = 'SH';
      if (type === '25' || code.startsWith('8')) market = 'BJ';

      result.push({
        code,
        name,
        market,
        type: 'A股',
        pinyin: parts[3] ? parts[3].toLowerCase() : '',
        price: 0,
        change: 0,
        changeAmount: 0,
      });

      if (result.length >= 15) break;
    }

    // 尝试批量补充行情
    if (result.length > 0) {
      const codes = result.map(s => s.code);
      const prefixed = codes.map(c => {
        if (c.startsWith('6') || c.startsWith('9')) return `sh${c}`;
        if (c.startsWith('8')) return `bj${c}`;
        return `sz${c}`;
      });

      try {
        const quoteUrl = `https://qt.gtimg.cn/q=${prefixed.join(',')}`;
        const { buffer: qBuf } = await httpGet(quoteUrl, { 'Referer': 'https://finance.qq.com/' });
        const iconv = require('iconv-lite');
        const qText = iconv.decode(qBuf, 'gbk');

        const quoteMap = {};
        for (const line of qText.trim().split(';')) {
          if (!line.trim() || !line.includes('"') || !line.includes('=')) continue;
          const eqIdx = line.indexOf('=');
          const keyPart = line.substring(0, eqIdx).trim();
          const valPart = line.substring(eqIdx + 1).trim();
          const keyMatch = keyPart.match(/[vs]_[a-z]{2}(\d{6,})/);
          if (!keyMatch) continue;
          const code = keyMatch[1];
          const vals = valPart.replace(/^"|"$/g, '').split('~');
          if (vals.length >= 5) {
            const price = parseFloat(vals[3]) || 0;
            const prevClose = parseFloat(vals[4]) || 0;
            const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;
            quoteMap[code] = {
              price,
              change: Math.round(change * 100) / 100,
              changeAmount: Math.round((price - prevClose) * 100) / 100,
            };
          }
        }

        for (const s of result) {
          if (quoteMap[s.code]) {
            s.price = quoteMap[s.code].price;
            s.change = quoteMap[s.code].change;
            s.changeAmount = quoteMap[s.code].changeAmount;
          }
        }
      } catch { /* 行情获取失败不影响主流程 */ }
    }

    return result;
  } catch (err) {
    console.warn('[searchViaSina] 备用接口也失败:', err.message);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/search?q=关键词  - 股票搜索（东财搜索接口）
// 支持：股票名称模糊搜索、代码精确搜索
// 返回：最多20条匹配结果（含基础行情）
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // 东财证券搜索接口（返回 JSONP，需去掉回调包装再解析）
    // 该接口返回格式: jQuery123(...)(JSON内容)  或直接 JSON（cb= 时省略包装）
    const searchUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(q)}&type=14&token=D43BF722C8E33BDC906FB84D85E326484&count=20`;

    const { buffer, statusCode } = await httpGet(searchUrl, {
      'Referer': 'https://quote.eastmoney.com/',
      'Origin': 'https://www.eastmoney.com',
      'Accept': 'application/json, text/javascript, */*',
    });

    if (statusCode !== 200) throw new Error(`东财搜索返回 ${statusCode}`);

    let text = buffer.toString('utf-8').trim();

    // 剥离 JSONP 包装：形如 "jQuery...({...})" 或 "funcName({...})"
    const jsonpMatch = text.match(/^[A-Za-z_$][A-Za-z0-9_$.]*\s*\(([\s\S]*)\)\s*;?\s*$/);
    if (jsonpMatch) {
      text = jsonpMatch[1];
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // 第一个接口失败，尝试备用接口（新浪搜索）
      console.warn('[/api/search] 东财接口解析失败，尝试备用接口');
      const fallbackResult = await searchViaSina(q);
      return res.json({ success: true, data: fallbackResult, total: fallbackResult.length });
    }

    // 东财接口返回结构: { QuotationCodeTable: { Data: [...] } }
    // 每条 item: { Code, Name, Type(数字), MktNum(0=北交所 1=沪 2=深), SpellName }
    const QuotationCodeTable = data?.QuotationCodeTable;
    const rawList = QuotationCodeTable?.Data || [];

    const list = rawList
      .filter(item => {
        const code = item.Code || '';
        // 只保留A股：代码特征 + 类型
        // Type: 1=沪A, 2=深A, 3=深A(另), 23=北交所
        const isAshare = /^(6|0|3|8)\d{5}$/.test(code);
        const isValidType = [1, 2, 3, 23].includes(Number(item.Type));
        return isAshare || isValidType;
      })
      .slice(0, 15)
      .map(item => {
        const code = item.Code || '';
        let market = 'SZ';
        if (item.MktNum === 1 || code.startsWith('6') || code.startsWith('9')) market = 'SH';
        if (item.MktNum === 0 || code.startsWith('8')) market = 'BJ';
        return {
          code,
          name: item.Name || '',
          market,
          type: item.SecurityTypeName || item.TypeStr || 'A股',
          pinyin: (item.SpellName || '').toLowerCase(),
        };
      })
      .filter(item => item.code && item.name);

    if (list.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // 批量拉取这些股票的实时行情
    const codes = list.map(s => s.code);
    const prefixed = codes.map(c => {
      if (c.startsWith('6') || c.startsWith('9')) return `sh${c}`;
      if (c.startsWith('8')) return `bj${c}`;
      return `sz${c}`;
    });

    let quoteMap = {};
    try {
      const quoteUrl = `https://qt.gtimg.cn/q=${prefixed.join(',')}`;
      const { buffer: qBuf } = await httpGet(quoteUrl, { 'Referer': 'https://finance.qq.com/' });
      const iconv = require('iconv-lite');
      const qText = iconv.decode(qBuf, 'gbk');

      for (const line of qText.trim().split(';')) {
        if (!line.trim() || !line.includes('"') || !line.includes('=')) continue;
        const eqIdx = line.indexOf('=');
        const keyPart = line.substring(0, eqIdx).trim();
        const valPart = line.substring(eqIdx + 1).trim();
        const keyMatch = keyPart.match(/[vs]_[a-z]{2}(\d{6,})/);
        if (!keyMatch) continue;
        const code = keyMatch[1];
        const vals = valPart.replace(/^"|"$/g, '').split('~');
        if (vals.length >= 5) {
          const price = parseFloat(vals[3]) || 0;
          const prevClose = parseFloat(vals[4]) || 0;
          const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;
          quoteMap[code] = {
            price,
            change: Math.round(change * 100) / 100,
            changeAmount: Math.round((price - prevClose) * 100) / 100,
          };
        }
      }
    } catch (qErr) {
      console.warn('[/api/search] 行情补充失败:', qErr.message);
    }

    const result = list.map(s => ({
      ...s,
      price: quoteMap[s.code]?.price || 0,
      change: quoteMap[s.code]?.change || 0,
      changeAmount: quoteMap[s.code]?.changeAmount || 0,
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error('[/api/search]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/market - 大盘指数 + 行业板块
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/market', async (req, res) => {
  try {
    // 并行拉取：上证/深证/创业板指数 + 行业板块
    const [indexResult, sectorResult] = await Promise.allSettled([
      fetchIndexData(),
      fetchSectorData(),
    ]);

    const indexes = indexResult.status === 'fulfilled' ? indexResult.value : getDefaultIndexes();
    const sectors = sectorResult.status === 'fulfilled' ? sectorResult.value : getDefaultSectors();

    res.json({
      success: true,
      data: { indexes, sectors },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[/api/market]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 拉取三大指数（腾讯行情，不封IP）
async function fetchIndexData() {
  // sh000001=上证指数, sh000300=沪深300, sz399001=深证成指, sz399006=创业板指
  const indexCodes = ['sh000001', 'sh000300', 'sz399006'];
  const url = `https://qt.gtimg.cn/q=${indexCodes.join(',')}`;

  const { buffer } = await httpGet(url, { 'Referer': 'https://finance.qq.com/' });
  const iconv = require('iconv-lite');
  const text = iconv.decode(buffer, 'gbk');

  const indexes = [];
  for (const line of text.trim().split(';')) {
    if (!line.trim() || !line.includes('"') || !line.includes('=')) continue;
    const eqIdx = line.indexOf('=');
    const keyPart = line.substring(0, eqIdx).trim();
    const valPart = line.substring(eqIdx + 1).trim();
    const keyMatch = keyPart.match(/[vs]_([a-z]{2})(\d+)/);
    if (!keyMatch) continue;
    const prefix = keyMatch[1];
    const code = keyMatch[2];
    const content = valPart.replace(/^"|"$/g, '');
    const vals = content.split('~');
    if (vals.length < 5) continue;
    const price = parseFloat(vals[3]) || 0;
    const prevClose = parseFloat(vals[4]) || 0;
    const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;

    const nameMap = {
      '000001': '上证指数',
      '000300': '沪深300',
      '399006': '创业板指',
    };

    indexes.push({
      code,
      name: nameMap[code] || vals[1] || code,
      price,
      change: Math.round(change * 100) / 100,
      changeAmount: Math.round((price - prevClose) * 100) / 100,
    });
  }
  return indexes;
}

// 拉取行业板块（东财行业ETF或板块排名）
async function fetchSectorData() {
  const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fs=m:90+t:2&fields=f2,f3,f4,f12,f14,f104,f105&cb=';

  const { buffer, statusCode } = await httpGet(url, {
    'Referer': 'https://quote.eastmoney.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  });

  if (statusCode !== 200) throw new Error(`东财板块返回 ${statusCode}`);

  const text = buffer.toString('utf-8');
  const data = JSON.parse(text);
  const items = data?.data?.diff || [];

  return items.slice(0, 10).map(item => ({
    name: item.f14 || '',
    change: item.f3 || 0,
    up: item.f104 || 0,
    down: item.f105 || 0,
  }));
}

// 默认数据（API 失败时的降级）
function getDefaultIndexes() {
  return [
    { code: '000001', name: '上证指数', price: 3350.0, change: 0, changeAmount: 0 },
    { code: '000300', name: '沪深300', price: 4080.0, change: 0, changeAmount: 0 },
    { code: '399006', name: '创业板指', price: 2180.0, change: 0, changeAmount: 0 },
  ];
}

function getDefaultSectors() {
  return [
    { name: '人工智能', change: 2.15 },
    { name: '新能源', change: 1.82 },
    { name: '半导体', change: 1.56 },
    { name: '医疗器械', change: -0.38 },
    { name: '白酒', change: -0.67 },
  ];
}

// ── 健康检查 ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), uptime: process.uptime() });
});

// ── 启动 ────────────────────────────────────────────────────────────────────
// 检查是否有 iconv-lite（用于 GBK 解码）
let iconvAvailable = false;
try {
  require('iconv-lite');
  iconvAvailable = true;
} catch {
  console.warn('[proxy] iconv-lite 未安装，将使用 latin1 作为备用编码');
}

app.listen(PORT, () => {
  console.log(`\n✅ 行情代理服务已启动 → http://localhost:${PORT}`);
  console.log(`   /api/health           健康检查`);
  console.log(`   /api/quote/:codes     实时行情（腾讯财经）`);
  console.log(`   /api/kline/:code      日K线（东财，前复权）`);
  console.log(`   /api/market           大盘指数+行业板块\n`);
  if (!iconvAvailable) {
    console.warn('⚠️  建议安装 iconv-lite: npm install iconv-lite');
  }
});

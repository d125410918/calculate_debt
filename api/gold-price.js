const GOLD_SOURCE_URL = 'https://www.kjga.com.tw/ipc.php?ipage=0';

function decodeHtmlEntity(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, function (_, n) {
      return String.fromCharCode(Number(n));
    });
}

function htmlToText(html) {
  return decodeHtmlEntity(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<\/th>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function getNumbers(text) {
  const matches = String(text || '').match(/\d{1,3}(?:,\d{3})+|\d{4,6}/g) || [];
  return matches
    .map(function (value) { return Number(value.replace(/,/g, '')); })
    .filter(function (value) {
      return Number.isFinite(value) && value >= 3000 && value <= 30000;
    });
}

function extractGoldPrice(html) {
  const text = htmlToText(html);
  const lines = text
    .split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean);

  const candidates = [];

  lines.forEach(function (line) {
    const isGoldLine = /(黃金|金價|牌價|每錢|一錢)/.test(line);
    const isWrongMetal = /(白金|鉑金|銀價|白銀|美元|盎司|公斤|台幣\/克|每克)/i.test(line);
    if (!isGoldLine || isWrongMetal) return;

    getNumbers(line).forEach(function (value) {
      let score = 1;
      if (/(一錢|每錢|錢)/.test(line)) score += 4;
      if (/(黃金|金價|牌價)/.test(line)) score += 2;
      if (/(賣出|牌告|本會|今日|收盤|參考)/.test(line)) score += 1;
      if (/(買進|回收|賣回)/.test(line)) score -= 1;
      candidates.push({ value: value, score: score, line: line });
    });
  });

  if (candidates.length === 0) {
    getNumbers(text).forEach(function (value) {
      candidates.push({ value: value, score: 0, line: '' });
    });
  }

  if (candidates.length === 0) return 0;

  candidates.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return b.value - a.value;
  });

  return candidates[0].value;
}

async function readResponseText(response) {
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || '';
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  const charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'big5';

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch (e) {
    try {
      return new TextDecoder('big5').decode(buffer);
    } catch (e2) {
      return new TextDecoder('utf-8').decode(buffer);
    }
  }
}

export default async function handler(req, res) {
  try {
    const r = await fetch(GOLD_SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6',
        'Cache-Control': 'no-cache'
      }
    });

    if (!r.ok) throw new Error('kjga fetch failed: ' + r.status);

    const html = await readResponseText(r);
    const twdPerMace = extractGoldPrice(html);

    if (!Number.isFinite(twdPerMace) || twdPerMace <= 0) {
      throw new Error('gold price not found');
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({
      success: true,
      price: Math.round(twdPerMace),
      unit: 'TWD_PER_MACE',
      source: 'kjga',
      sourceUrl: GOLD_SOURCE_URL,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(200).json({
      success: false,
      price: 0,
      message: '請手動輸入今日一錢黃金價',
      source: 'kjga'
    });
  }
}

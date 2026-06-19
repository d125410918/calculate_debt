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

function stripTags(html) {
  return decodeHtmlEntity(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\t\r\n ]+/g, ' ')
    .trim();
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

function getMoneyNumbers(text) {
  const matches = String(text || '').match(/\d{1,3}(?:,\d{3})+|\d{4,6}/g) || [];
  return matches
    .map(function (value) { return Number(value.replace(/,/g, '')); })
    .filter(function (value) {
      return Number.isFinite(value) && value >= 3000 && value <= 30000;
    });
}

function splitCells(rowHtml) {
  const cells = [];
  String(rowHtml || '').replace(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi, function (_, tag, inner) {
    cells.push(stripTags(inner));
    return '';
  });
  return cells;
}

function extractTableRows(html) {
  const rows = [];
  String(html || '').replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, function (_, inner) {
    const cells = splitCells(inner);
    if (cells.length > 0) rows.push(cells);
    return '';
  });
  return rows;
}

function isGoldContext(text) {
  return /(黃金|金價|飾金|條塊|金飾|金條|每錢|一錢|錢)/.test(String(text || ''));
}

function isWrongContext(text) {
  return /(白金|鉑金|銀價|白銀|美元|盎司|公斤|台幣\/克|每克|買進|入金|回收|賣回)/i.test(String(text || ''));
}

function pickOutputGoldFromRow(cells) {
  const normalizedCells = cells.map(function (cell) { return String(cell || '').trim(); });
  const rowText = normalizedCells.join(' ');
  if (!/出金/.test(rowText)) return 0;
  if (!isGoldContext(rowText) || isWrongContext(rowText)) return 0;

  for (let i = 0; i < normalizedCells.length; i += 1) {
    const cell = normalizedCells[i];
    if (!/出金/.test(cell)) continue;

    const numbersInSameCell = getMoneyNumbers(cell);
    if (numbersInSameCell.length > 0) return numbersInSameCell[0];

    for (let j = i + 1; j < normalizedCells.length; j += 1) {
      const nextCell = normalizedCells[j];
      if (isWrongContext(nextCell)) continue;
      const numbers = getMoneyNumbers(nextCell);
      if (numbers.length > 0) return numbers[0];
    }
  }

  const rowNumbers = getMoneyNumbers(rowText);
  return rowNumbers.length > 0 ? rowNumbers[rowNumbers.length - 1] : 0;
}

function extractGoldPrice(html) {
  const rows = extractTableRows(html);

  for (let i = 0; i < rows.length; i += 1) {
    const value = pickOutputGoldFromRow(rows[i]);
    if (value > 0) return value;
  }

  const text = htmlToText(html);
  const lines = text
    .split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/出金/.test(line)) continue;
    if (!isGoldContext(line) || isWrongContext(line)) continue;

    const sameLineNumbers = getMoneyNumbers(line);
    if (sameLineNumbers.length > 0) return sameLineNumbers[0];

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
      const nextLine = lines[j];
      if (isWrongContext(nextLine)) continue;
      const nextNumbers = getMoneyNumbers(nextLine);
      if (nextNumbers.length > 0) return nextNumbers[0];
    }
  }

  return 0;
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
      throw new Error('KJGA 出金欄位未找到');
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({
      success: true,
      price: Math.round(twdPerMace),
      unit: 'TWD_PER_MACE',
      field: '出金',
      source: 'kjga',
      sourceUrl: GOLD_SOURCE_URL,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    res.status(200).json({
      success: false,
      price: 0,
      message: '自動抓取 KJGA 出金欄位失敗，請手動輸入今日一錢黃金出金價',
      source: 'kjga',
      field: '出金'
    });
  }
}

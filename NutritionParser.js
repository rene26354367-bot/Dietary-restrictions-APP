class NutritionParser {
  constructor() {
    this.ALIASES = {
      calories: {
        exact: [/熱.{0,2}量/i, /能\s*量/i, /Calories/i, /Energy/i],
        ocr: [/熟\s*量/i, /熱\s*重/i, /kca[l1i]/i, /憭批/i],
        feature: [/kcal/i, /大卡/i, /千卡/i, /卡路里/i]
      },
      protein: {
        exact: [/蛋\s*白\s*[質质]?/i, /Protein/i],
        ocr: [/蛋\s*[質质]/i, /螢\s*白/i],
        feature: []
      },
      fat: {
        exact: [/總\s*脂\s*肪/i, /Total\s*Fat/i, /脂\s*肪/i, /(?<![A-Za-z])Fat/i],
        ocr: [/脂\s*[盁盈皿]/i],
        feature: []
      },
      carbohydrate: {
        exact: [/碳\s*水\s*化\s*合\s*物/i, /Carbohydrate/i, /Carbs?/i, /糖\s*類/i, /碳\s*水/i],
        ocr: [/瘛\s*水/i, /蝝\s*瘛/i],
        feature: []
      },
      sugar: {
        exact: [/糖(?!類)/i, /Sugars?/i],
        ocr: [],
        feature: []
      },
      sodium: {
        exact: [/鈉/i, /Sodium/i],
        ocr: [//i],
        feature: [/mg/i, /毫克/i]
      },
    };

    this.NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbohydrate', 'sugar', 'sodium'];
    this.UNIT_TYPES = {
      calories: 'energy',
      protein: 'mass',
      fat: 'mass',
      carbohydrate: 'mass',
      sugar: 'mass',
      sodium: 'sodium',
    };

    this.SERVING_RULES = [
      /(?:每一?份量?|Serving\s*Size|份量[尺寸]{0,2})[^\d]{0,25}(\d+(?:\.\d+)?)\s*(g|公克|克|毫升|ml)/i,
      /(\d+(?:\.\d+)?)\s*(g|公克|克|毫升|ml)\s*[\/每]\s*份/i,
      /每\s*食用份量[^\d]{0,25}(\d+(?:\.\d+)?)\s*(g|公克|克|毫升|ml)/i,
      /份量[^\d]{0,10}(\d+(?:\.\d+)?)\s*(g|公克|克|毫升|ml)/i,
    ];

    this.HEADER_PER_SERVING = /每\s*(?:食用份量|一?份)(?!量)|Per\s*Serving/i;
    this.HEADER_PER_100 = /每\s*100\s*(?:g|ml|公克|克|毫升)?|Per\s*100|100\s*(?:g|ml|公克|克|毫升)/i;

    // 單一營養數字的合理上限
    this.MAX_PER_SERVING = 9999;
  }

  parse(text) {
    if (!text || typeof text !== 'string') return this._emptyResponse();

    const normalized = this._preProcess(text);

    // 區段錨定
    const anchorPatterns = [/營\s*養\s*(?:標\s*示|資\s*料)/i, /Nutrition\s*Facts/i, /Nutritional\s*Information/i];
    let anchoredText = normalized;
    for (const pattern of anchorPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        anchoredText = normalized.substring(match.index);
        break;
      }
    }

    const lines = anchoredText.split('\n').map(l => l.trim()).filter(l => l);
    const baseInfo = this._detectBaseWeight(normalized);
    const baseWeight = baseInfo.value || 100;
    const layout = this._detectColumnLayout(lines);

    const raw = this._extractAllNutrients(lines, layout, baseWeight);

    const per1g = {};
    const warnings = [];
    for (const key of this.NUTRIENT_KEYS) {
      const r = raw[key] || {};
      let chosen = null;
      if (r.per100 != null) {
        chosen = r.per100 / 100;
      } else if (r.perServing != null) {
        chosen = r.perServing / baseWeight;
      }
      per1g[key] = chosen != null ? +chosen.toFixed(6) : null;

      if (r.per100 != null && r.perServing != null && r.perServing > 0 && baseWeight !== 100) {
        const ratio = r.per100 / r.perServing;
        const expected = 100 / baseWeight;
        const drift = Math.abs(ratio - expected) / expected;
        if (drift > 0.15) {
          warnings.push(`${key}: ratio mismatch (got ${ratio.toFixed(3)}, expected ~${expected.toFixed(3)})`);
        }
      }
    }

    const sanityResult = this._runSanityCheck(per1g, raw, baseWeight, anchoredText);
    const missingFields = this.NUTRIENT_KEYS.filter(key => per1g[key] == null);

    return {
      metadata: {
        baseWeight,
        layout: layout.layout,
        order: layout.order,
        targetColumn: layout.targetColumn,
        warnings: warnings.length ? warnings : undefined,
        missingFields: missingFields.length ? missingFields : undefined,
        sanityCheck: sanityResult.ok,
        sanityWarnings: sanityResult.warnings.length ? sanityResult.warnings : undefined,
      },
      raw,
      per1g,
    };
  }

  _preProcess(text) {
    return text
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[：]/g, ':')
      .replace(/\.{2,}/g, ' ')
      .replace(/•/g, ' ')
      .replace(/(\d)[Oo](\d)/g, '$10$2')
      .replace(/(\d)[Oo]\b/g, '$10')
      .replace(/(\d)[Il]\b/g, '$11')
      .trim();
  }

  _detectBaseWeight(text) {
    const flatText = text.replace(/\r?\n/g, ' ');
    for (const regex of this.SERVING_RULES) {
      const m = flatText.match(regex);
      if (m) return { value: parseFloat(m[1]), unit: m[2] };
    }
    return { value: null, unit: 'g' };
  }

  _detectColumnLayout(lines) {
    const lineKind = lines.map(line => {
      const hasServing = this.HEADER_PER_SERVING.test(line);
      const has100 = this.HEADER_PER_100.test(line);
      if (hasServing && has100) return 'inline';
      if (hasServing) return 'perServing';
      if (has100) return 'per100';
      return null;
    });

    for (let i = 0; i < lines.length; i++) {
      if (lineKind[i] === 'inline') {
        const line = lines[i];
        const idxServing = line.search(this.HEADER_PER_SERVING);
        const idx100 = line.search(this.HEADER_PER_100);
        const order = idxServing < idx100 ? ['perServing', 'per100'] : ['per100', 'perServing'];
        return { layout: 'inline', order, targetColumn: 'per100' };
      }
    }

    const headerIdx = lineKind
      .map((h, i) => (h === 'perServing' || h === 'per100') ? { i, h } : null)
      .filter(Boolean);

    for (let k = 0; k < headerIdx.length - 1; k++) {
      const a = headerIdx[k];
      const b = headerIdx[k + 1];
      if (a.h === b.h) continue;
      let hasLabelBetween = false;
      for (let i = a.i + 1; i < b.i; i++) {
        if (this._matchAnyAlias(lines[i])) { hasLabelBetween = true; break; }
      }
      if (!hasLabelBetween) {
        return { layout: 'stacked', order: [a.h, b.h], targetColumn: 'per100' };
      }
    }

    if (headerIdx.length >= 1) {
      const h = headerIdx[0].h;
      return { layout: 'single', order: [h], targetColumn: h };
    }

    return { layout: 'single', order: ['perServing'], targetColumn: 'perServing' };
  }

  _matchAnyAlias(line) {
    return this._findLabels(line).length > 0;
  }

  _extractAllNutrients(lines, layout, baseWeight) {
    const N = layout.order.length;
    const values = Object.fromEntries(this.NUTRIENT_KEYS.map(key => [key, []]));
    const pending = [];

    for (const line of lines) {
      const events = [
        ...this._findLabels(line).map(label => ({ type: 'label', ...label })),
        ...this._extractNumberTokens(line).map(token => ({ type: 'number', ...token })),
      ].sort((a, b) => a.index - b.index || (a.type === 'label' ? -1 : 1));

      for (const event of events) {
        if (event.type === 'label') {
          if (values[event.key].length < N && !pending.includes(event.key)) {
            pending.push(event.key);
          }
          continue;
        }

        if (event.value > this.MAX_PER_SERVING) continue;
        const idx = pending.findIndex(key => this._isCompatibleUnit(key, event.unitType));
        if (idx === -1) continue;

        const key = pending[idx];
        values[key].push(event.value);
        if (values[key].length >= N) {
          // 條件式比例校驗與自動交換 (針對雙欄位)
          if (N === 2 && baseWeight !== 100) {
            const [v1, v2] = values[key];
            const expectedRatio = 100 / baseWeight;
            const ratio12 = v2 / v1;
            const ratio21 = v1 / v2;

            // 如果交換後的比例更接近預期比例，則自動交換
            if (Math.abs(ratio21 - expectedRatio) < Math.abs(ratio12 - expectedRatio) * 0.5) {
               values[key] = [v2, v1];
            }
          }
          pending.splice(idx, 1);
        }
      }
    }

    const result = {};
    for (const key of this.NUTRIENT_KEYS) {
      const r = {};
      const numbers = values[key];
      if (numbers.length === 0) {
        result[key] = r;
        continue;
      }

      if (N === 1) {
        r[layout.order[0]] = numbers[0];
      } else if (numbers.length >= N) {
        for (let i = 0; i < N; i++) r[layout.order[i]] = numbers[i];
      } else {
        r.perServing = numbers[0];
      }
      result[key] = r;
    }
    return result;
  }

  _findLabels(line) {
    const labels = [];
    for (const key of this.NUTRIENT_KEYS) {
      const config = this.ALIASES[key];
      let bestIdx = -1;

      // Tier 1: Exact
      bestIdx = this._firstIndex(line, config.exact);
      
      // Tier 2: OCR Tolerance
      if (bestIdx === -1) {
        bestIdx = this._firstIndex(line, config.ocr);
      }

      // Tier 3: Feature Anchors
      if (bestIdx === -1 && config.feature.length > 0) {
        bestIdx = this._firstIndex(line, config.feature);
      }

      // Special handling for Fat to avoid mixup with Sat/Trans
      if (key === 'fat' && bestIdx >= 0) {
        const before = line.slice(Math.max(0, bestIdx - 6), bestIdx);
        const enBefore = line.slice(Math.max(0, bestIdx - 16), bestIdx);
        if (/飽\s*和|反\s*式|Saturated|Trans/i.test(before) || /Saturated|Trans/i.test(enBefore)) {
          bestIdx = -1;
        }
      }

      if (bestIdx >= 0) {
        labels.push({ key, index: bestIdx });
      }
    }
    return labels.sort((a, b) => a.index - b.index);
  }

  _firstIndex(line, patterns) {
    let best = -1;
    for (const pattern of patterns) {
      const idx = line.search(pattern);
      if (idx >= 0 && (best === -1 || idx < best)) best = idx;
    }
    return best;
  }

  _extractNumberTokens(text) {
    const cleaned = text.replace(/(\d)\s+(?=\d|\.)/g, '$1');
    const tokens = [];
    const tokenRegex = /(-?\d+(?:\.\d+)?)\s*(大卡|千卡|卡路里|kcal|cal|公克|克|g|毫克|mg)?/gi;
    let m;
    while ((m = tokenRegex.exec(cleaned)) !== null) {
      tokens.push({
        value: parseFloat(m[1]),
        unitType: this._unitType(m[2] || ''),
        index: m.index,
      });
    }
    return tokens;
  }

  _unitType(unit) {
    if (/大卡|千卡|卡路里|kcal|cal/i.test(unit)) return 'energy';
    if (/毫克|mg/i.test(unit)) return 'sodium';
    if (/公克|克|g/i.test(unit)) return 'mass';
    return 'unknown';
  }

  _isCompatibleUnit(key, unitType) {
    if (key === 'sodium') return unitType === 'sodium';
    if (unitType === 'unknown') return true;
    return this.UNIT_TYPES[key] === unitType;
  }

  _runSanityCheck(per1g, raw, baseWeight, text) {
    const warnings = [];
    const p = per1g.protein || 0;
    const f = per1g.fat || 0;
    const c = per1g.carbohydrate || 0;
    const cal = per1g.calories || 0;

    // 1. 熱量一致性 (P*4 + F*9 + C*4)
    if (cal > 0 && (p > 0 || f > 0 || c > 0)) {
      const calcCal = p * 4 + f * 9 + c * 4;
      const drift = Math.abs(calcCal - cal) / cal;
      if (drift > 0.25) {
        warnings.push(`Calories consistency mismatch: calculated ${calcCal.toFixed(1)}, labeled ${cal.toFixed(1)}`);
      }
    }

    // 2. 總量合理性 (P+F+C <= 1.1)
    const totalMass = p + f + c;
    if (totalMass > 1.1) {
      warnings.push(`Total nutrients mass exceeds 1g: ${totalMass.toFixed(2)}g`);
    }

    // 3. 飽和脂肪混入偵測
    if (f > 0.5 && text.includes('飽和')) {
       // 如果脂肪占比過高，且文本包含飽和，懷疑誤抓
       if (cal > 0 && f * 9 > cal * 0.8) {
         warnings.push(`High fat detected (${f.toFixed(2)}g/1g), possible sub-item mixup.`);
       }
    }

    return {
      ok: warnings.length === 0,
      warnings
    };
  }

  _emptyResponse() {
    return { metadata: {}, raw: {}, per1g: {} };
  }
}


NutritionParser.parse = (text) => new NutritionParser().parse(text);
module.exports = NutritionParser;




# OCME Formula Core v0.3

## 目的

OCME 不再把 TeX、MathML 與 Semantic AST 視為三份可獨立手動編輯的資料。v0.3 將 `formula.tex` 設為單一來源，其他欄位必須由同一編譯器重建。

```text
TeX source
├── MathML rendering structure
├── Semantic AST
└── SHA-256 provenance
```

## 為什麼採用小型核心

完整 TeX 是排版語言，包含巨集、條件、套件與大量呈現命令。直接宣稱能把任意 TeX 無損轉為數學語義是不誠實的。

OCME Formula Core 採用白名單語法：

- 支援的結構有明確 parser 與 AST；
- 未支援命令立即產生 `FormulaSyntaxError`；
- 不以圖片或 OCR 結果代替結構；
- 不在失敗時自行猜測作者意圖。

## v0.3 支援範圍

```text
equation
addition
subtraction
power
subscript
function_call
fraction
square_root
group
number
symbol
constant
```

希臘符號目前僅支援白名單中的 `gamma`、`pi`、`theta`、`alpha`、`beta`。

## AST 範例

TeX：

```tex
a^2+b^2=c^2
```

核心結構：

```json
{
  "type": "equation",
  "lhs": {
    "type": "addition",
    "operands": [
      {
        "type": "power",
        "base": { "type": "symbol", "name": "a", "glyph": "a" },
        "exponent": { "type": "number", "value": 2 }
      },
      {
        "type": "power",
        "base": { "type": "symbol", "name": "b", "glyph": "b" },
        "exponent": { "type": "number", "value": 2 }
      }
    ]
  },
  "rhs": {
    "type": "power",
    "base": { "type": "symbol", "name": "c", "glyph": "c" },
    "exponent": { "type": "number", "value": 2 }
  }
}
```

## 語義邊界

此 AST 表示公式的通用操作結構，但不自動知道：

- `a`、`b` 是直角三角形的股；
- `c` 是斜邊；
- 等式在哪一種幾何背景成立；
- 它是定義、定理還是計算結果。

這些領域語義由 MKO 的 `symbols`、`assumptions`、`type`、`dependencies` 與證明狀態補充。

因此：

```text
compiler AST + MKO semantic bindings > compiler AST alone
```

## 漂移檢查

```bash
npm run verify:formulas
```

會重新編譯所有 `formula.tex`，並以深度結構比較確認：

- MathML 完全一致；
- Semantic AST 完全一致；
- 編譯器 ID 與版本一致；
- SHA-256 與 TeX 來源一致。

重建並寫回：

```bash
npm run compile:formulas
```

## 未來擴展原則

新增語法時必須同時完成：

1. tokenizer／parser；
2. AST Schema；
3. MathML renderer；
4. 正向測試；
5. 負向與歧義測試；
6. 舊物件回歸測試。

不得只為了「能顯示」而加入無法被 AST 與 Schema 描述的特殊分支。

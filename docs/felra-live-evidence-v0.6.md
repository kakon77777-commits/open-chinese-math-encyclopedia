# OCME v0.6：真實 FELRA Evidence

## 執行基線

```text
repository: kakon77777-commits/FELRA
commit: 1005228db4bda832f98069f80879ec2ba1dd8440
version: 1.0.0
```

OCME 以 `felra/FELRA_LOCK.json` 固定實際證據生產器版本。FELRA 的執行結果先被正規化成 source manifest 與結果快照，再由統一 Evidence Builder 建立內容定址 Evidence Object。

## 被驗證的有限域命題

在宣告整數域中，任何滿足

$$
a^2+b^2=c^2
$$

的三元組，其 $c$ 不小於 $a$ 與 $b$。

這不是對畢達哥拉斯定理的重新證明，而是該公式在有限整數域中的一項可計算衍生性質。

## 宣告域與結果

```text
a,b,c ∈ {1,2,...,50}
seed = 42
```

- declared Cartesian grid：125,000 點，全通過；
- boundaries：8 點，全通過；
- counterexample search：20,000 點，全通過；
- `config_sha256`：`f97c311f700e307060de6baf76ecc39484d354b7694aff72dac174e4941c4072`；
- `result_sha256`：`d0efaa650153939ec8492933a667db36d3373d38d765b6ff4acd9a0f58b749ce`；
- replay：MATCH。

Canonical Evidence ID：

```text
evidence-sha256-97ad4a4b529de8c77662f823ad0966c24cfe1c121af8cbb4320135b9ea849448
```

## 失敗紀錄

第一次整合使用 `floor()`，但 FELRA 的安全數值 AST 未將其列為允許函式。`numerical`、`boundaries` 與 `counterexample_search` 三個通道都在計算前拒絕執行。

這次失敗沒有被標記為通過，也沒有建立 Canonical Evidence。專案後來改寫成安全子集可表達的三變數蘊含式，才完成成功執行與 replay。

## 證據界線

Evidence Object 固定標記：

```text
quantification: finite_declared_domain
universal_proof: false
```

因此：

$$
\text{125,000 點全通過}
\not\Rightarrow
\text{畢達哥拉斯定理已由計算證明}
$$

## 重建流程

```bash
felra run felra/pythagorean/project.yaml \
  --output artifacts/felra/pythagorean

npm run normalize:felra -- \
  --run-dir artifacts/felra/pythagorean \
  --write

npm run build:evidence
npm run check
```

FELRA 原始 run 目錄不作為百科直接介面；Canonical Evidence 由正規化快照、來源雜湊、限制與 replay 聲明共同決定。

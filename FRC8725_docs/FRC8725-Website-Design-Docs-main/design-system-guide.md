# 網頁介面設計指南

> 依據 Apple Human Interface Guidelines 與 Shopify Polaris React 的設計觀念統整  
> 整理日期：2026-07-27  
> 適用對象：UI/UX 設計師、前端工程師、產品經理與建立設計系統的團隊

本文件將兩個來源中的共通觀念整理為一套可直接用於網站、Web App、後台系統與響應式介面的設計方法。內容以實際工作流程編排，不對來源逐一介紹或比較。

本文件是 Team 8725 所有網站與 Web App 的**唯一正式設計規範**，同時定義通用方法、團隊品牌、token、元件與實作限制。產品專屬文件只能補充領域流程，不得覆寫本規範。

---

## 1. 設計目標

好的網頁介面應讓使用者：

- 快速理解目前所在位置與頁面目的。
- 看得出哪些內容重要、哪些元素可以操作。
- 用最少步驟完成主要任務。
- 預測操作結果，並在操作後得到明確回饋。
- 發生錯誤時知道問題與修正方法。
- 在不同裝置、畫面尺寸與輸入方式下順利操作。
- 使用鍵盤、螢幕閱讀器或其他輔助技術完成相同任務。

設計不只是安排視覺樣式。每一個畫面都應同時處理內容、導覽、操作、狀態、錯誤、可及性與響應式行為。

---

## 2. 設計流程

### 2.1 先理解問題

不要從選擇元件或套用 UI Kit 開始。先回答：

1. 誰會使用這個頁面？
2. 使用者想完成什麼？
3. 他在進入頁面前做了什麼？
4. 完成後會前往哪裡？
5. 哪些資訊是做決定所必需？
6. 哪些錯誤、權限或例外可能阻止任務？
7. 成功可以如何衡量？

頁面不應只反映組織內部的部門或資料庫結構，而要符合使用者對工作流程的理解。

### 2.2 自由探索解法

- 先畫低精度流程與 wireframe。
- 為重要問題提出兩到三種方案。
- 先確認資訊與操作順序，再處理顏色和細節。
- 不要為了配合現有元件而扭曲任務。
- 以真實內容和接近真實的資料量測試，而不是只放理想範例。

### 2.3 與設計系統校準

確認流程後，再使用既有的：

- Layout patterns
- Components
- Design tokens
- Icons
- Content guidelines
- Accessibility behaviors

若現有元件不足，先判斷缺少的是單一頁面的特殊需求，還是可在多處重複使用的新模式。

### 2.4 原型、測試與修正

- 測試主要任務能否順利完成。
- 觀察使用者是否理解名稱、層級與按鈕結果。
- 測試 loading、empty、error、success 等非理想狀態。
- 測試手機、平板、桌面與不同視窗寬度。
- 測試鍵盤、觸控、滑鼠及輔助技術。

---

## 3. 資訊架構

資訊架構決定內容如何命名、分組、排列與被找到。

### 3.1 建立清楚層級

每個頁面應具有：

- 一個清楚的頁面標題。
- 一個主要目的。
- 一個最重要的主要動作。
- 依重要性排列的內容區段。
- 可理解的返回或前往下一步路徑。

避免：

- 同一層級出現太多項目。
- 所有內容都使用相同視覺重量。
- 將不相關功能塞進同一卡片。
- 頁面名稱、選單名稱與按鈕名稱不一致。

### 3.2 命名原則

- 使用使用者熟悉的詞彙。
- 名稱應簡短、具體且能長期使用。
- 同一概念全站使用相同名稱。
- 避免只在團隊內部才理解的縮寫。
- 操作名稱應描述結果，例如「儲存變更」比「確定」清楚。

### 3.3 導覽模式

| 情況 | 建議方式 |
| --- | --- |
| 少數同層主要區域 | 頂部導覽或 tabs |
| 大型後台、多個功能群組 | 側邊欄 |
| 多層內容位置 | Breadcrumbs |
| 線性任務 | Stepper 或明確的上一步／下一步 |
| 大量內容查找 | 搜尋、篩選、排序與分類 |
| 單一內容內跳轉 | 目錄或錨點導覽 |

導覽應讓使用者隨時知道：

- 我在哪裡？
- 我可以去哪裡？
- 如何返回？
- 離開目前頁面是否會遺失資料？

---

## 4. 頁面結構與版面

### 4.1 建議頁面骨架

常見的工作型介面可包含：

1. 全域導覽
2. 頁面標題與說明
3. 主要及次要動作
4. 搜尋或篩選工具
5. 主要內容
6. 輔助資訊
7. 狀態回饋

不是每個頁面都需要所有區塊。應依任務刪除不必要元素。

### 4.2 視覺層級

使用以下方法建立層級：

- 位置
- 間距
- 字級與字重
- 色彩與對比
- 容器與分隔線
- 深度與陰影
- 內容密度

不要只依靠顏色表達重要性或狀態。

### 4.3 間距系統

使用一致的 spacing scale，例如：

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```

原則：

- 相關內容靠近，不相關內容拉開。
- 元件內距應小於不同區段之間的距離。
- 不要在每個頁面建立新的任意數值。
- 以 design token 表達間距，而不是散落硬編碼數值。

### 4.4 Card 的使用

Card 適合：

- 將同一概念或任務聚集在一起。
- 建立可掃讀的內容單位。
- 在 dashboard 中呈現獨立摘要。

Card 不適合：

- 每一小段文字都套一層卡片。
- 多層卡片互相巢狀。
- 只為了加上圓角與陰影。
- 將彼此無關的操作放在同一卡片。

### 4.5 圓角與形狀

形狀應幫助辨識層級與元件類型，不應只為追求柔和外觀而過度圓角。

- 除了設計目的明確為圓形的物件，多數長方形元件的圓角半徑不得超過自身最短邊的三分之一。
- 實際圓角應符合 `radius ≤ min(width, height) ÷ 3`；元件縮小時需同步降低圓角。
- 一般 button、input、card、panel、list row、toast 與 dialog 不使用膠囊外形。
- `50%` 圓角保留給正圓頭像、圓形 icon button、色票或進度圓點。
- 膠囊圓角只用於短狀態 badge、segmented control 等確有語意或功能需求的元件。
- Radius token 是建議值，不代表可以突破元件的幾何上限。

---

## 5. 響應式設計

響應式設計不是將桌面版等比例縮小，而是依可用空間重新安排優先順序。

### 5.1 基本原則

- 優先保留主要內容和主要動作。
- 次要內容可移至折疊區、drawer 或下一層頁面。
- 多欄版面在窄螢幕改為單欄。
- 工具列空間不足時，保留常用動作，其餘放入 overflow menu。
- 表格不能單純壓縮到文字無法閱讀。
- 不要讓頁面出現非預期的水平捲動。

### 5.2 表格在小畫面的處理

依任務選擇：

- 隱藏低優先欄位。
- 允許表格區域水平捲動。
- 將每列轉為摘要卡片。
- 點入詳細頁查看完整資料。
- 保留選取、篩選與批次操作能力。

### 5.3 不同輸入方式

網頁可能透過觸控、滑鼠、觸控板、鍵盤或輔助技術操作。

- 不要將重要功能只放在 hover。
- 拖放功能應有按鈕或選單替代方案。
- 點擊區域需足夠大且彼此有間隔。
- 所有互動都應有明顯 focus state。
- 不要覆寫使用者熟悉的瀏覽器快捷鍵。

---

## 6. 色彩、字體與圖示

### 6.1 色彩

色彩應用於：

- 建立層級。
- 傳達狀態。
- 指示重要或急迫資訊。
- 協助辨認互動元素。

至少建立以下語意色：

```text
background
surface
text-primary
text-secondary
border
interactive
focus
success
warning
critical
info
disabled
```

原則：

- 使用語意 token，不在元件中直接寫固定色碼。
- 確保文字和背景具有足夠對比。
- 不只用紅、黃、綠區分狀態，應搭配圖示與文字。
- 同一狀態在全站使用一致顏色與語意。
- 深色主題需重新檢查對比、陰影與圖片，不可只反轉顏色。

#### CSS 顏色實作

- 所有 CSS 選擇器中的顏色一律使用自訂屬性，例如 `color: var(--color-text)`。
- Hex、RGB、HSL、透明色與陰影色只能出現在 token／變數定義層，不得散落在元件或頁面樣式。
- `transparent`、半透明色與漸層色標也要先定義為變數；圖示跟隨文字顏色時可繼承 `currentColor`。
- 新顏色必須先加入基礎或語意 token，說明用途後才能由元件引用。
- 不得以不同變數名稱重複同一顏色來規避 token 治理。

### 6.2 Typography

所有一般介面文字一律使用：

```css
:root {
  --font-family: "TASA Explorer", "TASA Orbiter", "IBM Plex Sans JP", sans-serif;
}

body {
  font-family: var(--font-family);
}
```

- 元件不得自行宣告另一組一般介面字型。
- 程式碼、識別碼或需等寬對齊的資料可使用獨立的 `--font-mono`。
- 若載入 Web Font，需提供合法授權、Woff2、適當的 `font-display` 與載入失敗後的 fallback。

建立有限且清楚的文字層級：

- Page title
- Section heading
- Subheading
- Body
- Supporting text
- Label
- Caption

原則：

- 內文以易讀為優先。
- 不以全大寫呈現長文字。
- 行長不宜過長。
- 使用足夠行高。
- 允許瀏覽器縮放，不固定或裁切文字。
- 文字放大後，介面仍應可使用。

### 6.3 Icons

- 優先使用一致的 icon library。
- 圖示應符合使用者熟悉的意義。
- 不要為裝飾而加入過多圖示。
- 不熟悉或重要的操作應搭配文字標籤。
- Icon-only button 必須提供 accessible name。
- 不要用同一圖示代表不同功能。
- Team 8725 共用圖示採 24×24 viewBox、1.75 px 線條與圓角端點，顏色繼承 `currentColor`。
- 純裝飾圖示使用 `aria-hidden="true"`；只有圖示的按鈕提供 `aria-label` 與可由 hover、focus 取得的名稱。

---

## 7. 元件設計規範

### 7.1 Button

按鈕代表執行動作。

- 每個區域通常只保留一個 primary action。
- 次要動作降低視覺重量。
- 危險操作使用明確文字與適當警示。
- 按鈕文字使用動詞，描述會發生的結果。
- 提交期間顯示 loading，並防止重複提交。
- Disabled button 若原因不明，需提供說明或改用可互動的驗證方式。

### 7.2 Link

Link 用於前往另一頁、另一位置或外部資源；Button 用於改變目前狀態或執行操作。不要只因為外觀需求互換語意。

### 7.3 Form

表單應：

- 每個欄位都有可見 label。
- 必填與選填規則清楚且一致。
- 使用適合資料類型的 input。
- 在合理時機驗證，不要等全部送出後才一次顯示模糊錯誤。
- 保留使用者已輸入的正確資料。
- 錯誤訊息靠近欄位，並與欄位建立程式關聯。
- 提供格式範例，但不要用 placeholder 取代 label。
- 將相關欄位分組，長表單分段處理。

### 7.4 Selection controls

| 元件 | 使用情境 |
| --- | --- |
| Checkbox | 零個、一個或多個選項 |
| Radio button | 少量互斥選項，且希望同時看見所有選項 |
| Select | 空間有限的單選清單 |
| Combobox / Autocomplete | 選項很多，需要搜尋或建議 |
| Toggle | 立即生效的開／關設定 |
| Date picker | 選擇日期或日期範圍 |

### 7.5 Tables and lists

大量資料介面通常需要：

- 清楚欄位標題。
- 搜尋與篩選。
- 排序。
- 分頁或持續載入。
- 選取與批次操作。
- 無資料和無搜尋結果的不同狀態。
- 列層級的主要與次要操作。

數字應依適合的方向對齊；日期、時間、金額和單位需使用一致格式。

### 7.6 Overlays

Modal、dialog、popover 與 tooltip 應謹慎使用。

- Modal 適合需要集中注意力的短任務或重要確認。
- 不要在 modal 中再開啟另一個 modal。
- 開啟後將鍵盤焦點移入，關閉後返回觸發元素。
- 使用者應能理解如何關閉。
- Tooltip 只能補充資訊，不可承載完成任務所必需的內容。
- 複雜、長時間或多步驟工作應使用獨立頁面。

---

## 8. Patterns：完整任務的設計

### 8.1 Resource index

適用於商品、訂單、使用者或其他大量物件。

建議結構：

1. 頁面標題與新增動作
2. 搜尋
3. Filter 和 saved views
4. 結果數量
5. Table 或 list
6. Selection 與 bulk actions
7. Pagination

### 8.2 Resource details

適用於檢視或編輯單一物件。

- 頂部顯示名稱、狀態與主要動作。
- 依工作流程組織內容，不直接照資料表欄位排列。
- 顯示未儲存變更。
- 重要刪除操作與一般操作分離。
- 儲存成功或失敗後提供清楚回饋。

### 8.3 Settings

- 依使用者理解的主題分組。
- 在設定名稱旁說明影響。
- Toggle 用於立即生效的二元設定。
- 若需要同時修改多個欄位，使用明確的儲存動作。
- 重大變更應說明範圍、後果與是否可復原。

### 8.4 Onboarding

- 先協助使用者取得第一個實際成果。
- 一次只介紹當下需要的功能。
- 允許跳過非必要步驟。
- 顯示進度，但不要創造不必要步驟。
- 教學結束後，功能本身仍應可以被理解。

---

## 9. 介面狀態與回饋

每個資料區域都應考慮：

| 狀態 | 設計重點 |
| --- | --- |
| Initial | 尚未操作時提供清楚起點 |
| Loading | 保留上下文，顯示正在進行 |
| Empty | 說明為何沒有內容及如何開始 |
| No results | 保留搜尋條件並提供清除或調整方式 |
| Partial | 部分內容可用時，不必阻擋整個頁面 |
| Success | 告知結果與下一步 |
| Warning | 說明風險，但不一定阻止操作 |
| Error | 說明問題、影響與修正方法 |
| Offline | 說明哪些功能不可用及資料是否保留 |
| Permission denied | 說明缺少的權限與取得方式 |

### 9.1 Loading

- 短暫等待可使用 spinner。
- 結構已知的內容使用 skeleton，以減少畫面跳動。
- 已存在的內容重新整理時，盡量保留可閱讀內容。
- 長時間工作應顯示進度或階段。
- 不要顯示假的精確進度。

### 9.2 Empty state

空白狀態應包含：

- 目前沒有什麼。
- 為什麼這對使用者重要。
- 可以採取的下一步。

完整頁面沒有資料可使用較明顯的 empty state；單一小區塊沒有資料時，使用簡短說明即可。

### 9.3 Error message

錯誤訊息應採用：

```text
發生什麼事 + 受到什麼影響 + 如何修正
```

例如：

```text
無法儲存設定。你輸入的網址格式不正確，請加入 https:// 後再試一次。
```

避免：

- 「發生未知錯誤」
- 只顯示錯誤代碼
- 責怪使用者
- 清除已輸入內容
- 沒有任何復原路徑

### 9.4 Dangerous actions

- 使用具體文字，例如「刪除專案」，不要只寫「確定」。
- 說明影響範圍與是否可復原。
- 優先提供 undo、archive 或 trash 等可復原方案。
- 只有真正高風險且不可逆的操作才要求額外確認。
- 不要讓確認對話框因過度使用而失去警示效果。

---

## 10. 內容設計

介面文字是操作的一部分。

### 10.1 撰寫原則

- 直接說明使用者要知道的內容。
- 先寫最重要資訊。
- 使用常見字詞和短句。
- 按鈕使用清楚動詞。
- 標題描述內容，不使用空泛口號。
- 說明功能帶來的結果，不只描述系統行為。
- 用一致語氣，但不要為了品牌語氣犧牲清楚度。

### 10.2 國際化

- 不在程式碼中拼接句子片段。
- 預留翻譯後文字變長的空間。
- 不假設姓名、地址、電話與郵遞區號只有單一格式。
- 日期、時間、數字、幣別和單位依 locale 顯示。
- 考慮由右至左的閱讀方向。
- 圖示、顏色與比喻可能具有文化差異。

### 10.3 Alternative text

- 傳達內容的圖片需描述其目的或重要資訊。
- 裝飾圖片使用空的替代文字。
- 不需要重複圖片旁已存在的文字。
- 圖表需要能傳達結論或提供可存取資料。

---

## 11. Accessibility

可及性應在設計開始時納入，而不是開發完成後補救。

### 11.1 鍵盤

- 所有互動元素可用鍵盤操作。
- Tab 順序符合視覺與閱讀順序。
- Focus indicator 清楚可見。
- 不產生 keyboard trap。
- 自訂元件支援預期的方向鍵、Enter、Space 和 Escape 行為。

### 11.2 語意與螢幕閱讀器

- 使用正確 HTML elements。
- 頁面具有合理 heading hierarchy。
- Form label 與 input 正確關聯。
- 錯誤與提示可被程式辨識。
- 動態狀態更新在必要時被宣告。
- Accessible name 與畫面文字保持一致。

### 11.3 視覺

- 文字與背景具有足夠對比。
- 不只依顏色傳達資訊。
- 支援瀏覽器放大與文字縮放。
- 放大後內容不被裁切或重疊。
- 動畫與閃爍不造成不適。
- 尊重 reduced motion 等使用者偏好。

### 11.4 觸控與行動裝置

- 操作目標足夠大。
- 相鄰操作之間保有距離。
- 重要動作不只依靠精細手勢。
- 裝置方向改變後仍能完成任務。

---

## 12. Design tokens 與元件治理

### 12.1 建議 token 類別

```text
color
spacing
typography
border
radius
shadow
breakpoint
motion
z-index
```

Token 應以用途命名，例如：

```text
color-text-critical
color-surface-selected
space-section
radius-card
duration-feedback
```

這比 `red-500` 或 `spacing-24` 更能表達介面語意；基礎 token 與語意 token 也可以分層使用。

### 12.2 元件文件至少包含

- 用途
- 適用與不適用情境
- Anatomy
- Variants
- States
- Responsive behavior
- Accessibility behavior
- Content guidance
- API 或 props
- Examples

### 12.3 元件生命週期

| 階段 | 意義 |
| --- | --- |
| Alpha | 解法仍在探索，可能大幅變更 |
| Beta | 可進一步採用，但仍可能調整 |
| Stable | API 與使用方式穩定，可正式採用 |
| Legacy | 尚可使用，但已有替代方向 |
| Deprecated | 即將移除，不應在新功能中使用 |

正式專案應優先使用 Stable 元件，並定期檢查 Legacy 與 Deprecated 項目。

---

## 13. Motion、深度與回饋

### Motion

動畫應：

- 解釋元素從哪裡出現或前往哪裡。
- 表達狀態改變。
- 確認使用者操作已被接收。
- 保持短暫且不阻礙工作。
- 能配合 reduced motion。

不要只為了讓畫面「更活潑」而加入無意義動畫。

### Depth

陰影、模糊、材質與層次可用來：

- 區分前景和背景。
- 強調暫時浮出的介面。
- 表示元素間的空間關係。
- 建立焦點。

同一層級應使用一致的深度，不要讓每張卡片具有不同陰影。

### Sound and haptics

Web 介面通常不應自動播放音效。只有當聲音能提供必要且可預期的回饋時才使用，並提供靜音和視覺替代方式。

---

## 14. 開發驗收清單

### 結構與流程

- [ ] 頁面目的和主要動作清楚。
- [ ] 導覽位置、返回路徑與離開影響清楚。
- [ ] 元件符合任務語意。
- [ ] 危險操作說明結果並可合理復原。

### Responsive

- [ ] 已測試手機、平板、桌面及中間寬度。
- [ ] 沒有非預期水平溢出。
- [ ] 長文字、翻譯文字和大型資料不破版。
- [ ] 觸控、滑鼠與鍵盤皆能操作。

### States

- [ ] 已完成 loading、empty、no results、success 和 error。
- [ ] 網路失敗與重新嘗試流程清楚。
- [ ] 未授權和沒有權限是不同狀態。
- [ ] 提交期間不會重複執行。

### Accessibility

- [ ] 可只用鍵盤完成主要流程。
- [ ] Focus 順序與樣式正確。
- [ ] Heading、landmark、form 和 table 使用正確語意。
- [ ] 圖示按鈕和圖片具有適當替代資訊。
- [ ] 文字和互動元素符合對比需求。
- [ ] 放大文字後內容仍可閱讀與操作。
- [ ] 動態更新與錯誤能被輔助技術理解。

### Content and locale

- [ ] 名稱和用詞全站一致。
- [ ] 按鈕描述操作結果。
- [ ] 錯誤訊息提供修正方式。
- [ ] 日期、時間、數字與幣別依 locale 格式化。
- [ ] 沒有依賴固定文字長度。

### Design system

- [ ] 使用 tokens，而非散落硬編碼數值。
- [ ] CSS 選擇器中的顏色全部透過變數引用。
- [ ] 一般介面文字全部使用 `var(--font-family)`。
- [ ] 長方形元件的圓角不超過自身最短邊的 1/3。
- [ ] 圓形與膠囊外形只用於規範允許的元件。
- [ ] 沒有重複建立功能相同的元件。
- [ ] 沒有採用 Deprecated 元件。
- [ ] 新元件具備狀態、響應式與可及性規格。

---

## 15. Team 8725 實作設定

### 15.1 規範層級

- 本文件是所有產品的單一權威來源。
- [`design-system/interaction-checklist.md`](design-system/interaction-checklist.md) 是依本文件整理的驗收工具，不建立新規則。
- [`design-system/tokens/`](design-system/tokens/) 提供可直接使用的色彩、字體、間距、圓角、陰影與動效值。
- [`design-system/starter/`](design-system/starter/) 是參考實作，不是特定產品版型。
- 產品文件可定義導覽、資料欄位、權限與領域流程，但不得覆寫共用 token、無障礙、圓角、字體或 CSS 顏色規則。

### 15.2 品牌

- 品牌名稱使用「Team 8725」，產品名稱作為副標，不固定使用單一系統名稱。
- 正式 Logo 使用 [`design-system/assets/images/icon.ico`](design-system/assets/images/icon.ico)，白色背景、`object-fit: contain`，不得拉伸、裁切、加濾鏡或改色。
- Logo 建議桌面 44×44 px、手機 38×38 px；空間不足時先隱藏副標，再隱藏品牌文字，不壓縮 Logo。
- 品牌連結回到產品首頁；若 Logo 與文字同屬一個連結，圖片使用空 `alt`，連結提供完整 `aria-label`。

### 15.3 共用 token

正式實作匯入 [`design-system/tokens/tokens.css`](design-system/tokens/tokens.css)，不得在產品內複製並修改同名 token。

| 類別 | 主要 token |
| --- | --- |
| 背景與表面 | `--color-bg`、`--color-surface-1`、`--color-surface-2` |
| 文字與邊框 | `--color-text`、`--color-text-muted`、`--color-border` |
| 互動與狀態 | `--color-primary`、`--color-info`、`--color-success`、`--color-warning`、`--color-danger` |
| 字體 | `--font-family`、`--font-mono` |
| 間距 | `--space-1` 至 `--space-8` |
| 圓角 | `--radius-xs` 至 `--radius-lg`；`--radius-pill` 僅限允許的膠囊元件 |
| 動效與深度 | `--duration-*`、`--focus-ring`、`--shadow-floating` |

### 15.4 建議尺寸與動效

- 一般按鈕高度至少 38 px，觸控目標至少 44×44 px。
- 桌面側欄若採可收合模式，建議展開 260 px、收合 76 px。
- Hover／focus 回饋約 120 ms、浮層約 150 ms、版面轉換約 180 ms。
- 使用 `prefers-reduced-motion: reduce` 關閉非必要動畫，不對整頁使用 `transition: all`。
- 一般表面使用邊框；陰影只用於 dialog、popover、menu 與 toast 等浮動層。

### 15.5 產品延伸規範

物品管理、賽事、隊員、活動等產品可建立自己的流程文件。延伸文件必須標明適用產品與版本、連回本指南，且不得把領域名稱、固定導覽或單一任務流程寫成全團隊通則。

### 15.6 變更流程

1. 先修改本指南或 token，再修改正式元件。
2. 新共用模式至少應在兩種產品情境成立；單一需求留在產品文件。
3. 驗證 default、hover、focus、disabled、loading、empty、error、響應式、長文字與鍵盤操作。
4. PR 說明變更章節、影響產品、相容性與遷移方式。
5. 破壞性變更提供棄用期，不維護同名但行為不同的元件。

---

## 16. 官方參考資料

### Apple Human Interface Guidelines

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Foundations](https://developer.apple.com/design/human-interface-guidelines/foundations)
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search)
- [Selection and input](https://developer.apple.com/design/human-interface-guidelines/selection-and-input)
- [Components](https://developer.apple.com/design/human-interface-guidelines/components)

### Shopify Polaris React

- [Getting Started](https://polaris-react.shopify.com/getting-started)
- [Building with Polaris](https://polaris-react.shopify.com/getting-started/designing-with-a-system)
- [Foundations](https://polaris-react.shopify.com/foundations)
- [Design](https://polaris-react.shopify.com/design)
- [Content](https://polaris-react.shopify.com/content)
- [Patterns](https://polaris-react.shopify.com/patterns)
- [Components](https://polaris-react.shopify.com/components)
- [Tokens](https://polaris-react.shopify.com/tokens)
- [Component lifecycle](https://polaris-react.shopify.com/getting-started/components-lifecycle)

---

## 17. 維護說明

本指南是兩個官方設計資源的實務統整，不取代原始文件。設計規範、瀏覽器能力、元件 API 與可及性標準都可能更新；實作特定元件或準備正式發布前，應回到相應官方頁面確認最新要求。

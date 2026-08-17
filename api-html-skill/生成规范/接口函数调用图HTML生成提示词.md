# 接口函数调用图 HTML 生成提示词

你现在要为一个后端接口生成“函数调用关系可视化 HTML”。这不是普通 Markdown 说明，也不是 Mermaid 图，而是一个可直接在浏览器打开的单文件 HTML 工具。

生成前必须先阅读并参考这个示例文件：

`D:\LINJING-Aevil\api-html-skill\项目\opsServer\promptops-role-list-callgraph.html`

生成时必须同时吸收经验文件中的避坑规则：

`D:\LINJING-Aevil\api-html-skill\经验积累\HTML函数调用图经验.md`

最终产物统一放到：

`D:\LINJING-Aevil\api-html-skill\项目\<仓库名>\`

不要把 HTML 生成到业务仓库自己的 `docs`、`test`、`tmp` 或源码目录里。

---

## 一、你的任务

围绕用户指定的一个接口，以接口路由为锚点，分析它从路由注册开始，到 controller、service、model、db、helper、builder、返回 VO 的完整函数调用链路，并生成一个可以交互查看的 HTML 页面。

页面要让用户能完成这些事情：

1. 在画布中看到这个接口涉及的函数节点和调用关系。
2. 拖动节点整理布局，线条实时跟随变化。
3. 点击某个函数节点，在右侧查看函数名、文件路径、函数注释、函数作用、参数说明和源代码。
4. 在右侧源码里点击下游函数名字，跳转到对应函数节点，并更新右侧详情。
5. 点击右侧源码里的结构体名，在左侧查看结构体源码和字段表。
6. 使用右侧前进/后退按钮按“点击历史”切换节点，逻辑类似 VSCode 的前进/后退，而不是浏览器历史，也不是自动遍历调用链。
7. 在“函数注释”编辑框里实时修改节点的一句解释，并同步显示到节点卡片上。

---

## 二、视觉风格固定要求

风格固定为灰白简约、技术文档型、Swiss 网格风。不要临时发挥其他视觉方向。

必须使用：

- 背景：`#f5f6f7` / `#f8f9fa` / `#ffffff`
- 线条：`#d8dde3` / `#aeb7c2`
- 正文：`#1f2933`
- 弱文本：`#697586`
- 蓝色链接：`#2f6f9f`
- 红色选中态：`#c0392b`
- 字体：`"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif`
- 代码字体：`Consolas, "Microsoft YaHei", monospace`
- 背景必须有浅灰网格，类似工程画布。
- 节点为白底浅灰边框，轻微阴影，圆角 8px 左右。
- 选中节点不能只改边框颜色，必须在节点外额外显示一层红色包围框。
- 页面不要使用暗黑风、紫色默认风、赛博风、渐变炫光、图标堆砌或无意义装饰。

---

## 三、页面结构固定要求

HTML 必须是完整单文件：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>接口名称函数调用图</title>
</head>
<body>...</body>
</html>
```

不能只输出片段式 `<div>`，否则本地 `file://` 打开容易出现中文编码问题。

页面分为三栏：

1. 左侧：结构体详情面板。
2. 中间：SVG 画布。
3. 右侧：函数详情面板。

左右侧栏必须支持拖拽调整宽度。拖拽时不要设置固定最大宽度，只需要保证中间画布保留最小可用宽度；一侧变宽时可以压缩另一侧。

中间画布需要支持：

- 拖动画布平移。
- 滚轮缩放。
- 重置视图。
- 放大。
- 缩小。
- 拖动节点。
- 拖动连线端点。

---

## 四、节点内容固定要求

每个函数节点必须显示四项内容：

1. 作用类型：例如 `ROUTE`、`CONTROLLER`、`SERVICE`、`DB`、`HELPER`、`BUILDER`、`RETURN`。
2. 函数名或逻辑名。
3. 文件路径。
4. 一句解释。

节点内容不能重叠。推荐用 SVG `foreignObject` 内嵌 HTML 卡片，而不是用多个固定 `y` 坐标的 SVG text。长文本要截断，不要挤压到下一行。

节点数据建议按这种结构组织：

```js
const nodes = [
  {
    id: 'controller',
    x: 460,
    y: 270,
    w: 330,
    h: 142,
    kind: 'controller',
    file: 'controllers/example_controller.go',
    label: 'GetExampleList',
    sub: '读取 query 并返回 Success',
    src: 'src-controller'
  }
];
```

---

## 五、连线和曲线固定要求

连线必须是 SVG 曲线，不能是僵硬直线。

每条边至少拆成这些元素：

1. `path.edge-hit`：透明粗线，用于扩大点击区域。
2. `path.edge`：真实显示的曲线。
3. `path.mid-arrow`：放在曲线中间的箭头。
4. `circle.fromDot`：起点圆点。
5. `circle.toDot`：终点圆点。

不要使用 `marker-end` 做箭头。箭头必须在曲线中间，通过 `getTotalLength()` 和 `getPointAtLength()` 计算真实中点和切线方向。

端点必须绑定在节点矩形边缘上，使用 `{ side, t }` 表示：

```js
{ side: 'right', t: 0.5 }
```

端点拖动时，把鼠标位置投影到节点最近的矩形边，并更新 `{ side, t }`。

多条线连接同一个节点同一条边时，初始化时必须分散端点，不能全部堆在 `t=0.5`。

点击某条线时：

- 线条加粗。
- 线条变红。
- 两端圆点变红并变大。
- 当前线条、箭头和端点移动到对应图层最上方，避免多个端点重叠时无法选中。

曲线控制点要克制。不要为了绕开节点插入很远的中转点，也不要生成圆环、发卡弯、V 形大转弯。

推荐曲线策略：

```js
function edgeGeometry(edge) {
  const a = byId[edge.from], b = byId[edge.to];
  const p1 = portPoint(a, edge.fromPort);
  const p2 = portPoint(b, edge.toPort);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const direct = { x: dx * .32, y: dy * .32 };
  const normal = { x: -dy / distance, y: dx / distance };
  const blocked = nodes.some(n => n.id !== edge.from && n.id !== edge.to && intersects(p1.x, p1.y, p2.x, p2.y, n));
  const bend = blocked ? Math.max(-34, Math.min(34, dy * .12)) : 0;
  const t1 = tangentFor(edge.fromPort, p1, p2);
  const t2 = tangentFor(edge.toPort, p2, p1);
  const c1 = {
    x: p1.x + direct.x * .72 + t1.x * .28 + normal.x * bend,
    y: p1.y + direct.y * .72 + t1.y * .28 + normal.y * bend
  };
  const c2 = {
    x: p2.x - direct.x * .72 + t2.x * .28 + normal.x * bend,
    y: p2.y - direct.y * .72 + t2.y * .28 + normal.y * bend
  };
  return {
    d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`,
    p1,
    p2
  };
}
```

如果发现曲线从节点底部绕出来、大转弯、穿过节点、圆点重叠，必须继续调整，不能交付。

---

## 六、右侧函数详情固定要求

点击节点或源码中的函数链接后，右侧面板必须更新。

右侧面板必须包含：

1. 函数名。
2. 文件路径。
3. 前进/后退按钮。
4. 函数注释。
5. 函数作用。
6. 接收参数。
7. 源代码。

“函数注释”必须放在“函数作用”上方。

“函数注释”必须是可编辑输入框或 textarea。用户输入时要实时更新：

- 当前右侧编辑框内容。
- 当前节点卡片中的一句解释。
- 当前节点卡片的 `title`。

这个编辑状态可以先保存在页面内存中。如果用户明确要求持久化，再加 `localStorage` 或导出功能。

函数详情数据建议这样组织：

```js
const comments = Object.fromEntries(nodes.map(n => [n.id, n.sub]));

const functions = {
  controller: {
    name: 'GetExampleList',
    file: 'controllers/example_controller.go',
    effect: '读取分页参数，调用 service 查询列表，并统一返回给前端。',
    params: [
      ['c *gin.Context', 'Gin 请求上下文，提供 query、request context 和响应写入能力。']
    ],
    src: 'src-controller',
    calls: [
      { text: 'services.GetExampleList', node: 'service' }
    ]
  }
};
```

---

## 七、源码链接固定要求

右侧源码中必须直接在“字面量”上做超链接。

例如源码里出现：

```go
res, err := services.GetPromptOpsRoleList(ctx, page, pageSize, roleFilter, keyword)
```

那么 `services.GetPromptOpsRoleList` 这几个字本身必须变成可点击链接。点击后跳转到 `service` 节点，并更新右侧详情。

不要在右侧额外做“调用下游”列表。下游跳转只能出现在源码里的函数名字上。

结构体名也必须在源码里做链接，但结构体链接只更新左侧结构体面板，不更新右侧函数节点。

函数链接和结构体链接要区分：

- 函数链接：红色，点击更新右侧函数详情和节点选中态。
- 结构体链接：蓝色，点击更新左侧结构体详情。

替换源码链接时要按最长字面量优先，避免短名字抢先匹配长名字。不要生成嵌套 `<span>`。

推荐做法：建立 `callTargets` 映射。

```js
const callTargets = {
  controller: [
    { text: 'services.GetExampleList', node: 'service' }
  ],
  service: [
    { text: 'buildExampleSnapshot', node: 'snapshot' },
    { text: 'models.ExampleListVO', node: 'vo' }
  ]
};
```

---

## 八、左侧结构体详情固定要求

点击右侧源码中的结构体名时，左侧面板显示结构体详情。

左侧必须包含：

1. 结构体名称。
2. 结构体源码，原样展示。
3. 字段说明表。

字段说明表至少包含：

- 字段名
- 中文名
- 类型
- 解释
- 举例

字段解释必须基于代码语义、接口语义和已有注释整理，不要编造业务含义。看不出来的字段，可以写“代码中未体现明确业务含义”，不要瞎填。

结构体数据建议这样组织：

```js
const structs = {
  ExampleListVO: {
    title: 'ExampleListVO',
    codeId: 'struct-ExampleListVO',
    fields: [
      ['List', '列表数据', '[]ExampleItem', '当前页接口数据。', '[{id:1}]'],
      ['Total', '总数', 'int64', '筛选条件下的总行数。', '128']
    ]
  }
};
```

---

## 九、节点点击历史固定要求

右侧前进/后退不是浏览器历史，也不是调用链遍历。

它只记录用户点击过的函数节点：

- 点击节点，push 当前节点。
- 点击源码里的函数链接，push 目标节点。
- 点击后退，回到上一个点击过的节点。
- 点击前进，回到后退前的下一个节点。
- 点击结构体链接不进入函数节点历史。
- 编辑函数注释不进入函数节点历史。
- 拖动节点、拖动线条、缩放画布不进入函数节点历史。

---

## 十、代码采集和内容生成要求

生成页面前必须分析真实代码，不要凭接口名猜。

最少要采集：

1. 路由注册位置。
2. controller 函数。
3. service 主函数。
4. service 内直接调用的重要 helper/builder/loader/db 函数。
5. 查询涉及的核心 model。
6. 返回 VO。
7. 当前接口强相关的结构体。

节点不要无限扩展。原则是：

- 路由到返回结果的主链路必须完整。
- 直接影响接口响应字段的 helper 要画出来。
- 纯通用工具函数如果不影响理解，可以不画。
- 第三方库内部函数不要画。
- 数据库表或 GORM 查询可以用 `DB` 节点表达。

每个节点的“一句解释”必须基于代码作用写，不要写泛泛的“处理业务逻辑”。例如：

- 好：`分页查询角色并组装列表 VO`
- 差：`处理请求`

---

## 十一、输出文件要求

输出文件名建议：

`<接口名>-callgraph.html`

例如：

`promptops-role-list-callgraph.html`

输出位置：

`D:\LINJING-Aevil\api-html-skill\项目\<仓库名>\<接口名>-callgraph.html`

页面必须无外部依赖，不能依赖 CDN。所有 CSS、JS、数据、源码片段都写在一个 HTML 文件里。

源码片段建议放在：

```html
<script type="text/plain" id="src-controller">...</script>
```

这样可以避免代码内容和页面脚本互相干扰。

---

## 十二、验收标准

生成完成后必须验证：

1. 文件以 `<!doctype html>` 开头。
2. `<meta charset="utf-8">` 存在。
3. 本地浏览器 `file://` 打开中文不乱码。
4. 节点文字不重叠。
5. 点击节点后右侧详情更新。
6. 当前节点显示红色外包围框。
7. 点击源码里的下游函数名可以跳到下一个节点。
8. 后退/前进按钮按点击历史工作。
9. 函数注释可编辑，并实时同步节点卡片的一句解释。
10. 点击源码里的结构体名会更新左侧结构体面板。
11. 节点可以拖动，线条实时跟随。
12. 线条端点可以沿节点边缘拖动。
13. 选中线条会变红、加粗、端点置顶。
14. 多条线端点不会全部重叠在同一个点。
15. 曲线不会绕成圆环、发卡弯、V 形大转弯。
16. 左右侧栏可拖拽，且不会被固定最大宽度卡死。
17. 控制台没有 JavaScript 语法错误。

推荐验证命令：

```powershell
$file='D:\LINJING-Aevil\api-html-skill\项目\<仓库名>\<接口名>-callgraph.html'
$html=Get-Content -Encoding UTF8 -Raw -LiteralPath $file
$matches=[regex]::Matches($html,'<script>([\s\S]*?)</script>')
$script=$matches[$matches.Count-1].Groups[1].Value
$tmp='D:\LINJING-Aevil\_tmp\callgraph-main.js'
Set-Content -Encoding UTF8 -LiteralPath $tmp -Value $script
node --check $tmp
```

推荐浏览器截图验证：

```powershell
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$url='file:///D:/LINJING-Aevil/api-html-skill/项目/<仓库名>/<接口名>-callgraph.html'
$out='D:\LINJING-Aevil\_tmp\callgraph-preview.png'
& $chrome --headless=new --disable-gpu --window-size=1500,900 --screenshot=$out $url
```

---

## 十三、踩过的坑和禁止事项

以下问题出现过，后续生成时必须主动避免：

1. 不要生成不完整 HTML 片段。必须是完整 HTML 文档，否则中文容易乱码。
2. 不要用 SVG 固定 `text y` 坐标硬排多行文字，容易字符重叠。
3. 不要把调用下游和相关结构体做成右侧列表。跳转必须放在源码字面量上。
4. 不要把结构体链接和函数链接混成一种交互。函数跳右侧节点，结构体跳左侧面板。
5. 不要让后退/前进按钮按调用链移动。它们只服务用户点击历史。
6. 不要让左右侧栏有固定最大宽度。用户看源码时需要把右栏拉很宽。
7. 不要用 `marker-end` 做线尾箭头。箭头要在曲线中间。
8. 不要让所有端点都放在节点边缘中点。多条边必须分散端点。
9. 不要只把 path 置顶而忘记端点置顶。端点重叠时会点不到。
10. 不要为了避让节点加入远处中转点。远处中转点会制造大转弯和圆环。
11. 不要混入 `L` 直线段伪装曲线。用户要求曲线时，全路径应主要使用 `C` 贝塞尔。
12. 不要让线从节点底部绕出来连接顶部端点。端口方向要和控制点方向一致。
13. 不要把项目型 HTML 产物放回业务仓库目录。统一放 `api-html-skill\项目\<仓库名>`。
14. 不要编造字段解释、接口含义、文件路径。看不出来就写不明确。
15. 不要使用 CDN、外部字体、外部 JS 库。单文件必须离线可打开。

---

## 十四、最终输出前自检

在回复用户前，必须说明：

1. HTML 文件生成位置。
2. 参考了哪个示例文件。
3. 是否更新了经验积累。
4. 做过哪些验证。
5. 如果有未验证项，明确说没有验证，不要假装通过。

回复要简短，不要把整份 HTML 内容贴到聊天里。

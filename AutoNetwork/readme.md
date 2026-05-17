# AutoNetwork 项目全面解析报告

---

## 1. 项目判定

| 维度 | 详情 |
|------|------|
| **项目类型** | 纯前端单页 Web 应用 (SPA) |
| **开发语言** | HTML5 + CSS3 + JavaScript (ES5) |
| **核心依赖** | G6 v4.8 (AntV 图可视化引擎, CDN 引入, MIT 协议) |
| **运行环境** | 浏览器端 + 本地 HTTP 服务器 (`python -m http.server 8080`) |
| **无后端/无数据库** | 零服务端依赖, 数据存 `localStorage` + 内存 |
| **适用场景** | 网络工程师离线拓扑设计 → 一键生成多厂商交换机/路由器 CLI 配置命令 |
| **代码规模** | 20 个文件, 约 5100 行 |

---

## 2. 目录结构

```
d:/AutoNetwork/
├── index.html                  # 主页面: 三栏布局 + 全部模态框 HTML
├── base64.txt                  # 赞赏二维码 base64 图片源
├── readme.md                   # 本文件
├── css/
│   └── style.css               # 全局样式 (1227 行): 蓝调网管风、组件样式
└── js/
    ├── data.js                 # 数据层: 设备定义、厂商、端口、VLAN 规则、预设拓扑
    ├── g6-setup.js             # G6 引擎层: 8 种节点注册、连线、右键、端口弹窗、撤销
    ├── analyzer.js             # 拓扑分析引擎: 层级推导、VLAN 反推、网关推导
    ├── ui-controller.js        # UI 控制层: 表单双向绑定、所有弹窗逻辑、校验
    ├── app.js                  # 应用入口: 启动、工具栏绑定、快捷键
    ├── donate-qr.js            # 赞赏二维码 (XOR 混淆 + base64)
    └── templates/
        ├── registry.js                 # 模板注册中心 + 匹配引擎
        ├── huawei_router.js            # 华为路由器 VRP
        ├── huawei_switch.js            # 华为交换机 VRP (L2/L3)
        ├── h3c_router.js               # H3C 路由器 Comware
        ├── h3c_switch.js               # H3C 交换机 Comware
        ├── cisco_router.js             # 思科路由器 IOS
        ├── cisco_switch.js             # 思科交换机 IOS
        ├── ruijie_router.js           # 锐捷路由器 RGOS
        ├── ruijie_switch.js           # 锐捷交换机 RGOS
        ├── tplink_router.js           # TP-Link 路由器
        └── tplink_switch.js           # TP-Link 交换机
```

---

## 3. 全部已实现功能清单

### 3.1 画布交互 (G6 引擎)

| 功能 | 实现方式 |
|------|---------|
| 8 种设备节点渲染 | `G6.registerNode` 自定义 canvas 绘制, eNSP 机箱风格 |
| HTML5 拖入设备 | 左侧 SVG 缩略图 → `dragstart/drop` → `graph.addItem` |
| 节点自由拖拽 | `drag-node` 模式, `shouldBegin: true` |
| Shift+框选 | `brush-select`, Shift+拖拽矩形选取 |
| 双击连线模式 | `node:dblclick` → 橙色边框 → 点目标 → 端口弹窗 |
| 右键上下文菜单 | 连接/配置VLAN/生成命令/删除/属性 |
| 连线标签错位 | `fromPort % 3 * 7` Y 轴偏移, 避免重叠 |
| 撤销栈 | 每次事务 snap 入栈, Ctrl+Z 恢复, 最大 30 步 |
| 网格+缩略图 | G6 Grid + Minimap 插件 |
| 设计/只读模式 | `setMode` 切换 |
| 网线/光纤切换 | `_currentLinkType` 控制边颜色虚线/实线 |
| 双击/右键/Delete 删除连线 | `edge:dblclick` / `edge:contextmenu` / Delete 键 |

### 3.2 右侧参数面板

| 区段 | 字段 |
|------|------|
| 设备信息 | 名称(可编辑)、类型(只读)、厂商下拉、交换机层级(L2/L3) |
| 网络参数 | IP、网关、掩码、VLAN ID、端口数 |
| VLAN 配置 | L3: 批量编辑弹窗 / L2: 反推 VLAN 列表 + 手动追加 |
| 功能勾选 | DHCP/防私接/端口聚合/STP/远程管理/禁止互通 (仅 L3/路由显示) |
| 连线列表 | 当前设备所有端口连接, 支持高亮查看 |
| 命令操作 | 单设备生成 / 批量生成 → 终端弹窗 |

### 3.3 VLAN 批量编辑弹窗

| 功能 | L3 交换机 | L2 交换机 |
|------|----------|----------|
| 表格字段 | ID + 名称 + 描述 + IP + 掩码 | 仅 VLAN ID |
| 增删行 | ✅ | ✅ |
| VLAN 反推 | — | 从接入终端 + 上行 L3 自动收集 |
| 保存校验 | 范围 1-4094 / IP 单播 A/B/C 类 / 掩码合法性 | 范围 1-4094 |
| 存储 | `localStorage('vlan_' + nodeId)` | 同左 |

### 3.4 命令生成引擎

| 功能 | 实现 |
|------|------|
| 模板注册 | `CmdTpl.register(vendor, deviceClass, fn)` |
| 匹配逻辑 | 精确匹配 → 同类回退 → 通用兜底 |
| 单设备生成 | `generateForNode` → 分析器 → 模板 |
| 批量生成 | `generateAll` → `analyzeTopology` → 逐设备模板 |
| 输出方式 | 终端弹窗 (黑底绿字) + 一键复制按钮 |

### 3.5 厂商模板覆盖

| 厂商 | 路由器 | L3 交换机 | L2 交换机 |
|------|:---:|:---:|:---:|
| 华为 VRP | ✅ | VLANIF + 路由 + DHCP/NAT/ACL | VLAN + 管理 IP |
| H3C Comware | ✅ | 同上 | 同上 |
| 思科 IOS | ✅ | 同上 | 同上 |
| 锐捷 RGOS | ✅ | 同上 (+ `switchport trunk add` + `no shutdown`) | 同上 |
| TP-Link | ✅ | 同上 | 同上 |

### 3.6 设备属性弹窗

右键 → `📋 设备属性` → 模态框编辑全部字段 (名称/类型/层级/厂商/IP/网关/掩码/VLAN/端口)

### 3.7 预设拓扑

| 预设 | 设备数 | 连线数 |
|------|:---:|:---:|
| 中小型园区网络 | 14 | 13 |
| 监控网络 | 9 | 8 |
| 办公网络 | 10 | 9 |

### 3.8 工具栏

新建 / 打开 JSON / 保存 JSON / 常用案例 (下拉 3 套) / 设计模式切换 / 连线模式 / 删除 / 批量生成 / 关于本工具

### 3.9 导入导出

JSON 格式序列化全部节点+连线数据, 支持文件导入导出

---

## 4. 数据流向与核心实体

### 4.1 节点数据模型

```js
G6 Node Model = {
  id:     'node_5',          // G6 内部 ID
  type:   'core_switch',     // 设备类型 (路由到 G6.registerNode)
  label:  '核心交换机-1',     // 画布显示标签
  x, y:   ...,               // 画布坐标
  data: {
    type, name, vendor, ip, gateway, mask, vlan,
    switchLayer,             // 'l2' | 'l3'
    customVlans: [{id, name, desc, ip, mask}, ...],
    ports,
    feature_dhcp: true,      // 功能勾选 (feature_ 前缀)
    ...
  }
}
```

### 4.2 连线数据模型

```js
G6 Edge Model = {
  source: 'node_5',          // 源节点 ID
  target: 'node_8',          // 目标节点 ID
  label: 'G0/0/1 → G0/0/2', // 端口标签
  data: {
    fromPort: 1,             // 源端口号
    toPort: 2,               // 目标端口号
    linkType: 'copper'       // 'copper' | 'fiber'
  }
}
```

### 4.3 核心数据流

```
用户操作 → G6 事件 → ui-controller → 更新 model data
                                      ↓
                               localStorage 持久化 (VLAN)
                                      ↓
用户点击生成 → analyzeTopology (分析器)
                ├── step 1-2: 收集节点 + 分类连线 (uplink/downlink/endpoint)
                ├── step 3:   计算 vlansOnDevice
                ├── step 4:   标记核心交换机
                ├── step 5:   L2 VLAN 反推 (端点→上行→同级→下行→手动)
                ├── step 6:   收集 allTopologyVlans (全拓扑 VLAN)
                └── step 7:   推导 L2 网关 (uplink L3 IP)
                    ↓
              buildEnhancedConfig → cfg 对象
                    ↓
              CmdTpl.lookup(vendor, deviceClass) → 模板函数
                    ↓
              模板函数(cfg) → CLI 命令字符串
                    ↓
              showTerminalModal → 终端弹窗展示
```

### 4.4 存储机制

| 数据 | 存储位置 | 生命周期 |
|------|---------|---------|
| 拓扑节点/连线 | G6 内存模型 + JSON 导出 | 会话级 |
| VLAN 配置 | `localStorage('vlan_' + nodeId)` | 持久化 |
| 设备属性 | G6 `node.data` | 会话级 |
| 选中状态 | G6 `nodeStateStyles.selected` | 会话级 |
| 撤销快照 | `undoStack[]` 内存数组 | 会话级 (最大 30) |

---

## 5. 业务逻辑与使用场景

### 5.1 目标用户

- 网络工程师 / 系统集成商
- 需批量部署华为/H3C/思科/锐捷/TP-Link 交换机路由器
- 离线环境或无网管系统的小型项目

### 5.2 核心业务流程

```
1. 拖入设备 → 构建拓扑
2. 连线 → 分配端口
3. 选厂商 + 配 IP/VLAN
4. L3 交换机 → 批量编辑 VLAN (VLANIF 网关 IP)
5. 勾选功能 (DHCP/STP/聚合...)
6. 生成命令 → 复制到终端执行
```

### 5.3 设备层级逻辑

```
路由器 (level 0)
  └── 核心交换机 (level 1, L3)
       └── 汇聚交换机 (level 2, L3)
            └── 接入交换机 (level 3, L2)
                 └── PC/摄像头/服务器/NVR (level 4, 终端)
```

---

## 6. 代码问题分析

### 6.1 已知冗余/遗留

| 问题 | 位置 | 严重度 |
|------|------|:---:|
| `buildPaletteData()` 函数已不再使用 (改用分类面板) | data.js | 低 |
| `_diagramForUI` 变量已废弃但未清理 | g6-setup.js | 低 |
| 5 个模板中 `_findCustomIp` / `_isValidUnicastIP` 函数重复定义 | templates/*.js | 中 |
| `window.__savedCustomVlans` 与 `localStorage` 双重存储冗余 | ui-controller.js | 中 |
| 华为模板的 `hasCustom` 路径与 `_findCustomIp` 回退路径存在逻辑重叠 | huawei_switch.js | 中 |

### 6.2 逻辑漏洞

| 问题 | 影响 |
|------|------|
| `_getNodeVlanList` 合并 `customVlans` + `vlansOnDevice` 时未对字符串数字 vs 数字类型统一处理 | VLAN ID 类型不一致可能导致去重失败 |
| `allTopologyVlans` 在步骤 6 收集, 但 L2 推导 (步骤 5) 可能部分 VLAN 还未汇入 | 首个 L2 交换机偶尔遗漏 VLAN |
| `generateForNode` 回退路径 `buildDeviceConfig` 不含分析器字段 (`derivedVlans` 等) | 单设备生成可能缺失上下文 |
| `saveVlans` 用 `window.__currentVlanNodeId` 存储但未在 `closeVlanModal` 时清理 | 跨设备误写风险 |

### 6.3 设计不合理

| 问题 | 建议 |
|------|------|
| `g6-setup.js` 908 行过大, 涵盖节点注册+交互+弹窗+API | 拆分为 `nodes.js` + `edges.js` + `interactions.js` |
| `ui-controller.js` 779 行, 混合表单+弹窗+校验+工具栏 | 拆分为 `panel.js` + `modals.js` + `validators.js` |
| 5 个模板中重复的工具函数应提取到公共文件 | 新建 `js/templates/common.js` |
| G6 `draw` 函数中硬编码尺寸 (`w=88, h=54` 等), 修改需逐个调整 | 统一到 `data.js` 的 `DeviceTypeDefs` |
| `_addNodeLabels` 在部分节点中使用 `nameY` 参数, 部分用默认值, 不一致 | 统一使用默认值或明确标注 |
| 模板中仍有部分使用 `\n` 拼接命令而非逐行 `out.push` | 继续统一为 push 模式 |

---

## 7. 迭代方向与重构建议

### 7.1 短期优化 (低风险)

- [ ] 提取公共模板函数到 `js/templates/common.js`
- [ ] `saveVlans` 增加防抖 + 批量保存提示
- [ ] 添加导出为 `.cfg` / `.txt` 文件格式
- [ ] 连线端口标签支持手动编辑
- [ ] 设备搜索/过滤功能

### 7.2 中期迭代

- [ ] 接入 DeepSeek/LLM API 自动填充模板命令
- [ ] 拓扑合法性校验 (环路检测、VLAN 冲突检测)
- [ ] 多人协作 (WebSocket 同步拓扑)
- [ ] 设备库扩展 (防火墙、无线 AP、AC 控制器)
- [ ] 命令 Diff 对比 (修改前后差异可视化)

### 7.3 架构重构

- [ ] **模块化**: ES6 Module 拆分, 当前全全局变量依赖
- [ ] **状态管理**: 引入简单的 Pub/Sub 或 Redux-like store, 替代全局 `window.__xxx`
- [ ] **模板引擎**: 模板文件改为 JSON Schema 驱动, 降低代码量
- [ ] **测试覆盖**: 单元测试 (analyzer 纯函数友好) + E2E (Playwright)

---

## 8. 项目功能说明书

### 网络拓扑配置工具 v1.0

**定位**: 离线网络拓扑设计与多厂商 CLI 命令一键生成工具

**技术栈**: HTML5 + CSS3 + JavaScript + AntV G6

**核心能力**:

1. 可视化拖拽构建网络拓扑 (路由器/交换机/PC/摄像头/NVR/服务器, 8 种设备)
2. eNSP 风格机箱图标 + 端口级连线 + 网线/光纤切换
3. 三层/二层交换机自动识别, VLANIF 网关 IP 批量配置
4. 支持华为/H3C/思科/锐捷/TP-Link 五厂商命令生成
5. L2 接入交换机 VLAN 从终端自动反推
6. DHCP/STP/端口聚合/ACL/防私接等功能一键勾选
7. 拓扑 JSON 导入导出、预设案例快速加载
8. 完全离线运行, 无后端依赖

**使用方式**: 浏览器访问 `http://127.0.0.1:8080`, 拖设备 → 连线 → 配参数 → 生成命令 → 复制到交换机执行

---

*报告生成时间: 2026-05-17*

/* ============================================================
   g6-setup.js — G6 图引擎 + 8 种设备节点 + 右键菜单 +
   端口选择弹窗 / 连线模式 / 删除 / 撤销栈
   ============================================================ */

/* ============================================================
   设备节点注册 — eNSP 风格机箱外观
   ============================================================ */

/** 为节点添加统一的厂商/VLAN/名称标签 */
function _addNodeLabels(group, cfg, w, h, nameY) {
  var d = cfg.data || {};
  // 厂商标签 (图标上方, 红色小字)
  if (d.vendor && d.vendor !== 'endpoint') {
    var vl = d.vendor;
    for (var vi = 0; vi < VendorList.length; vi++) { if (VendorList[vi].slug === d.vendor) { vl = VendorList[vi].label.replace(/\(.*\)/, '').trim(); break; } }
    group.addShape('text', { attrs: { x: w/2, y: -4, text: '[' + vl + ']', fill: '#DC2626', fontSize: 10, fontWeight: 'bold', fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif', textAlign: 'center', textBaseline: 'bottom' }, name: 'vendor-text' });
  }
  // 设备名称 (图标下方)
  group.addShape('text', { attrs: { x: w/2, y: nameY || h + 6, text: cfg.label || '', fill: '#1E293B', fontSize: 11, fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif', textAlign: 'center', textBaseline: 'top' }, name: 'label-text' });
  // VLAN 信息 (名称下方, 灰色小字)
  if (d.vlan) {
    group.addShape('text', { attrs: { x: w/2, y: (nameY || h + 6) + 13, text: 'VLAN:' + d.vlan, fill: '#64748B', fontSize: 9, fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif', textAlign: 'center', textBaseline: 'top' }, name: 'vlan-text' });
  }
}

// --- 路由器 (1U 机箱: 深蓝面板 + 接口槽位 + LED) ---
G6.registerNode('router', {
  draw: function(cfg, group) {
    var w = 88, h = 54, r = 4;
    // 机箱本体
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: r, fill: '#1B3A5C', stroke: '#0D2137', lineWidth: 2, cursor: 'move' }, name: 'body' });
    // 前面板
    group.addShape('rect', { attrs: { x: 6, y: 6, width: w - 12, height: 22, radius: 2, fill: '#244566', stroke: '#1A334D', lineWidth: 1 }, name: 'panel' });
    // 接口槽位 (3 个)
    for (var i = 0; i < 3; i++) {
      group.addShape('rect', { attrs: { x: 12 + i * 24, y: 10, width: 16, height: 14, radius: 1, fill: '#0F1F30', stroke: '#2D5A8A', lineWidth: 1 }, name: 'slot' + i });
      group.addShape('rect', { attrs: { x: 14 + i * 24, y: 13, width: 12, height: 2, fill: '#4A90D9', stroke: null }, name: 'slot-pin' + i });
    }
    // LED 指示灯
    group.addShape('circle', { attrs: { x: w - 14, y: 8,  r: 2.5, fill: '#10B981', stroke: null }, name: 'led-sys' });
    group.addShape('circle', { attrs: { x: w - 14, y: 16, r: 2.5, fill: '#F59E0B', stroke: null }, name: 'led-act' });
    // 底部端口条
    group.addShape('rect', { attrs: { x: 6, y: 32, width: w - 12, height: 3, fill: '#2D5A8A', stroke: null }, name: 'port-bar' });
    for (var j = 0; j < 4; j++) {
      group.addShape('rect', { attrs: { x: 10 + j * 19, y: 37, width: 14, height: 3, radius: 1, fill: '#4A90D9', stroke: null }, name: 'p' + j });
    }
    // 标签
    _addNodeLabels(group, cfg, 88, 54);
    return key;
  },
  getAnchorPoints: function() { return [[0.3,0],[0.5,0],[0.7,0],[0.3,1],[0.5,1],[0.7,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- 核心交换机 (宽机箱: 双排端口网格 + LED 状态) ---
G6.registerNode('core_switch', {
  draw: function(cfg, group) {
    var w = 112, h = 64, r = 4;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: r, fill: '#1E3A5F', stroke: '#0F172A', lineWidth: 2, cursor: 'move' }, name: 'body' });
    // 前面板
    group.addShape('rect', { attrs: { x: 5, y: 5, width: w - 10, height: h - 10, radius: 2, fill: '#253D5E', stroke: '#1A3048', lineWidth: 1 }, name: 'panel' });
    // 端口网格 (2 行 × 12 列)
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 12; col++) {
        group.addShape('rect', { attrs: { x: 8 + col * 8.5, y: 8 + row * 13, width: 6, height: 9, radius: 1, fill: '#0F1F30', stroke: '#2D5A8A', lineWidth: 0.5 }, name: 'port-' + row + '-' + col });
      }
    }
    // LED 指示
    group.addShape('text', { attrs: { x: 10, y: h - 9, text: 'SYS', fill: '#60A5FA', fontSize: 7, fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif', textAlign: 'left', textBaseline: 'middle' }, name: 'led-label' });
    group.addShape('circle', { attrs: { x: 33, y: h - 9, r: 2.5, fill: '#10B981', stroke: null }, name: 'led1' });
    group.addShape('circle', { attrs: { x: 42, y: h - 9, r: 2.5, fill: '#F59E0B', stroke: null }, name: 'led2' });
    group.addShape('text', { attrs: { x: 52, y: h - 9, text: '1-24', fill: '#94A3B8', fontSize: 7, fontFamily: 'sans-serif', textAlign: 'left', textBaseline: 'middle' }, name: 'p1' });
    group.addShape('text', { attrs: { x: w - 36, y: h - 9, text: '25-48', fill: '#94A3B8', fontSize: 7, fontFamily: 'sans-serif', textAlign: 'left', textBaseline: 'middle' }, name: 'p2' });
    // 标签
    _addNodeLabels(group, cfg, 112, 64);
    return key;
  },
  getAnchorPoints: function() { return [[0.25,0],[0.5,0],[0.75,0],[0.25,1],[0.5,1],[0.75,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- 汇聚交换机 (中机箱: 单排端口 + LED) ---
G6.registerNode('agg_switch', {
  draw: function(cfg, group) {
    var w = 96, h = 52, r = 4;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: r, fill: '#1E4785', stroke: '#15315E', lineWidth: 2, cursor: 'move' }, name: 'body' });
    // 前面板
    group.addShape('rect', { attrs: { x: 5, y: 5, width: w - 10, height: h - 20, radius: 2, fill: '#2559A0', stroke: '#1B4278', lineWidth: 1 }, name: 'panel' });
    // 端口 (1 行 × 12 列)
    for (var col = 0; col < 12; col++) {
      group.addShape('rect', { attrs: { x: 8 + col * 7.5, y: 8, width: 5.5, height: 16, radius: 1, fill: '#0D1F38', stroke: '#3B82F6', lineWidth: 0.5 }, name: 'port-' + col });
    }
    // LED
    group.addShape('circle', { attrs: { x: 10, y: h - 6, r: 2.5, fill: '#10B981', stroke: null }, name: 'led1' });
    group.addShape('circle', { attrs: { x: 20, y: h - 6, r: 2.5, fill: '#F59E0B', stroke: null }, name: 'led2' });
    group.addShape('text', { attrs: { x: 34, y: h - 7, text: '1-24', fill: '#94A3B8', fontSize: 7, fontFamily: 'sans-serif', textAlign: 'left', textBaseline: 'middle' }, name: 'port-label' });
    // 标签
    _addNodeLabels(group, cfg, 96, 52);
    return key;
  },
  getAnchorPoints: function() { return [[0.25,0],[0.5,0],[0.75,0],[0.25,1],[0.5,1],[0.75,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- 接入交换机 (小机箱: 紧凑端口 + LED) ---
G6.registerNode('acc_switch', {
  draw: function(cfg, group) {
    var w = 80, h = 46, r = 3;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: r, fill: '#2563EB', stroke: '#1E40AF', lineWidth: 2, cursor: 'move' }, name: 'body' });
    // 前面板
    group.addShape('rect', { attrs: { x: 4, y: 4, width: w - 8, height: h - 18, radius: 2, fill: '#3B82F6', stroke: '#2563EB', lineWidth: 1 }, name: 'panel' });
    // 端口 (1 行 × 8)
    for (var col = 0; col < 8; col++) {
      group.addShape('rect', { attrs: { x: 7 + col * 9, y: 7, width: 6, height: 14, radius: 1, fill: '#0D1F38', stroke: '#60A5FA', lineWidth: 0.5 }, name: 'port-' + col });
    }
    // LED
    group.addShape('circle', { attrs: { x: w - 14, y: h - 8, r: 2.5, fill: '#10B981', stroke: null }, name: 'led1' });
    group.addShape('circle', { attrs: { x: w - 7,  y: h - 8, r: 2.5, fill: '#F59E0B', stroke: null }, name: 'led2' });
    // 标签
    _addNodeLabels(group, cfg, 80, 46);
    return key;
  },
  getAnchorPoints: function() { return [[0.3,0],[0.5,0],[0.7,0],[0.3,1],[0.5,1],[0.7,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- PC ---
G6.registerNode('pc', {
  draw: function(cfg, group) {
    var w = 48, h = 32;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: 3, fill: '#10B981', stroke: '#059669', lineWidth: 2, cursor: 'move' }, name: 'body' });
    group.addShape('rect', { attrs: { x: 6, y: 5, width: w - 12, height: h - 10, radius: 1, fill: '#D1FAE5', stroke: null }, name: 'screen' });
    group.addShape('polygon', { attrs: { points: [[w/2-10,h],[w/2+10,h],[w/2+6,h+10],[w/2-6,h+10]], fill: '#6B7280', stroke: '#4B5563', lineWidth: 1 }, name: 'stand' });
    _addNodeLabels(group, cfg, w, h, h + 14);
    return key;
  },
  getAnchorPoints: function() { return [[0.5,0],[0.5,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- 服务器 ---
G6.registerNode('server', {
  draw: function(cfg, group) {
    var w = 60, h = 52;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: 3, fill: '#334155', stroke: '#0F172A', lineWidth: 2, cursor: 'move' }, name: 'body' });
    group.addShape('rect', { attrs: { x: 4, y: 8, width: w - 8, height: h - 16, radius: 2, fill: '#475569', stroke: null }, name: 'panel' });
    group.addShape('circle', { attrs: { x: w - 14, y: 14, r: 3, fill: '#10B981', stroke: null }, name: 'led1' });
    group.addShape('circle', { attrs: { x: w - 14, y: 24, r: 3, fill: '#10B981', stroke: null }, name: 'led2' });
    group.addShape('circle', { attrs: { x: w - 8,  y: 14, r: 3, fill: '#60A5FA', stroke: null }, name: 'led3' });
    _addNodeLabels(group, cfg, w, h);
    return key;
  },
  getAnchorPoints: function() { return [[0.5,0],[0.5,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- 摄像头 ---
G6.registerNode('camera', {
  draw: function(cfg, group) {
    var w = 44, h = 30;
    var key = group.addShape('rect', { attrs: { x: 0, y: 6, width: w, height: h - 6, radius: [0,0,4,4], fill: '#F59E0B', stroke: '#D97706', lineWidth: 2, cursor: 'move' }, name: 'body' });
    group.addShape('ellipse', { attrs: { x: w/2, y: 6, rx: w/2, ry: 8, fill: '#FBBF24', stroke: '#D97706', lineWidth: 1 }, name: 'dome' });
    group.addShape('circle',  { attrs: { x: w/2, y: 18, r: 4, fill: '#1E293B', stroke: null }, name: 'lens' });
    group.addShape('rect',    { attrs: { x: w/2-12, y: h-4, width: 24, height: 4, radius: 1, fill: '#6B7280', stroke: '#4B5563', lineWidth: 1 }, name: 'bracket' });
    _addNodeLabels(group, cfg, w, h);
    return key;
  },
  getAnchorPoints: function() { return [[0.5,0],[0.5,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

// --- NVR ---
G6.registerNode('nvr', {
  draw: function(cfg, group) {
    var w = 70, h = 48;
    var key = group.addShape('rect', { attrs: { x: 0, y: 0, width: w, height: h, radius: 4, fill: '#475569', stroke: '#1E293B', lineWidth: 2, cursor: 'move' }, name: 'body' });
    group.addShape('circle', { attrs: { x: w - 12, y: 10, r: 5, fill: '#EF4444', stroke: '#DC2626', lineWidth: 1 }, name: 'rec' });
    group.addShape('text',   { attrs: { x: w/2, y: h/2, text: 'NVR', fill: '#F1F5F9', fontSize: 12, fontWeight: 'bold', fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif', textAlign:'center', textBaseline:'middle' }, name: 'nvr' });
    _addNodeLabels(group, cfg, w, h);
    return key;
  },
  getAnchorPoints: function() { return [[0.5,0],[0.5,1],[0,0.5],[1,0.5]]; },
}, 'single-shape');

/* ============================================================
   连线注册 — 根据 _currentLinkType 切换铜缆/光纤样式
   ============================================================ */
G6.registerEdge('topo-edge', {
  draw: function(cfg, group) {
    var s = cfg.startPoint, e = cfg.endPoint;
    var lt = (cfg.data && cfg.data.linkType) || _currentLinkType || 'copper';
    var style = (lt === 'fiber')
      ? { stroke: '#F59E0B', lineWidth: 2.5, lineDash: [6, 3], endArrow: { path: G6.Arrow.triangle(8, 10, 0), fill: '#F59E0B' } }
      : { stroke: '#64748B', lineWidth: 2,    lineDash: null,    endArrow: { path: G6.Arrow.triangle(8, 10, 0), fill: '#64748B' } };
    var attrs = { path: [['M', s.x, s.y], ['L', e.x, e.y]], cursor: 'move' };
    Object.keys(style).forEach(function(k) { attrs[k] = style[k]; });
    var key = group.addShape('path', { attrs: attrs, name: 'edge-path' });
    return key;
  },
  afterDraw: function(cfg, group) {
    var label = cfg.label || '';
    if (label) {
      // 根据端口号计算错位偏移, 避免同向多条连线标签重叠
      var fromPort = (cfg.data && cfg.data.fromPort) || 0;
      var offsetY = -6 + (fromPort % 3) * 7;
      var mid = { x: (cfg.startPoint.x + cfg.endPoint.x) / 2, y: (cfg.startPoint.y + cfg.endPoint.y) / 2 + offsetY };
      group.addShape('text', { attrs: { x: mid.x, y: mid.y, text: label, fill: '#0369A1', fontSize: 9, fontFamily: 'Cascadia Code,Consolas,monospace', textAlign: 'center', textBaseline: 'middle', background: { fill: '#EFF6FF', padding: [1,3], radius: 2 } }, name: 'port-label' });
    }
  },
}, 'line');

/* ============================================================
   全局状态
   ============================================================ */
let graph = null;
let undoStack = [];
var MAX_UNDO = 30;
var _connecting = null;      // { nodeId, nodeItem } — 连线模式下已选源节点
var _ctxTarget = null;       // 右键菜单触发节点

/* ============================================================
   G6 Graph 实例
   ============================================================ */
function createGraph(divId) {
  var container = document.getElementById(divId);
  if (!container) return null;
  var width = container.offsetWidth || 1200;
  var height = container.offsetHeight || 800;

  var grid = new G6.Grid();
  var minimap = new G6.Minimap({ size: [160, 120], className: 'g6-minimap' });

  var g = new G6.Graph({
    container: divId, width: width, height: height,
    fitView: true, fitViewPadding: 40, animate: true,
    modes: { default: [
      { type: 'drag-node', shouldBegin: function() { return true; }, shouldUpdate: function() { return true; } },
      'click-select',
      { type: 'brush-select', trigger: 'shift' },
      'drag-canvas',
      'zoom-canvas',
    ] },
    plugins: [grid, minimap],
    defaultNode: {
      type: 'router', size: [56, 56],
      labelCfg: { style: { fill: '#1E293B', fontSize: 12, fontFamily: 'Segoe UI,PingFang SC,Microsoft YaHei,sans-serif' } },
      anchorPoints: [[0.5,0],[0.5,1],[0,0.5],[1,0.5]],
    },
    defaultEdge: { type: 'topo-edge' },
    nodeStateStyles: {
      selected:    { lineWidth: 3, stroke: '#3B82F6', shadowColor: '#93C5FD', shadowBlur: 8 },
      hover:       { lineWidth: 2.5, stroke: '#60A5FA' },
      connecting:  { lineWidth: 3, stroke: '#F59E0B', shadowColor: '#FDE68A', shadowBlur: 10 },
    },
    edgeStateStyles: {
      selected:   { stroke: '#3B82F6', lineWidth: 3 },
      highlight:  { stroke: '#F59E0B', lineWidth: 3 },
    },
  });

  // --- 事件 ---
  g.on('node:click',      function(evt) { _onNodeClick(evt.item, evt); });
  g.on('node:dblclick',   function(evt) { evt.preventDefault(); if (_connecting && _connecting.nodeItem === evt.item) { _exitConnectingMode(); } else { _enterConnectingMode(evt.item); } });
  g.on('canvas:click',    function()     { _exitConnectingMode(); _clearAllSelection(); onNodeClick(null); });
  g.on('node:contextmenu',function(evt) { _showCtxMenu(evt); });
  g.on('canvas:contextmenu', function(evt) { evt.preventDefault(); _hideCtxMenu(); });
  g.on('edge:click',      function(evt) { _onEdgeClick(evt.item); });
  g.on('edge:dblclick',   function(evt) { evt.preventDefault(); if (evt.item) graph.removeItem(evt.item); });
  g.on('edge:contextmenu',function(evt) { evt.preventDefault(); if (evt.item) { graph.setItemState(evt.item, 'selected', true); if (confirm('删除此连线？')) graph.removeItem(evt.item); } });
  g.on('afteradditem',    function()     { afterChange(g); });
  g.on('afterremoveitem', function()     { afterChange(g); });
  g.on('afterupdateitem', function()     { afterChange(g); });

  window.addEventListener('resize', function() {
    if (!g || g.destroyed) return;
    var c = document.getElementById(divId);
    if (c) g.changeSize(c.offsetWidth, c.offsetHeight);
  });

  return g;
}

/* ============================================================
   节点点击 — 连线模式 vs 普通选择
   ============================================================ */
function _onNodeClick(nodeItem, evt) {
  if (!nodeItem) return;

  // 连线模式: 已有源节点, 点击目标节点 → 弹出端口选择
  if (_connecting && _connecting.nodeItem !== nodeItem) {
    var srcId = _connecting.nodeId, tgtId = nodeItem.getModel().id;
    var srcNode = _connecting.nodeItem;
    _showPortModal(srcNode, nodeItem);
    _exitConnectingMode();
    return;
  }

  // 普通选择
  if (graph) {
    graph.getNodes().forEach(function(n) { graph.setItemState(n, 'selected', false); });
    graph.setItemState(nodeItem, 'selected', true);
  }
  onNodeClick(nodeItem);
}

function _clearAllSelection() {
  if (!graph) return;
  graph.getNodes().forEach(function(n) { graph.setItemState(n, 'selected', false); });
  graph.getEdges().forEach(function(e) { graph.setItemState(e, 'selected', false); });
}

function _onEdgeClick(edgeItem) {
  if (!graph) return;
  graph.getEdges().forEach(function(e) { graph.setItemState(e, 'selected', false); });
  graph.setItemState(edgeItem, 'selected', true);
}

/* ============================================================
   右键菜单
   ============================================================ */
function _showCtxMenu(evt) {
  evt.preventDefault();
  var nodeItem = evt.item;
  if (!nodeItem) return;
  _ctxTarget = nodeItem;

  // 选中该节点
  if (graph) {
    graph.getNodes().forEach(function(n) { graph.setItemState(n, 'selected', false); });
    graph.setItemState(nodeItem, 'selected', true);
    onNodeClick(nodeItem);
  }

  var menu = document.getElementById('ctx-menu');
  if (!menu) return;

  // 动态显隐菜单项
  var m = nodeItem.getModel();
  var d = m.data || {};
  var isSw = (d.type === 'core_switch' || d.type === 'agg_switch' || d.type === 'acc_switch');
  var isEndpoint = (d.type === 'pc' || d.type === 'server' || d.type === 'camera' || d.type === 'nvr');
  var isL3 = isSw && (d.switchLayer || DefaultSwitchLayer[d.type]) === 'l3';

  // L3 交换机显示"配置 VLAN"
  var vlanItem = document.getElementById('ctx-vlan');
  if (vlanItem) vlanItem.style.display = isL3 ? '' : 'none';

  // 终端设备隐藏"生成命令"
  var genItem = document.getElementById('ctx-generate');
  if (genItem) genItem.style.display = isEndpoint ? 'none' : '';

  menu.style.display = 'block';
  menu.style.left = evt.clientX + 'px';
  menu.style.top  = evt.clientY + 'px';

  // 确保菜单不超出窗口
  var rect = menu.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  menu.style.left = (evt.clientX - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top  = (evt.clientY - rect.height) + 'px';
}

function _hideCtxMenu() {
  var menu = document.getElementById('ctx-menu');
  if (menu) menu.style.display = 'none';
  _ctxTarget = null;
}

/** 右键菜单操作 */
function ctxMenuAction(action) {
  // 先存引用再关菜单 (hideCtxMenu 会清 _ctxTarget)
  var target = _ctxTarget;
  _hideCtxMenu();
  if (!graph) return;

  switch (action) {
    case 'delete':
      if (target) {
        _deleteSingleNode(target);
      } else {
        deleteSelectedNodes();
      }
      onNodeClick(null);
      break;
    case 'connect':
      if (target) _enterConnectingMode(target);
      break;
    case 'vlan':
      // 菜单项仅在 L3 交换机时显示, 直接打开 VLAN 模态框
      if (typeof openVlanModal === 'function') openVlanModal();
      break;
    case 'generate':
      if (target) generateForNode(target);
      break;
    case 'properties':
      if (typeof openPropsModal === 'function') openPropsModal();
      break;
  }
}

/** 删除单个节点及其连线 */
function _deleteSingleNode(nodeItem) {
  if (!graph || !nodeItem) return;
  var nodeId = nodeItem.getModel().id;
  // 先删连线
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (ed.source === nodeId || ed.target === nodeId) graph.removeItem(e);
  });
  graph.removeItem(nodeItem);
}

/** 删除所有选中节点及其连线 (批量框选后使用) */
function deleteSelectedNodes() {
  if (!graph) return;
  var selNodes = graph.findAllByState('node', 'selected');
  if (selNodes.length === 0) return;

  var removeIds = {};
  selNodes.forEach(function(n) { removeIds[n.getModel().id] = true; });

  // 先删除所有关联连线
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (removeIds[ed.source] || removeIds[ed.target]) graph.removeItem(e);
  });

  // 再删除节点
  selNodes.forEach(function(n) { graph.removeItem(n); });
}

/** 快捷生成命令 — 通过拓扑分析器获取增强配置后调用模板 */
function generateForNode(nodeItem) {
  if (!nodeItem) { alert('请先选中一台设备。'); return; }
  var m = nodeItem.getModel();
  var data = m.data || {};
  if (!data.vendor) { alert('请先在右侧面板中为该设备选择厂商。'); return; }
  // 终端/监控设备无需命令
  if (data.vendor === 'endpoint' || isEndpointDevice(data.type)) {
    var ta = document.getElementById('cmd-output');
    if (ta) { ta.value = '# [跳过] ' + (data.name || m.label || '终端设备') + ' — 终端/监控设备无需生成 CLI 命令。\n'; }
    return;
  }

  var dClass = DeviceClassMap[data.type] || 'endpoint';

  // 使用拓扑分析器获取增强配置 (含 uplink/downlink/endpoint 分类)
  var analysis = analyzeTopology(graph);
  var devAnalysis = null;
  for (var i = 0; i < analysis.devices.length; i++) {
    if (analysis.devices[i].id === m.id) { devAnalysis = analysis.devices[i]; break; }
  }
  var cfg = devAnalysis ? buildEnhancedConfig(devAnalysis) : buildDeviceConfig(data, _getNodeConns(m.id));
  if (!cfg.name) cfg.name = m.label || '';

  // 强制注入 customVlans: localStorage (用 m.id) > 模型数据
  var nodeKey = m.id;
  var savedVlans = null;
  try { if (nodeKey) { var raw = localStorage.getItem('vlan_' + nodeKey); if (raw) savedVlans = JSON.parse(raw); } } catch(e) {}
  if (!savedVlans || savedVlans.length === 0) savedVlans = data.customVlans;
  if (!savedVlans || savedVlans.length === 0) savedVlans = window.__savedCustomVlans;
  if (savedVlans && savedVlans.length > 0) cfg.customVlans = savedVlans;
  if (data.switchLayer) cfg.switchLayer = data.switchLayer;

  // 生成前校验 customVlans
  var cv = cfg.customVlans || [];
  for (var j = 0; j < cv.length; j++) {
    var entry = cv[j];
    var vid = parseInt(entry.id, 10);
    if (isNaN(vid) || vid < 1 || vid > 4094) { alert('VLAN ID 不合法: ' + entry.id + ' (须 1-4094), 请重新编辑 VLAN 配置。'); return; }
    if (entry.ip && typeof _isValidUnicastIP === 'function' && !_isValidUnicastIP(entry.ip)) { alert('IP 地址不合法: ' + entry.ip + ' (VLAN ' + entry.id + '), 单播 A/B/C 类 1.0.0.0~223.255.255.255。'); return; }
  }

  var header = '! ===== ' + (cfg.name || m.id) + ' =====\n' +
    '! 类型: ' + (DeviceTypeDefs[cfg.type] ? DeviceTypeDefs[cfg.type].label : cfg.type) +
    ' | 厂商: ' + cfg.vendor +
    ' | IP: ' + (cfg.ip || '未填') +
    ' | VLAN: ' + (cfg.vlan || '未填') + '\n';
  if (cfg.uplinks && cfg.uplinks.length > 0)
    header += '! 上行 Trunk: ' + cfg.uplinks.length + ' 条\n';
  if (cfg.downlinks && cfg.downlinks.length > 0)
    header += '! 下行 Trunk: ' + cfg.downlinks.length + ' 条\n';
  if (cfg.endpoints && cfg.endpoints.length > 0)
    header += '! 接入终端: ' + cfg.endpoints.length + ' 台\n';
  header += '\n';

  var result = header + CmdTpl.generate(cfg.vendor, dClass, cfg);
  if (typeof showTerminalModal === 'function') { showTerminalModal(result); }
  else { var ta = document.getElementById('cmd-output'); if (ta) { ta.value = result; } }
}

/** 获取指定节点的连线信息 */
function _getNodeConns(nodeId) {
  if (!graph) return [];
  var result = [];
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (ed.source === nodeId || ed.target === nodeId) {
      var otherId = ed.source === nodeId ? ed.target : ed.source;
      var otherNode = graph.findById(otherId);
      var otherModel = otherNode ? otherNode.getModel() : {};
      var otherData = otherModel.data || {};
      result.push({
        localPort: ed.source === nodeId ? (ed.data ? ed.data.fromPort : null) : (ed.data ? ed.data.toPort : null),
        peerName:  otherModel.label || otherData.name || '?',
        peerType:  otherData.type || otherModel.type || '?',
        peerPort:  ed.source === nodeId ? (ed.data ? ed.data.toPort : null) : (ed.data ? ed.data.fromPort : null),
        peerVlan:  otherData.vlan || '',
      });
    }
  });
  return result;
}

/* ============================================================
   连线模式
   ============================================================ */
function _enterConnectingMode(nodeItem) {
  if (!graph) return;
  _connecting = { nodeId: nodeItem.getModel().id, nodeItem: nodeItem };
  graph.setItemState(nodeItem, 'connecting', true);
  // 更新状态栏提示
  var el = document.getElementById('stat-hint');
  if (el) el.textContent = '连线模式: 已选源设备 [' + (nodeItem.getModel().label || '?') + ']，请点击目标设备';
}

function _exitConnectingMode() {
  if (_connecting && graph) {
    graph.setItemState(_connecting.nodeItem, 'connecting', false);
  }
  _connecting = null;
  var el = document.getElementById('stat-hint');
  if (el) el.textContent = '';
}

/** 工具栏 "连线模式" 按钮 — 先选中设备再点击 */
function toggleConnectMode() {
  if (_connecting) { _exitConnectingMode(); return; }
  if (!graph) return;
  var sel = graph.findAllByState('node', 'selected');
  if (sel.length === 0) { alert('请先在画布中选中一台设备作为连线起点。'); return; }
  _enterConnectingMode(sel[0]);
}

/* ============================================================
   端口选择弹窗
   ============================================================ */
function _showPortModal(srcItem, tgtItem) {
  var srcModel = srcItem.getModel();
  var tgtModel = tgtItem.getModel();
  var srcType = (srcModel.data && srcModel.data.type) || srcModel.type;
  var tgtType = (tgtModel.data && tgtModel.data.type) || tgtModel.type;
  var srcPorts = getPortOptions(srcType);
  var tgtPorts = getPortOptions(tgtType);

  // 先存临时引用, 再渲染 (渲染时需要判断端口占用)
  window.__pmSrc = srcItem;
  window.__pmTgt = tgtItem;

  document.getElementById('pm-src-name').textContent = srcModel.label || srcModel.id;
  document.getElementById('pm-tgt-name').textContent = tgtModel.label || tgtModel.id;
  _renderPortList('pm-src-ports', srcPorts, 'pm-src', srcModel.id);
  _renderPortList('pm-tgt-ports', tgtPorts, 'pm-tgt', tgtModel.id);

  document.getElementById('port-modal').style.display = 'flex';
}

function _renderPortList(containerId, ports, groupName, nodeId) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var html = '';
  var curCat = '';
  ports.forEach(function(p) {
    if (p.category !== curCat) {
      curCat = p.category;
      html += '<div class="port-cat-label">' + (p.category === 'optical' ? '🔆 SFP 光口' : '🔌 RJ45 电口') + '</div>';
    }
    var used = _isPortUsed(nodeId, p.port);
    var usedClass = used ? ' port-used' : '';
    var disabled = used ? ' disabled' : '';
    html += '<label class="port-option' + usedClass + '">' +
      '<input type="radio" name="' + groupName + '" value="' + p.port + '"' + disabled + '> ' +
      p.label + (used ? ' (已占用)' : '') +
      '</label>';
  });
  el.innerHTML = html;
}

/** 检查某个端口是否已被该节点的其他连线占用 */
function _isPortUsed(nodeId, port) {
  if (!graph || !nodeId) return false;
  var used = false;
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (ed.source === nodeId && ed.data && ed.data.fromPort === port) used = true;
    if (ed.target === nodeId && ed.data && ed.data.toPort   === port) used = true;
  });
  return used;
}

/** 端口弹窗确认 */
function portModalConfirm() {
  var srcPortEl = document.querySelector('input[name="pm-src"]:checked');
  var tgtPortEl = document.querySelector('input[name="pm-tgt"]:checked');
  if (!srcPortEl || !tgtPortEl) { alert('请分别为两台设备各选择一个接口。'); return; }

  var srcPort = parseInt(srcPortEl.value, 10);
  var tgtPort = parseInt(tgtPortEl.value, 10);
  var srcItem = window.__pmSrc;
  var tgtItem = window.__pmTgt;
  if (!srcItem || !tgtItem || !graph) return;

  var srcModel = srcItem.getModel();
  var tgtModel = tgtItem.getModel();
  var lt = _currentLinkType || 'copper';

  var label = _portLabel(srcModel, srcPort) + ' → ' + _portLabel(tgtModel, tgtPort);

  graph.addItem('edge', {
    source: srcModel.id,
    target: tgtModel.id,
    label: label,
    data: { fromPort: srcPort, toPort: tgtPort, linkType: lt },
  });

  // 更新已占用的端口状态
  _updateAllEdgePortLabels();

  document.getElementById('port-modal').style.display = 'none';
  window.__pmSrc = null;
  window.__pmTgt = null;
}

function portModalCancel() {
  document.getElementById('port-modal').style.display = 'none';
  window.__pmSrc = null;
  window.__pmTgt = null;
}

function _portLabel(model, port) {
  var t = (model.data && model.data.type) || model.type;
  var pf = (t && PortPrefix[t]) ? PortPrefix[t] : '';
  return pf ? pf + '/' + port : 'Port' + port;
}

/** 全量同步所有 edge 的 port 标签 */
function _updateAllEdgePortLabels() {
  if (!graph) return;
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    var srcModel = graph.findById(ed.source);
    var tgtModel = graph.findById(ed.target);
    var label = '';
    if (ed.data && ed.data.fromPort && srcModel) {
      label = _portLabel(srcModel.getModel(), ed.data.fromPort) + ' → ' + _portLabel(tgtModel ? tgtModel.getModel() : {}, ed.data.toPort);
    }
    if (label && label !== ed.label) {
      graph.updateItem(e, { label: label });
    }
  });
}

/* ============================================================
   修改连线类型 (网线 ↔ 光纤) — 更新当前 edge 样式
   ============================================================ */
function setCurrentLinkType(typeSlug) {
  _currentLinkType = typeSlug;
  // 更新已存在 edge 的样式 (通过重新设置 data.linkType)
  if (!graph) return;
  graph.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (ed.data && ed.data.linkType !== typeSlug) {
      graph.updateItem(e, { data: Object.assign({}, ed.data, { linkType: typeSlug }) });
    }
  });
  // 更新按钮状态
  document.querySelectorAll('.link-type-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-link-type') === typeSlug);
  });
}

/* ============================================================
   选中回调桥接
   ============================================================ */
function onNodeClick(nodeItem) {
  if (typeof onDiagramSelectionChanged === 'function') {
    var data = nodeItem ? mergeNodeData(nodeItem) : null;
    _onG6Selection(data, nodeItem);
  }
}

function mergeNodeData(nodeItem) {
  var m = nodeItem.getModel();
  var d = m.data || {};
  // name 取存储值, 不回退到显示标签 (m.label 含 [厂商] VLAN:x 装饰)
  return Object.assign({}, d, { id: m.id, type: m.type || d.type, name: d.name || m.label || '' });
}

function updateNodeFromPanel(prop, value) {
  if (!graph) return;
  var sel = graph.findAllByState('node', 'selected');
  if (sel.length === 0) return;
  var node = sel[0];
  var m = node.getModel();
  // 创建新对象确保 G6 识别变更 (避免同引用比较)
  var d = {};
  var oldData = m.data || {};
  Object.keys(oldData).forEach(function(k) { d[k] = oldData[k]; });
  d[prop] = value;

  // 名称/厂商/VLAN 变化时重建显示标签
  if (prop === 'name' || prop === 'vendor' || prop === 'vlan') {
    var displayLabel = buildNodeDisplayLabel(d);
    graph.updateItem(node, { label: displayLabel, data: d });
  } else {
    graph.updateItem(node, { data: d });
  }

  // 名称变更后刷新右侧面板
  if (prop === 'name' && typeof onDiagramSelectionChanged === 'function') {
    onDiagramSelectionChanged();
  }
}

/* ============================================================
   事务后回调
   ============================================================ */
function afterChange(g) {
  if (!g || g.destroyed) return;
  updateStatusBarG6(g);
  pushUndo(g);
  if (typeof updateConnectionList === 'function') updateConnectionList();
}

/* ============================================================
   撤销栈
   ============================================================ */
function pushUndo(g) {
  var snap = { nodes: [], edges: [] };
  g.getNodes().forEach(function(n) { snap.nodes.push(Object.assign({}, n.getModel())); });
  g.getEdges().forEach(function(e) { snap.edges.push(Object.assign({}, e.getModel())); });
  undoStack.push(snap);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}
function undo(g) {
  if (undoStack.length <= 1) return;
  undoStack.pop();
  var prev = undoStack[undoStack.length - 1];
  if (!prev) return;
  g.changeData({ nodes: prev.nodes, edges: prev.edges });
  updateStatusBarG6(g);
}

/* ============================================================
   状态栏
   ============================================================ */
function updateStatusBarG6(g) {
  var nodes = g ? g.getNodes().length : 0;
  var edges = g ? g.getEdges().length : 0;
  var nEl = document.getElementById('stat-nodes');
  var lEl = document.getElementById('stat-links');
  if (nEl) nEl.textContent = '节点: ' + nodes;
  if (lEl) lEl.textContent = '连线: ' + edges;
}

/* ============================================================
   面板拖拽 (HTML5 Drag → G6)
   ============================================================ */
function initPaletteDrag() {
  document.querySelectorAll('.palette-item').forEach(function(el) {
    el.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/plain', el.getAttribute('data-device-type'));
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  var container = document.getElementById('diagram-container');
  if (!container) return;
  container.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  container.addEventListener('drop', function(e) {
    e.preventDefault();
    var devType = e.dataTransfer.getData('text/plain');
    if (!devType || !graph) return;
    var rect = container.getBoundingClientRect();
    var point = graph.getPointByCanvas(e.clientX - rect.left, e.clientY - rect.top);
    var id = nextId();
    var nd = createNodeData(devType, id);
    var label = buildNodeDisplayLabel(nd);
    graph.addItem('node', { id: id, type: devType, x: point.x, y: point.y, label: label, data: nd });
  });
}

/* ============================================================
   获取选中节点连线
   ============================================================ */
function getNodeConnectionsG6(g) {
  if (!g) return [];
  var sel = g.findAllByState('node', 'selected');
  if (sel.length === 0) return [];
  var nodeId = sel[0].getModel().id, result = [];
  g.getEdges().forEach(function(e) {
    var ed = e.getModel();
    if (ed.source === nodeId || ed.target === nodeId) {
      var otherId = ed.source === nodeId ? ed.target : ed.source;
      var otherNode = g.findById(otherId);
      var otherData = otherNode ? (otherNode.getModel().data || {}) : {};
      result.push({
        fromPort: ed.data ? ed.data.fromPort : null, toPort: ed.data ? ed.data.toPort : null,
        localPort: ed.source === nodeId ? (ed.data ? ed.data.fromPort : null) : (ed.data ? ed.data.toPort : null),
        peerName: otherNode ? (otherNode.getModel().label || '?') : '?',
        peerType: otherNode ? (otherData.type || '?') : '?',
        peerKey: otherId,
        peerVlan: otherData.vlan || '',
      });
    }
  });
  return result;
}
function getNodeConnections(g) { return getNodeConnectionsG6(g); }

function highlightConnectionsG6(g) {
  if (!g) return;
  var sel = g.findAllByState('node', 'selected');
  g.getEdges().forEach(function(e) { g.setItemState(e, 'highlight', false); });
  if (sel.length === 0) return;
  var nodeId = sel[0].getModel().id;
  g.getEdges().forEach(function(e) {
    if (e.getModel().source === nodeId || e.getModel().target === nodeId) g.setItemState(e, 'highlight', true);
  });
  setTimeout(function() { g.getEdges().forEach(function(e) { g.setItemState(e, 'highlight', false); }); }, 3000);
}
function highlightConnections(g) { highlightConnectionsG6(g); }

/* ============================================================
   模式切换
   ============================================================ */
function setGraphMode(g, mode) {
  if (!g) return;
  g.setMode(mode === 'readonly' ? 'readonly' : 'default');
}

/* ============================================================
   公开 API
   ============================================================ */
function getSelectedNode(g) {
  if (!g) return null;
  var sel = g.findAllByState('node', 'selected');
  return sel.length ? mergeNodeData(sel[0]) : null;
}
function updateSelectedNode(g, prop, value) { updateNodeFromPanel(prop, value); }

function clearDiagram(g) {
  if (!g) return;
  g.clear();
  resetIdCounter();
  undoStack = [];
  updateStatusBarG6(g);
}
function exportDiagram(g) {
  if (!g) return '{}';
  return JSON.stringify({ nodes: g.getNodes().map(function(n){return n.getModel();}), edges: g.getEdges().map(function(e){return e.getModel();}) }, null, 2);
}
function importDiagram(g, json) {
  if (!g) return;
  try {
    var data = JSON.parse(json);
    if (data.nodeDataArray) { data.nodes = data.nodeDataArray; data.edges = data.linkDataArray || []; }
    g.changeData(data);
    if (data.nodes) setMaxId(data.nodes);
    updateStatusBarG6(g);
    undoStack = [];
  } catch (err) { alert('导入失败：JSON 格式不正确。\n' + err.message); }
}
function loadPreset(g, presetKey) {
  if (!g) return;
  var preset = PresetTopologies[presetKey];
  if (!preset) return;
  g.clear(); resetIdCounter();
  var nd = [];
  preset.nodes.forEach(function(n) {
    var id = nextId(), def = DeviceTypeDefs[n.type] || DeviceTypeDefs['pc'];
    var nodeData = { type: n.type, name: n.name || def.label, vendor: isEndpointDevice(n.type) ? 'endpoint' : '', ip:'', gateway:'', mask:'255.255.255.0', vlan:'', ports: def.defaultPorts };
    nd.push({ id: id, type: n.type, x: n.x, y: n.y, label: buildNodeDisplayLabel(nodeData), data: nodeData });
  });
  var ed = [];
  preset.links.forEach(function(l) { ed.push({ source: nd[l.from].id, target: nd[l.to].id, data: { linkType: 'copper' } }); });
  g.data({ nodes: nd, edges: ed }); g.render(); g.fitView(40);
  updateStatusBarG6(g); undoStack = [];
}

var _onG6Selection = function(data, nodeItem) { if (typeof onDiagramSelectionChanged === 'function') onDiagramSelectionChanged(); };

function initG6(divId) {
  graph = createGraph(divId);
  if (!graph) return null;
  initPaletteDrag();
  graph.data({ nodes: [], edges: [] }); graph.render(); graph.fitView(40);
  // 右键菜单项绑定
  document.querySelectorAll('#ctx-menu .ctx-item').forEach(function(el) {
    el.addEventListener('click', function() { ctxMenuAction(el.getAttribute('data-action')); });
  });
  // 点击空白关闭菜单
  document.addEventListener('click', function(e) { if (!e.target.closest('#ctx-menu')) _hideCtxMenu(); });
  // 端口弹窗按钮
  var pmConfirm = document.getElementById('pm-confirm'), pmCancel = document.getElementById('pm-cancel');
  if (pmConfirm) pmConfirm.addEventListener('click', portModalConfirm);
  if (pmCancel)  pmCancel.addEventListener('click',  portModalCancel);
  // 连线类型按钮
  document.querySelectorAll('.link-type-btn').forEach(function(b) {
    b.addEventListener('click', function() { setCurrentLinkType(b.getAttribute('data-link-type')); });
  });
  return graph;
}



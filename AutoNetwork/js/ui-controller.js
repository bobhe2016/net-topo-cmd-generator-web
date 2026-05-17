/* ============================================================
   ui-controller.js — 右侧参数面板渲染与表单绑定
   桥接 G6 选择 ↔ 属性表单，模板引擎对接
   ============================================================ */

/* 直接引用 g6-setup.js 的全局 graph */
let _fillingForm = false;
let _currentMode = 'design';   // 'design' | 'readonly'

/* ---------- 右侧面板 DOM 引用 ---------- */
const UIRefs = {
  selectionHint:    null,
  configForm:       null,

  // 基本信息
  inputName:         null,
  inputType:         null,
  selectSwitchLayer: null,
  switchLayerGroup:  null,
  selectVendor:      null,
  inputIP:          null,
  inputGateway:     null,
  inputMask:        null,
  inputVLAN:        null,
  inputPorts:       null,

  // 功能勾选框
  featureSection:   null,
  featureBoxes:     {},

  // VLAN
  vlanSection:      null,
  btnVlanModal:     null,
  vlanSummary:      null,
  vlanAlert:        null,

  // 连线信息
  connectionList:   null,
  btnViewConn:      null,

  // 命令
  btnGenerate:      null,
  btnBatchGenerate: null,
  textareaCommand:  null,

  // 状态
  modeLabel:        null,
};

/* ============================================================
   初始化
   ============================================================ */
function initUIController() {
  UIRefs.selectionHint    = document.getElementById('selection-hint');
  UIRefs.configForm       = document.getElementById('config-form');

  UIRefs.inputName        = document.getElementById('cfg-name');
  UIRefs.inputType        = document.getElementById('cfg-type');
  UIRefs.selectSwitchLayer = document.getElementById('cfg-switch-layer');
  UIRefs.switchLayerGroup  = document.getElementById('switch-layer-group');
  UIRefs.selectVendor     = document.getElementById('cfg-vendor');
  UIRefs.inputIP          = document.getElementById('cfg-ip');
  UIRefs.inputGateway     = document.getElementById('cfg-gateway');
  UIRefs.inputMask        = document.getElementById('cfg-mask');
  UIRefs.inputVLAN        = document.getElementById('cfg-vlan');
  UIRefs.inputPorts       = document.getElementById('cfg-ports');
  UIRefs.btnGenerate      = document.getElementById('btn-generate');
  UIRefs.btnBatchGenerate = document.getElementById('btn-batch-generate');
  UIRefs.textareaCommand  = document.getElementById('cmd-output');
  UIRefs.connectionList   = document.getElementById('connection-list');
  UIRefs.btnViewConn      = document.getElementById('btn-view-conn');
  UIRefs.modeLabel        = document.getElementById('mode-label');
  UIRefs.featureSection   = document.getElementById('feature-section');
  UIRefs.vlanSection      = document.getElementById('vlan-section');
  UIRefs.btnVlanModal     = document.getElementById('btn-vlan-modal');
  UIRefs.vlanSummary      = document.getElementById('vlan-summary');
  UIRefs.vlanAlert        = document.getElementById('vlan-alert');

  // 功能勾选框
  FeatureList.forEach(function(f) {
    const el = document.getElementById('feat-' + f.slug);
    if (el) UIRefs.featureBoxes[f.slug] = el;
  });

  bindFormEvents();
  bindActionButtons();
  bindTerminalModal();
  bindVlanModal();
  bindPropsModal();
  showNoSelection();
}

/* ============================================================
   表单 → 数据模型 双向绑定
   ============================================================ */
function bindFormEvents() {
  function handler(prop, getFn) {
    return function() {
      if (_fillingForm || !graph) return;
      updateSelectedNode(graph, prop, getFn());
      if (prop === 'name') { graph.refreshPositions(); }
    };
  }

  if (UIRefs.inputName) {
    UIRefs.inputName.addEventListener('input',
      handler('name', function() { return UIRefs.inputName.value; }));
  }
  if (UIRefs.selectSwitchLayer) {
    UIRefs.selectSwitchLayer.addEventListener('change',
      handler('switchLayer', function() { return UIRefs.selectSwitchLayer.value; }));
  }
  if (UIRefs.selectVendor) {
    UIRefs.selectVendor.addEventListener('change',
      handler('vendor', function() { return UIRefs.selectVendor.value; }));
  }
  if (UIRefs.inputIP) {
    UIRefs.inputIP.addEventListener('input',
      handler('ip', function() { return UIRefs.inputIP.value; }));
  }
  if (UIRefs.inputGateway) {
    UIRefs.inputGateway.addEventListener('input',
      handler('gateway', function() { return UIRefs.inputGateway.value; }));
  }
  if (UIRefs.inputMask) {
    UIRefs.inputMask.addEventListener('input',
      handler('mask', function() { return UIRefs.inputMask.value; }));
  }
  if (UIRefs.inputVLAN) {
    UIRefs.inputVLAN.addEventListener('input',
      handler('vlan', function() { return UIRefs.inputVLAN.value; }));
  }
  if (UIRefs.inputPorts) {
    UIRefs.inputPorts.addEventListener('input',
      handler('ports', function() { return parseInt(UIRefs.inputPorts.value, 10) || 0; }));
  }
  Object.keys(UIRefs.featureBoxes).forEach(function(slug) {
    UIRefs.featureBoxes[slug].addEventListener('change',
      handler('feature_' + slug, function() { return UIRefs.featureBoxes[slug].checked; }));
  });
}

/* ============================================================
   按钮事件绑定
   ============================================================ */
function bindActionButtons() {
  // 单设备生成命令 — 与右键菜单走同一函数 generateForNode
  if (UIRefs.btnGenerate) {
    UIRefs.btnGenerate.addEventListener('click', function() {
      if (!graph) return;
      var selNodes = graph.findAllByState('node', 'selected');
      if (selNodes.length === 0) { alert('请先在画布中选中一台设备'); return; }
      var nodeItem = selNodes[0];
      var data = nodeItem.getModel().data || {};
      if (!data.vendor) { alert('请先在右侧面板中选择设备厂商'); return; }
      generateForNode(nodeItem);
    });
  }

  // 批量生成 — 输出到终端弹窗
  if (UIRefs.btnBatchGenerate) {
    UIRefs.btnBatchGenerate.addEventListener('click', function() {
      if (!graph || graph.getNodes().length === 0) {
        alert('画布中没有设备，请先拖入设备并连线。');
        return;
      }
      showTerminalModal(CmdTpl.generateAll(graph));
    });
  }

  // 查看连线: 高亮 + 显示连线列表
  if (UIRefs.btnViewConn) {
    UIRefs.btnViewConn.addEventListener('click', function() {
      if (!graph) return;
      highlightConnections(graph);
      updateConnectionList(graph);
      setTimeout(function() { graph.getEdges().forEach(function(e) { graph.setItemState(e, 'highlight', false); }); }, 3000);
    });
  }
}

/* ============================================================
   右侧面板状态切换
   ============================================================ */
function showNoSelection() {
  UIRefs.selectionHint.style.display = 'flex';
  UIRefs.configForm.style.display = 'none';
}

function showConfigForm() {
  UIRefs.selectionHint.style.display = 'none';
  UIRefs.configForm.style.display = 'block';
}

/** 根据选中节点数据填充表单 */
function populateForm(nodeData) {
  if (!nodeData) { showNoSelection(); return; }
  _fillingForm = true;
  showConfigForm();

  if (UIRefs.inputName)    UIRefs.inputName.value     = nodeData.name || '';
  if (UIRefs.inputType)    UIRefs.inputType.value     = getDeviceLabel(nodeData.type);
  // 交换机层级 (仅交换机显示)
  var isSw = (nodeData.type === 'core_switch' || nodeData.type === 'agg_switch' || nodeData.type === 'acc_switch');
  if (UIRefs.switchLayerGroup) UIRefs.switchLayerGroup.style.display = isSw ? '' : 'none';
  if (UIRefs.selectSwitchLayer) UIRefs.selectSwitchLayer.value = nodeData.switchLayer || DefaultSwitchLayer[nodeData.type] || 'l2';
  if (UIRefs.selectVendor) UIRefs.selectVendor.value   = nodeData.vendor || '';
  if (UIRefs.inputIP)      UIRefs.inputIP.value        = nodeData.ip || '';
  if (UIRefs.inputGateway) UIRefs.inputGateway.value   = nodeData.gateway || '';
  if (UIRefs.inputMask)    UIRefs.inputMask.value      = nodeData.mask || '255.255.255.0';
  if (UIRefs.inputVLAN)    UIRefs.inputVLAN.value      = nodeData.vlan || '';
  if (UIRefs.inputPorts)   UIRefs.inputPorts.value     = nodeData.ports || 0;

  Object.keys(UIRefs.featureBoxes).forEach(function(slug) {
    UIRefs.featureBoxes[slug].checked = !!nodeData['feature_' + slug];
  });

  // 功能选项区段 (仅路由器 / L3 交换机)
  var isL3Device = (nodeData.type === 'router') || (isSw && (nodeData.switchLayer || DefaultSwitchLayer[nodeData.type]) === 'l3');
  var isL2Switch = isSw && (nodeData.switchLayer || DefaultSwitchLayer[nodeData.type]) === 'l2';
  if (UIRefs.featureSection) UIRefs.featureSection.style.display = isL3Device ? '' : 'none';
  // VLAN 区段 (CSS class 控制显隐)
  if (UIRefs.vlanSection) {
    if (isSw) {
      UIRefs.vlanSection.classList.add('vlan-visible');
      // L3: 显示批量编辑按钮; L2: 隐藏按钮
      if (UIRefs.btnVlanModal) UIRefs.btnVlanModal.style.display = isL3Device ? '' : 'none';
      // 更新标题文字
      var titleEl = UIRefs.vlanSection.querySelector('.form-section-title');
      if (titleEl) {
        var btnHtml = UIRefs.btnVlanModal ? UIRefs.btnVlanModal.outerHTML : '';
        titleEl.innerHTML = isL2Switch
          ? '⚙ VLAN 配置 <span style="color:#DC2626;font-weight:400;font-size:11px;margin-left:6px;">(自动反推)</span>'
          : '⚙ VLAN 配置 ' + (isL3Device ? btnHtml : '');
        // 重新绑定按钮引用 (innerHTML 会重建 DOM)
        if (isL3Device) {
          UIRefs.btnVlanModal = document.getElementById('btn-vlan-modal');
          if (UIRefs.btnVlanModal) UIRefs.btnVlanModal.addEventListener('click', openVlanModal);
        }
      }
      // L3 未配置 VLAN 时显示红色告警
      if (isL3Device && (!nodeData.customVlans || nodeData.customVlans.length === 0)) {
        if (UIRefs.vlanAlert) {
          UIRefs.vlanAlert.style.display = '';
          UIRefs.vlanAlert.innerHTML = '⚠ 尚未配置业务 VLAN，请点击 <b>"📋 批量编辑 VLAN"</b> 添加 VLANIF 网关接口';
        }
      } else {
        if (UIRefs.vlanAlert) UIRefs.vlanAlert.style.display = 'none';
      }
    } else {
      UIRefs.vlanSection.classList.remove('vlan-visible');
      if (UIRefs.vlanAlert) UIRefs.vlanAlert.style.display = 'none';
    }
  }
  if (isL2Switch) {
    renderL2DerivedVlanSummary(nodeData, graph);
    // L2 自动填充 VLAN ID 栏: 取全部反推 VLAN, 逗号分隔
    if (UIRefs.inputVLAN) {
      var analysis = analyzeTopology(graph);
      var dev = null;
      for (var i = 0; i < analysis.devices.length; i++) {
        if (analysis.devices[i].id === nodeData.id) { dev = analysis.devices[i]; break; }
      }
      var derived = (dev && dev.derivedVlans) ? dev.derivedVlans : [];
      // 同时合并手动追加的 VLAN ID
      var manual = nodeData.customVlans || [];
      manual.forEach(function(v) { if (derived.indexOf(v.id) < 0) derived.push(v.id); });
      if (derived.length > 0) {
        var allVlans = derived.join(',');
        if (UIRefs.inputVLAN.value !== allVlans) {
          UIRefs.inputVLAN.value = allVlans;
          // 不回写模型, 避免拼接字符串被反推逻辑再次追加
        }
      }
    }
  } else if (isSw) {
    renderVlanSummary(nodeData.customVlans || []);
  }

  _fillingForm = false;

  // 同步更新连线列表
  updateConnectionList(graph);
}

function getDeviceLabel(type) {
  var def = DeviceTypeDefs[type];
  return def ? def.label : type;
}

/* ============================================================
   GoJS 选择回调
   ============================================================ */
function onDiagramSelectionChanged() {
  var data = getSelectedNode(graph);
  if (data) {
    populateForm(data);
  } else {
    showNoSelection();
  }
}

/* ============================================================
   连线列表更新 (显示在右侧面板)
   ============================================================ */
function updateConnectionList() {
  if (!UIRefs.connectionList) return;
  var sel = getSelectedNode(graph);
  if (!sel) {
    UIRefs.connectionList.innerHTML = '<span class="conn-empty">未选中设备</span>';
    return;
  }
  var conns = getNodeConnections(graph);
  if (conns.length === 0) {
    UIRefs.connectionList.innerHTML = '<span class="conn-empty">暂无连线</span>';
    return;
  }

  var html = '';
  conns.forEach(function(c) {
    var fpPref = (sel.type && PortPrefix[sel.type]) ? PortPrefix[sel.type] + '/' : '';
    html += '<div class="conn-item">' +
      '<span class="conn-port">' + fpPref + c.localPort + '</span>' +
      '<span class="conn-arrow"> ↔ </span>' +
      '<span class="conn-peer">' + escapeHtml(c.peerName) + '</span>' +
      '</div>';
  });
  UIRefs.connectionList.innerHTML = html;
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ============================================================
   工具栏操作
   ============================================================ */

// 新建 / 清空
function toolbarClear() {
  if (confirm('确认清空画布？此操作不可撤销。')) {
    clearDiagram(graph);
    showNoSelection();
  }
}

// 保存 / 导出
function toolbarExport() {
  var json = exportDiagram(graph);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'topology_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// 打开 / 导入
function toolbarImport() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) { importDiagram(graph, ev.target.result); };
    reader.readAsText(file);
  };
  input.click();
}

// 常用案例
function toolbarPreset(presetKey) {
  if (confirm('加载预设案例将清空当前画布，确认继续？')) {
    loadPreset(graph, presetKey);
    showNoSelection();
  }
}

// 模式切换
function toolbarToggleMode() {
  if (_currentMode === 'design') {
    _currentMode = 'readonly';
    setGraphMode(graph, 'readonly');
    if (UIRefs.modeLabel) UIRefs.modeLabel.textContent = '🔒 只读模式';
  } else {
    _currentMode = 'design';
    setGraphMode(graph, 'design');
    if (UIRefs.modeLabel) UIRefs.modeLabel.textContent = '✏️ 设计模式';
  }
}

// 删除选中设备 (支持框选批量删除)
function toolbarDelete() {
  if (!graph) return;
  var sel = graph.findAllByState('node', 'selected');
  if (sel.length === 0) { alert('请先在画布中选中设备（可 Shift+拖拽框选多个）。'); return; }
  deleteSelectedNodes();
  onDiagramSelectionChanged();
}

// 批量生成命令 — 弹出终端弹窗
function toolbarBatchGenerate() {
  if (!graph) return;
  var count = graph.getNodes().length;
  if (count === 0) {
    alert('画布中没有设备，请先拖入设备并连线。');
    return;
  }
  showTerminalModal(CmdTpl.generateAll(graph));
}

/* ============================================================
   终端弹窗 (黑底白字全屏)
   ============================================================ */
function bindTerminalModal() {
  var overlay = document.getElementById('terminal-modal');
  var closeBtn = document.getElementById('term-close');
  var copyBtn  = document.getElementById('term-copy');

  if (closeBtn) closeBtn.addEventListener('click', hideTerminalModal);
  if (copyBtn) copyBtn.addEventListener('click', function() {
    var body = document.getElementById('terminal-body');
    if (!body) return;
    navigator.clipboard.writeText(body.textContent || '').then(function() {
      copyBtn.textContent = '✅ 已复制';
      setTimeout(function() { copyBtn.textContent = '📋 复制'; }, 1500);
    }).catch(function() {
      alert('复制失败，请手动选择文本后 Ctrl+C 复制。');
    });
  });

  // 点击遮罩关闭
  if (overlay) overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideTerminalModal();
  });

  // Esc 关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay && overlay.style.display === 'flex') {
      hideTerminalModal();
    }
  });
}

function showTerminalModal(text) {
  var overlay = document.getElementById('terminal-modal');
  var body = document.getElementById('terminal-body');
  if (!overlay || !body) return;

  // 语法高亮: ! 注释 → 灰色, 其他 → 绿色
  var html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^(!.*)$/gm, '<span class="t-comment">$1</span>')
    .split('\n').map(function(line) {
      if (/^!/.test(line)) return line;
      if (/^#/.test(line)) return line;
      if (/^\s*$/.test(line)) return '';
      return '<span class="t-cmd">' + line + '</span>';
    }).join('\n');

  body.innerHTML = html;
  overlay.style.display = 'flex';
}

function hideTerminalModal() {
  var overlay = document.getElementById('terminal-modal');
  if (overlay) overlay.style.display = 'none';
}

function showAboutModal() {
  var overlay = document.getElementById('about-modal');
  if (overlay) overlay.style.display = 'flex';
  var closeBtn = document.getElementById('about-close');
  if (closeBtn) {
    closeBtn.onclick = function() { overlay.style.display = 'none'; };
  }
  if (overlay) {
    overlay.onclick = function(e) { if (e.target === overlay) overlay.style.display = 'none'; };
  }
}

/* ============================================================
   VLAN 批量编辑弹窗
   ============================================================ */
function bindVlanModal() {
  var btn = UIRefs.btnVlanModal;
  var saveBtn = document.getElementById('vlan-save');
  var cancelBtn = document.getElementById('vlan-cancel');
  var addBtn = document.getElementById('vlan-add-row');
  var overlay = document.getElementById('vlan-modal');

  if (btn) btn.addEventListener('click', openVlanModal);
  if (saveBtn) saveBtn.addEventListener('click', saveVlans);
  if (cancelBtn) cancelBtn.addEventListener('click', closeVlanModal);
  if (addBtn) addBtn.addEventListener('click', function() { addVlanRow(); });
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeVlanModal(); });
}

function openVlanModal() {
  var sel = getSelectedNode(graph);
  if (!sel) return;
  // 记下当前节点 ID, 保存时使用 (避免选中状态丢失)
  window.__currentVlanNodeId = sel.id;
  var vlans = sel.customVlans || [];
  var tbody = document.querySelector('#vlan-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (vlans.length === 0) {
    addVlanRow();
  } else {
    vlans.forEach(function(v) { addVlanRow(v); });
  }
  document.getElementById('vlan-modal').style.display = 'flex';
}

function closeVlanModal() {
  document.getElementById('vlan-modal').style.display = 'none';
}

function addVlanRow(data) {
  var tbody = document.querySelector('#vlan-table tbody');
  if (!tbody) return;
  var d = data || { id: '', name: '', desc: '', ip: '', mask: '255.255.255.0' };
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td class="id-col"><input type="number" placeholder="10" value="' + d.id + '" min="1" max="4094"></td>' +
    '<td class="name-col"><input type="text" placeholder="办公网络" value="' + _esc(d.name) + '"></td>' +
    '<td class="desc-col"><input type="text" placeholder="Office" value="' + _esc(d.desc) + '"></td>' +
    '<td class="ip-col"><input type="text" placeholder="192.168.10.1" value="' + d.ip + '"></td>' +
    '<td class="mask-col"><input type="text" placeholder="255.255.255.0" value="' + (d.mask || '255.255.255.0') + '"></td>' +
    '<td class="act-col"><button class="del-row-btn" onclick="this.closest(\'tr\').remove()">✕</button></td>';
  tbody.appendChild(tr);
}

function saveVlans() {
  var rows = document.querySelectorAll('#vlan-table tbody tr');
  var vlans = [];
  var seen = {};
  var errors = [];

  rows.forEach(function(tr) {
    var inputs = tr.querySelectorAll('input');
    var v = {
      id:   inputs[0].value.trim(),
      name: inputs[1].value.trim(),
      desc: inputs[2].value.trim(),
      ip:   inputs[3].value.trim(),
      mask: inputs[4].value.trim() || '255.255.255.0',
    };
    // 跳过完全空行
    if (!v.id && !v.name && !v.ip) return;
    // VLAN ID 必填 + 范围
    if (!v.id) { errors.push('VLAN ID 不能为空'); return; }
    var vid = parseInt(v.id, 10);
    if (isNaN(vid) || vid < 1 || vid > 4094) { errors.push('VLAN ID 必须在 1-4094 范围内, 当前值: ' + v.id); return; }
    if (seen[v.id]) { errors.push('VLAN ID ' + v.id + ' 重复, 请删除重复行'); return; }
    seen[v.id] = true;
    // IP 校验 (如有填写)
    if (v.ip && !_isValidUnicastIP(v.ip)) { errors.push('VLAN ' + v.id + ' 的 IP 地址 ' + v.ip + ' 不合法 (单播 A/B/C 类: 1.0.0.0~223.255.255.255)'); return; }
    // 掩码校验 (如有填写)
    if (v.mask && !_isValidMask(v.mask)) { errors.push('VLAN ' + v.id + ' 的子网掩码 ' + v.mask + ' 不合法'); return; }
    vlans.push(v);
  });

  if (errors.length > 0) {
    alert('保存失败, 请修正以下错误:\n\n' + errors.join('\n'));
    return;
  }

  updateSelectedNode(graph, 'customVlans', vlans);
  // localStorage 持久存储 (按节点 ID 索引, 刷新不丢)
  var nodeId = window.__currentVlanNodeId || (getSelectedNode(graph) || {}).id;
  if (nodeId) localStorage.setItem('vlan_' + nodeId, JSON.stringify(vlans));
  window.__savedCustomVlans = vlans;
  closeVlanModal();
  // 刷新 VLAN 摘要
  renderVlanSummary(vlans);
  // 刷新面板
  if (typeof onDiagramSelectionChanged === 'function') onDiagramSelectionChanged();
}

function renderVlanSummary(vlans) {
  if (!UIRefs.vlanSummary) return;
  if (!vlans || vlans.length === 0) {
    UIRefs.vlanSummary.innerHTML = '<span style="color:var(--text-muted);">未定义 VLAN — 点击"📋 批量编辑 VLAN"添加业务 VLANIF</span>';
    return;
  }
  var html = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">' + vlans.length + ' 个 VLAN · 点击上方按钮编辑</div>';
  vlans.forEach(function(v) {
    html += '<div style="display:flex;gap:6px;padding:2px 0;align-items:center;">' +
      '<span style="min-width:28px;font-weight:600;color:var(--accent);">' + v.id + '</span>' +
      '<span style="flex:1;">' + (v.name || 'VLAN ' + v.id) + '</span>' +
      '<span style="color:var(--text-muted);font-size:11px;font-family:var(--font-mono);">' + (v.ip || '-') + '/' + (v.mask || '-') + '</span>' +
      '</div>';
  });
  UIRefs.vlanSummary.innerHTML = html;
}

/** L2 交换机: 从接入终端 + 上层交换机反推 VLAN 并展示, 仅允许增减 VLAN ID */
function renderL2DerivedVlanSummary(nodeData, g) {
  if (!UIRefs.vlanSummary) return;
  // 调用分析器获取反推结果
  var analysis = analyzeTopology(g || graph);
  var dev = null;
  for (var i = 0; i < analysis.devices.length; i++) {
    if (analysis.devices[i].id === nodeData.id) { dev = analysis.devices[i]; break; }
  }
  var derived = (dev && dev.derivedVlans) ? dev.derivedVlans : [];
  var manual = nodeData.customVlans || [];
  // 合并去重展示
  var allIds = derived.slice();
  manual.forEach(function(v) { if (allIds.indexOf(v.id) < 0) allIds.push(v.id); });

  var html = '';
  if (allIds.length === 0) {
    html += '<div style="color:var(--warning);font-size:11px;margin-bottom:6px;">⚠ 未检测到接入设备 VLAN，请先给 PC/摄像头等终端设置 VLAN ID。</div>';
  } else {
    html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">VLAN 列表 (仅二层划分, 无 VLANIF IP):</div>';
    allIds.forEach(function(v) {
      var isDerived = derived.indexOf(v) >= 0;
      var tag = isDerived ? '反推' : '手动';
      html += '<div style="display:inline-flex;align-items:center;gap:2px;margin:3px 6px 3px 0;padding:3px 8px;background:' + (isDerived ? '#DBEAFE' : '#FEF2F2') + ';border:1px solid ' + (isDerived ? '#93C5FD' : '#FECACA') + ';border-radius:6px;padding:4px 8px;gap:4px;">' +
        '<span style="font-weight:600;color:var(--accent);">' + v + '</span>' +
        '<span style="color:var(--text-muted);margin-left:2px;font-size:10px;">' + tag + '</span>';
      // 仅手动添加的可以删除
      if (!isDerived) {
        html += '<button onclick="removeL2VlanId(\'' + v + '\')" title="删除此 VLAN ID" style="background:#DC2626;color:white;border:none;border-radius:3px;padding:1px 8px;font-size:10px;cursor:pointer;">🗑 删除</button>';
      }
      html += '</div>';
    });
  }

  // 手动追加 VLAN ID
  html += '<div style="display:flex;gap:4px;margin-top:8px;padding-top:6px;border-top:1px solid var(--border-light);">' +
    '<input id="l2-vlan-input" type="number" min="1" max="4094" placeholder="VLAN ID" style="width:75px;padding:3px 6px;border:1px solid var(--border-medium);border-radius:3px;font-size:12px;" onkeydown="if(event.key===\'Enter\')addL2VlanId()">' +
    '<button onclick="addL2VlanId()" class="btn-small">＋ 添加</button>' +
    '</div>';

  UIRefs.vlanSummary.innerHTML = html;
  window.__l2NodeId = nodeData.id;
}

/** 手动为 L2 交换机追加 VLAN ID */
function addL2VlanId() {
  var input = document.getElementById('l2-vlan-input');
  if (!input || !input.value.trim()) return;
  var vlanId = input.value.trim();
  input.value = '';
  var sel = getSelectedNode(graph);
  if (!sel) return;
  var existing = (sel.customVlans || []).slice();
  if (existing.some(function(v) { return v.id === vlanId; })) return;
  existing.push({ id: vlanId, name: '', desc: '', ip: '', mask: '' });
  updateSelectedNode(graph, 'customVlans', existing);
  // 局部刷新 VLAN 区域 (不触发全面板重绘)
  renderL2DerivedVlanSummary(sel, graph);
}

/** 删除手动添加的 L2 VLAN ID */
function removeL2VlanId(vlanId) {
  var sel = getSelectedNode(graph);
  if (!sel) return;
  var existing = (sel.customVlans || []).filter(function(v) { return v.id !== vlanId; });
  updateSelectedNode(graph, 'customVlans', existing);
  renderL2DerivedVlanSummary(sel, graph);
}

function _esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/** IP 合法性校验: 单播 A/B/C 类, 排除 0/127/>=224 */
function _isValidUnicastIP(ip) {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  var p = ip.split('.'), o1 = parseInt(p[0], 10);
  if (o1 === 0 || o1 === 127 || o1 >= 224) return false;
  return p.every(function(o) { var n = parseInt(o, 10); return n >= 0 && n <= 255; });
}

/** 子网掩码合法性校验 */
function _isValidMask(mask) {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mask)) return false;
  var p = mask.split('.'), bits = '';
  for (var i = 0; i < 4; i++) {
    var n = parseInt(p[i], 10);
    if (n < 0 || n > 255) return false;
    bits += ('00000000' + n.toString(2)).slice(-8);
  }
  return /^1*0*$/.test(bits) && bits.indexOf('1') >= 0;  // 连续 1 后连续 0
}

/* ============================================================
   设备属性模态框 (右键 → 设备属性)
   ============================================================ */
function bindPropsModal() {
  var saveBtn = document.getElementById('props-save');
  var cancelBtn = document.getElementById('props-cancel');
  var overlay = document.getElementById('props-modal');
  if (saveBtn) saveBtn.addEventListener('click', saveProps);
  if (cancelBtn) cancelBtn.addEventListener('click', function() { overlay.style.display = 'none'; });
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.style.display = 'none'; });
  // 填充厂商下拉
  var vSel = document.getElementById('props-vendor');
  if (vSel && vSel.options.length === 0) {
    VendorList.forEach(function(v) {
      var o = document.createElement('option'); o.value = v.slug; o.textContent = v.label; vSel.appendChild(o);
    });
  }
}

/** 右键菜单触发: 弹出设备属性模态框 */
function openPropsModal() {
  var sel = getSelectedNode(graph);
  if (!sel) { alert('请先选中一台设备。'); return; }
  var isSw = (sel.type === 'core_switch' || sel.type === 'agg_switch' || sel.type === 'acc_switch');

  document.getElementById('props-name').value = sel.name || '';
  document.getElementById('props-type').value = getDeviceLabel(sel.type);
  document.getElementById('props-ip').value = sel.ip || '';
  document.getElementById('props-gateway').value = sel.gateway || '';
  document.getElementById('props-mask').value = sel.mask || '255.255.255.0';
  // VLAN: L2 取反推值, 其他取模型值
  var vlanVal = sel.vlan || '';
  if (isSw && (sel.switchLayer || DefaultSwitchLayer[sel.type]) === 'l2') {
    var analysis = analyzeTopology(graph);
    var dev = null;
    for (var i = 0; i < analysis.devices.length; i++) {
      if (analysis.devices[i].id === sel.id) { dev = analysis.devices[i]; break; }
    }
    var derived = (dev && dev.derivedVlans) ? dev.derivedVlans : [];
    if (derived.length > 0) vlanVal = derived.join(',');
  }
  document.getElementById('props-vlan').value = vlanVal;
  document.getElementById('props-ports').value = sel.ports || 0;
  document.getElementById('props-vendor').value = sel.vendor || '';

  var layerSel = document.getElementById('props-layer');
  if (isSw) {
    layerSel.style.display = 'inline-block';
    layerSel.value = sel.switchLayer || DefaultSwitchLayer[sel.type] || 'l2';
  } else {
    layerSel.style.display = 'none';
  }

  document.getElementById('props-modal').style.display = 'flex';
}

function saveProps() {
  var sel = getSelectedNode(graph);
  if (!sel) return;

  var props = {
    name:    document.getElementById('props-name').value.trim(),
    vendor:  document.getElementById('props-vendor').value,
    ip:      document.getElementById('props-ip').value.trim(),
    gateway: document.getElementById('props-gateway').value.trim(),
    mask:    document.getElementById('props-mask').value.trim(),
    vlan:    document.getElementById('props-vlan').value.trim(),
    ports:   parseInt(document.getElementById('props-ports').value, 10) || 0,
  };

  // 交换机层级
  var layerSel = document.getElementById('props-layer');
  if (layerSel.style.display !== 'none') {
    props.switchLayer = layerSel.value;
  }

  // 逐个写入
  Object.keys(props).forEach(function(k) {
    updateSelectedNode(graph, k, props[k]);
  });

  document.getElementById('props-modal').style.display = 'none';
  // 刷新右侧面板
  if (typeof onDiagramSelectionChanged === 'function') onDiagramSelectionChanged();
}

/* ============================================================
   data.js — 设备类型定义、厂商列表、功能选项、统一数据结构
   所有拓扑节点的数据模型定义，预留命令生成所需字段
   ============================================================ */

/**
 * 设备类型定义表
 *
 * 统一节点数据模型 (每个节点包含以下字段):
 *   key       — 唯一 ID (自动生成)
 *   category  — 模板键 (对应 GoJS nodeTemplateMap)
 *   type      — 设备类型标识
 *   name      — 自定义设备名称
 *   vendor    — 厂商 (huawei | h3c | cisco | ruijie)
 *   ip        — 管理 IP
 *   gateway   — 网关地址
 *   mask      — 子网掩码
 *   vlan      — VLAN ID
 *   ports     — 端口总数
 *   usedPorts — 已占用端口列表 (由连线自动维护)
 */
const DeviceTypeDefs = {
  router: {
    slug:      'router',
    label:     '路由器',
    category:  'networking',
    defaultPorts: 8,
  },
  core_switch: {
    slug:      'core_switch',
    label:     '核心交换机',
    category:  'networking',
    defaultPorts: 48,
  },
  agg_switch: {
    slug:      'agg_switch',
    label:     '汇聚交换机',
    category:  'networking',
    defaultPorts: 24,
  },
  acc_switch: {
    slug:      'acc_switch',
    label:     '接入交换机',
    category:  'networking',
    defaultPorts: 24,
  },
  pc: {
    slug:      'pc',
    label:     'PC',
    category:  'endpoint',
    defaultPorts: 1,
  },
  server: {
    slug:      'server',
    label:     '服务器',
    category:  'endpoint',
    defaultPorts: 2,
  },
  camera: {
    slug:      'camera',
    label:     '摄像头',
    category:  'surveillance',
    defaultPorts: 1,
  },
  nvr: {
    slug:      'nvr',
    label:     'NVR',
    category:  'surveillance',
    defaultPorts: 2,
  },
};

/** 左侧设备栏分类结构 (HTML 分组渲染) */
const DeviceCategories = [
  {
    name:  '网络设备',
    icon:  '🌐',
    types: ['router', 'core_switch', 'agg_switch', 'acc_switch'],
  },
  {
    name:  '终端设备',
    icon:  '💻',
    types: ['pc', 'server'],
  },
  {
    name:  '监控设备',
    icon:  '📹',
    types: ['camera', 'nvr'],
  },
];

/** 厂商列表 (slug 与模板文件名一一对应) */
const VendorList = [
  { slug: '',         label: '-- 请选择厂商 --' },
  { slug: 'huawei',   label: '华为 (Huawei)' },
  { slug: 'h3c',      label: 'H3C' },
  { slug: 'cisco',    label: '思科 (Cisco)' },
  { slug: 'ruijie',   label: '锐捷 (Ruijie)' },
  { slug: 'tplink',   label: 'TP-Link' },
  { slug: 'endpoint', label: '终端/监控设备 (免CLI)' },
];

/** 终端/监控设备默认使用 'endpoint' 厂商(免CLI) */
function isEndpointDevice(type) {
  return ['pc','server','camera','nvr'].indexOf(type) >= 0;
}

/**
 * 构建拓扑画布上节点的显示标签
 * 格式: [厂商] 设备名称 VLAN:x
 * 终端设备不显示厂商标签
 */
function buildNodeDisplayLabel(data) {
  // 仅返回设备名, 厂商和 VLAN 由 g6-setup 的 _addNodeLabels 分别渲染
  return data.name || data.type || '';
}

/** 设备类别 → 模板类别映射 (路由类 / 交换类 / 终端类) */
const DeviceClassMap = {
  router:       'router',
  core_switch:  'switch',
  agg_switch:   'switch',
  acc_switch:   'switch',
  pc:           'endpoint',
  server:       'endpoint',
  camera:       'endpoint',
  nvr:          'endpoint',
};

/** 交换机默认层级: 核心/汇聚=L3, 接入=L2 */
const DefaultSwitchLayer = {
  core_switch: 'l3',
  agg_switch:  'l3',
  acc_switch:  'l2',
};

/** 交换机层级选项 */
const SwitchLayerOptions = [
  { slug: 'l3', label: '三层交换机 (L3) — VLANIF 网关 + 路由' },
  { slug: 'l2', label: '二层交换机 (L2) — 仅 VLAN + 管理 IP' },
];

/** 批量功能勾选框 (预留，后续接入命令模板) */
const FeatureList = [
  { slug: 'dhcp',         label: 'DHCP 服务' },
  { slug: 'anti_private', label: '防私接' },
  { slug: 'port_agg',     label: '端口聚合' },
  { slug: 'stp',          label: '生成树' },
  { slug: 'remote_mgmt',  label: '远程管理' },
  { slug: 'no_intercom',  label: '禁止互通' },
];

/** 连线类型 (影响链路样式) */
const LinkTypes = [
  { slug: 'copper', label: '网线', color: '#64748B', dash: false },
  { slug: 'fiber',  label: '光纤', color: '#F59E0B', dash: true  },
];
let _currentLinkType = 'copper';  // 默认网线

/** 设备端口定义 (RJ45 电口 + SFP 光口)
 *  每个设备类型有 rj45 / optical 两个区段,
 *  生成端口选择列表时使用 */
const DevicePorts = {
  router: {
    rj45:    { count: 8,  start: 1,  end: 8,  label: 'RJ45 电口' },
    optical: { count: 2,  start: 9,  end: 10, label: 'SFP 光口' },
  },
  core_switch: {
    rj45:    { count: 48, start: 1,  end: 48, label: 'RJ45 电口' },
    optical: { count: 4,  start: 49, end: 52, label: 'SFP+ 光口' },
  },
  agg_switch: {
    rj45:    { count: 24, start: 1,  end: 24, label: 'RJ45 电口' },
    optical: { count: 4,  start: 25, end: 28, label: 'SFP+ 光口' },
  },
  acc_switch: {
    rj45:    { count: 24, start: 1,  end: 24, label: 'RJ45 电口' },
    optical: { count: 2,  start: 25, end: 26, label: 'SFP 光口' },
  },
  pc: {
    rj45:    { count: 1,  start: 1,  end: 1,  label: 'RJ45' },
  },
  server: {
    rj45:    { count: 2,  start: 1,  end: 2,  label: 'RJ45 电口' },
    optical: { count: 2,  start: 3,  end: 4,  label: 'SFP+ 光口' },
  },
  camera: {
    rj45:    { count: 1,  start: 1,  end: 1,  label: 'PoE 电口' },
  },
  nvr: {
    rj45:    { count: 2,  start: 1,  end: 2,  label: 'RJ45 电口' },
  },
};

/**
 * 获取某个设备类型的端口选项列表 (用于端口选择弹窗)
 * @returns [{port, label, category}]  — category: 'rj45' | 'optical'
 */
function getPortOptions(deviceType) {
  var ports = DevicePorts[deviceType];
  if (!ports) return [{ port: 1, label: 'Port 1', category: 'rj45' }];
  var list = [];
  ['rj45','optical'].forEach(function(cat) {
    var p = ports[cat];
    if (!p) return;
    for (var i = p.start; i <= p.end; i++) {
      list.push({ port: i, label: p.label + ' ' + i, category: cat });
    }
  });
  return list;
}

/** 端口命名前缀 (按设备类型，预留命令生成使用) */
const PortPrefix = {
  router:       'G0/0',
  core_switch:  'G0/0',
  agg_switch:   'G0/0',
  acc_switch:   'G0/0',
  pc:           'ETH',
  server:       'ETH',
  camera:       'PoE',
  nvr:          'ETH',
};

/**
 * 工厂函数: 为指定设备类型创建默认节点数据
 */
function createNodeData(type, key) {
  const def = DeviceTypeDefs[type] || DeviceTypeDefs['pc'];
  // 网络设备按类型自动编号: 核心交换机-1, 核心交换机-2, ...
  var label = def.label;
  if (type === 'router' || type === 'core_switch' || type === 'agg_switch' || type === 'acc_switch') {
    label = def.label + '-' + _nextDeviceNum(type);
  }
  var data = {
    key:      key,
    category: type,
    type:     type,
    name:     label,
    vendor:   isEndpointDevice(type) ? 'endpoint' : '',
    ip:       '',
    gateway:  '',
    mask:     '255.255.255.0',
    vlan:     '',
    ports:    def.defaultPorts,
  };
  // 交换机默认层级
  if (DefaultSwitchLayer[type]) {
    data.switchLayer = DefaultSwitchLayer[type];
  }
  return data;
}

/**
 * 构建设备面板模型数据 (分类用)
 */
function buildPaletteData() {
  const result = [];
  DeviceCategories.forEach(function(cat) {
    cat.types.forEach(function(type) {
      result.push({
        key:      'pal_' + type,
        category: type,
        type:     type,
        name:     DeviceTypeDefs[type].label,
      });
    });
  });
  return result;
}

/**
 * 常用案例预设 (预置拓扑)
 * 每个预设包含 nodes 和 links 数组，坐标已排好
 */
const PresetTopologies = {
  'campus_small': {
    label: '中小型园区网络',
    desc: '路由器 + 核心/汇聚/接入交换机 + PC 终端',
    nodes: [
      { type: 'router',       x: 400, y: 60,  name: '出口路由器' },
      { type: 'core_switch',  x: 400, y: 180, name: '核心交换机' },
      { type: 'agg_switch',   x: 200, y: 320, name: '汇聚交换机-A' },
      { type: 'agg_switch',   x: 600, y: 320, name: '汇聚交换机-B' },
      { type: 'acc_switch',   x: 100, y: 460, name: '接入交换机-1' },
      { type: 'acc_switch',   x: 300, y: 460, name: '接入交换机-2' },
      { type: 'acc_switch',   x: 500, y: 460, name: '接入交换机-3' },
      { type: 'acc_switch',   x: 700, y: 460, name: '接入交换机-4' },
      { type: 'pc',           x: 50,  y: 580, name: 'PC-01' },
      { type: 'pc',           x: 150, y: 580, name: 'PC-02' },
      { type: 'pc',           x: 250, y: 580, name: 'PC-03' },
      { type: 'pc',           x: 550, y: 580, name: 'PC-04' },
      { type: 'pc',           x: 650, y: 580, name: 'PC-05' },
      { type: 'server',       x: 750, y: 580, name: '文件服务器' },
    ],
    links: [
      { from: 0, to: 1 },
      { from: 1, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 2, to: 5 },
      { from: 3, to: 6 }, { from: 3, to: 7 },
      { from: 4, to: 8 }, { from: 4, to: 9 },
      { from: 5, to: 10 },
      { from: 6, to: 11 }, { from: 6, to: 12 },
      { from: 7, to: 13 },
    ],
  },
  'surveillance': {
    label: '监控网络',
    desc: '路由器 + 接入交换机 + 摄像头 + NVR',
    nodes: [
      { type: 'router',      x: 400, y: 60,  name: '出口路由器' },
      { type: 'acc_switch',  x: 400, y: 200, name: '监控交换机' },
      { type: 'nvr',         x: 200, y: 340, name: 'NVR-主控' },
      { type: 'camera',      x: 50,  y: 480, name: '摄像头-01' },
      { type: 'camera',      x: 180, y: 480, name: '摄像头-02' },
      { type: 'camera',      x: 310, y: 480, name: '摄像头-03' },
      { type: 'camera',      x: 440, y: 480, name: '摄像头-04' },
      { type: 'camera',      x: 570, y: 480, name: '摄像头-05' },
      { type: 'camera',      x: 700, y: 480, name: '摄像头-06' },
    ],
    links: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 }, { from: 1, to: 4 }, { from: 1, to: 5 },
      { from: 1, to: 6 }, { from: 1, to: 7 }, { from: 1, to: 8 },
    ],
  },
  'office': {
    label: '办公网络',
    desc: '路由器 + 汇聚/接入交换机 + PC + 服务器',
    nodes: [
      { type: 'router',      x: 400, y: 60,  name: '出口路由器' },
      { type: 'agg_switch',  x: 400, y: 200, name: '汇聚交换机' },
      { type: 'acc_switch',  x: 200, y: 340, name: '接入交换机-A' },
      { type: 'acc_switch',  x: 600, y: 340, name: '接入交换机-B' },
      { type: 'pc',          x: 80,  y: 480, name: 'PC-01' },
      { type: 'pc',          x: 200, y: 480, name: 'PC-02' },
      { type: 'pc',          x: 320, y: 480, name: 'PC-03' },
      { type: 'pc',          x: 520, y: 480, name: 'PC-04' },
      { type: 'pc',          x: 640, y: 480, name: 'PC-05' },
      { type: 'server',      x: 760, y: 480, name: '应用服务器' },
    ],
    links: [
      { from: 0, to: 1 },
      { from: 1, to: 2 }, { from: 1, to: 3 },
      { from: 2, to: 4 }, { from: 2, to: 5 }, { from: 2, to: 6 },
      { from: 3, to: 7 }, { from: 3, to: 8 }, { from: 3, to: 9 },
    ],
  },
};

// 自增 ID 计数器
let _idCounter = 1;
// 设备序号计数器 (同类设备拖动多次自动编号)
var _deviceCounters = {};
function _nextDeviceNum(type) {
  if (!_deviceCounters[type]) _deviceCounters[type] = 0;
  return ++_deviceCounters[type];
}
function nextId() { return 'node_' + (_idCounter++); }
function resetIdCounter() { _idCounter = 1; _deviceCounters = {}; }
function setMaxId(arr) {
  let max = 0;
  arr.forEach(function(n) {
    const m = n.key && n.key.match(/node_(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  _idCounter = max + 1;
}

/* ============================================================
   标准化配置对象 — 命令模板统一入参
   从节点数据和连线信息拼装，供所有厂商模板使用
   ============================================================ */
/**
 * 构建传给命令模板的标准化设备配置对象
 * @param {object} nodeData   — 节点的 model data
 * @param {array}  connections — getNodeConnections() 返回的连线数组
 * @returns {object} 标准配置对象
 *
 * 返回结构:
 *   type        — 设备类型标识 (router / core_switch / …)
 *   deviceClass — 模板类别 (router / switch / endpoint)
 *   name        — 自定义设备名称
 *   vendor      — 厂商标识 (huawei / h3c / cisco / …)
 *   ip          — 管理 IP
 *   gateway     — 网关地址
 *   mask        — 子网掩码
 *   vlan        — VLAN ID
 *   ports       — 端口总数
 *   connections — 互联端口列表 [{localPort, peerName, peerType, peerPort}, …]
 *   features    — 已勾选功能映射 {dhcp: true, stp: false, …}
 */
function buildDeviceConfig(nodeData, connections) {
  const dClass = DeviceClassMap[nodeData.type] || 'endpoint';

  // 收集功能勾选状态
  const features = {};
  FeatureList.forEach(function(f) {
    features[f.slug] = !!nodeData['feature_' + f.slug];
  });

  return {
    id:          nodeData.id || '',
    type:        nodeData.type,
    deviceClass: dClass,
    name:        nodeData.name || '',
    vendor:      nodeData.vendor || '',
    ip:          nodeData.ip || '',
    gateway:     nodeData.gateway || '',
    mask:        nodeData.mask || '255.255.255.0',
    vlan:        nodeData.vlan || '',
    switchLayer: nodeData.switchLayer || DefaultSwitchLayer[nodeData.type] || 'l2',
    customVlans: nodeData.customVlans || [],
    ports:       nodeData.ports || 0,
    connections: connections || [],
    features:    features,
  };
}

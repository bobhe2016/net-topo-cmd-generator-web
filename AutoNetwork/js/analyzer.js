/* ============================================================
   analyzer.js — 拓扑结构分析引擎
   分析全图连线关系, 为命令生成提供分类后的设备配置对象
   ============================================================ */

/**
 * 设备层级权重 (越小越高层)
 *   router=0 → core_switch=1 → agg_switch=2 → acc_switch=3 → endpoint=4
 */
function _hierarchyLevel(type) {
  var map = { router:0, core_switch:1, agg_switch:2, acc_switch:3, pc:4, server:4, camera:4, nvr:4 };
  return map[type] != null ? map[type] : 4;
}

function _isEndpoint(type) {
  return ['pc','server','camera','nvr'].indexOf(type) >= 0;
}

function _isSwitch(type) {
  return ['core_switch','agg_switch','acc_switch'].indexOf(type) >= 0;
}

/**
 * 分析整个拓扑, 为每个设备生成增强配置对象
 * @param {G6.Graph} g
 * @returns {object} { devices: [enhancedConfig, ...], edges: [...] }
 *
 * 每个 enhancedConfig 在 buildDeviceConfig 基础上追加:
 *   uplinks:    [{localPort, peerName, peerType, peerId, peerPort}, ...]
 *   downlinks:  [{...}]    — 连接到较低层设备
 *   endpoints:  [{...}]    — 直接连接的终端
 *   peerDevices: [{...}]   — 连接的同类网络设备
 *   isCore:     bool       — 是否为拓扑中最上游的交换机
 *   isRoot:     bool       — 是否直连路由器
 *   vlansOnDevice: [str]   — 该设备上涉及的 VLAN 列表
 */
function analyzeTopology(g) {
  if (!g) return { devices: [], edges: [] };

  // 1. 收集节点数据
  var nodeMap = {};
  g.getNodes().forEach(function(node) {
    var m = node.getModel();
    var d = m.data || {};
    nodeMap[m.id] = {
      id:          m.id,
      type:        m.type || d.type,
      name:        m.label || d.name || '',
      vendor:      d.vendor || '',
      ip:          d.ip || '',
      gateway:     d.gateway || '',
      mask:        d.mask || '255.255.255.0',
      vlan:        d.vlan || '',
      switchLayer: d.switchLayer || DefaultSwitchLayer[d.type] || 'l2',
      customVlans: d.customVlans || [],  // 批量 VLAN 定义 [{id,name,desc,ip,mask}, ...]
      ports:       d.ports || (DeviceTypeDefs[d.type] ? DeviceTypeDefs[d.type].defaultPorts : 0),
      features:    {},
      uplinks:     [],
      downlinks:   [],
      endpoints:   [],
      peerDevices: [],
    };
    FeatureList.forEach(function(f) { nodeMap[m.id].features[f.slug] = !!d['feature_' + f.slug]; });
  });

  // 2. 遍历连线, 按层级分类
  g.getEdges().forEach(function(edge) {
    var ed = edge.getModel();
    var src = nodeMap[ed.source], tgt = nodeMap[ed.target];
    if (!src || !tgt) return;

    var srcPort = (ed.data && ed.data.fromPort) || 0;
    var tgtPort = (ed.data && ed.data.toPort)   || 0;
    var srcLink = { localPort: srcPort, peerName: tgt.name, peerType: tgt.type, peerId: tgt.id, peerPort: tgtPort, peerVlan: tgt.vlan || '' };
    var tgtLink = { localPort: tgtPort, peerName: src.name, peerType: src.type, peerId: src.id, peerPort: srcPort, peerVlan: src.vlan || '' };

    // 分类 src → tgt
    _classifyLink(src, tgt, srcLink);
    // 分类 tgt → src
    _classifyLink(tgt, src, tgtLink);
  });

  // 3. 补充派生字段
  var switchNodes = [];
  Object.keys(nodeMap).forEach(function(id) {
    var nd = nodeMap[id];
    nd.isRoot = nd.uplinks.some(function(l) { return l.peerType === 'router'; });
    // 收集设备上涉及的 VLAN
    var vlans = [];
    if (nd.vlan) vlans.push(nd.vlan);
    nd.endpoints.forEach(function(ep) {
      var epNode = nodeMap[ep.peerId];
      if (epNode && epNode.vlan && vlans.indexOf(epNode.vlan) < 0) vlans.push(epNode.vlan);
    });
    nd.downlinks.forEach(function(dl) {
      var dlNode = nodeMap[dl.peerId];
      if (dlNode && dlNode.vlan && vlans.indexOf(dlNode.vlan) < 0) vlans.push(dlNode.vlan);
    });
    nd.vlansOnDevice = vlans;
    if (_isSwitch(nd.type)) switchNodes.push(nd);
  });

  // 4. 标记核心交换机 (层级最低的交换机 = 最接近路由器)
  switchNodes.sort(function(a, b) { return _hierarchyLevel(a.type) - _hierarchyLevel(b.type); });
  if (switchNodes.length > 0) {
    var minLevel = _hierarchyLevel(switchNodes[0].type);
    switchNodes.forEach(function(sw) {
      sw.isCore = _hierarchyLevel(sw.type) === minLevel;
    });
  }

  // 5. L2 接入交换机 VLAN 反推: 从接入终端 + 上层交换机汇总
  Object.keys(nodeMap).forEach(function(id) {
    var nd = nodeMap[id];
    if (!_isSwitch(nd.type)) return;
    if (nd.switchLayer !== 'l2') return;

    var derived = [];
    // 1) 从接入终端反推 VLAN
    nd.endpoints.forEach(function(ep) {
      var epNode = nodeMap[ep.peerId];
      if (epNode && epNode.vlan && derived.indexOf(epNode.vlan) < 0) derived.push(epNode.vlan);
    });
    // 2) 从上层交换机 (uplink) 反推 — 完整 VLAN 列表
    nd.uplinks.forEach(function(ul) {
      var ulNode = nodeMap[ul.peerId];
      if (!ulNode) return;
      var ulVlans = _getNodeVlanList(ulNode);
      ulVlans.forEach(function(v) { if (derived.indexOf(v) < 0) derived.push(v); });
    });
    // 3) 从同级交换机反推
    nd.peerDevices.forEach(function(pd) {
      var pdNode = nodeMap[pd.peerId];
      if (!pdNode) return;
      var pdVlans = _getNodeVlanList(pdNode);
      pdVlans.forEach(function(v) { if (derived.indexOf(v) < 0) derived.push(v); });
    });
    // 4) 从下行交换机反推 (L2 级联场景)
    nd.downlinks.forEach(function(dl) {
      var dlNode = nodeMap[dl.peerId];
      if (!dlNode) return;
      var dlVlans = _getNodeVlanList(dlNode);
      dlVlans.forEach(function(v) { if (derived.indexOf(v) < 0) derived.push(v); });
    });

    // 5) 如果用户手动添加了 VLAN ID, 合并进来
    if (nd.customVlans && nd.customVlans.length > 0) {
      nd.customVlans.forEach(function(v) { if (derived.indexOf(v.id) < 0) derived.push(v.id); });
    }

    // 6) 兜底: 从步骤 3 计算的 vlansOnDevice 补充
    if (nd.vlansOnDevice && nd.vlansOnDevice.length > 0) {
      nd.vlansOnDevice.forEach(function(v) { if (derived.indexOf(v) < 0) derived.push(v); });
    }

    nd.derivedVlans = derived;
    // 反推结果覆盖 vlansOnDevice
    nd.vlansOnDevice = derived;
  });

  // 6. 收集全拓扑 VLAN 列表 (汇聚层 trunk 放行用)
  var allTopologyVlans = [];
  Object.keys(nodeMap).forEach(function(id) {
    var nd = nodeMap[id];
    var vlist = _getNodeVlanList(nd);
    vlist.forEach(function(v) { if (allTopologyVlans.indexOf(v) < 0) allTopologyVlans.push(v); });
  });

  // 7. L2 交换机推导默认网关 (取 uplink 三层设备的 IP)
  Object.keys(nodeMap).forEach(function(id) {
    var nd = nodeMap[id];
    if (!_isSwitch(nd.type) || nd.switchLayer !== 'l2') return;
    for (var k = 0; k < nd.uplinks.length; k++) {
      var uplinkNode = nodeMap[nd.uplinks[k].peerId];
      if (uplinkNode && uplinkNode.ip) { nd.derivedGateway = uplinkNode.ip; break; }
    }
  });

  var devices = [];
  Object.keys(nodeMap).forEach(function(id) {
    // 把全拓扑 VLAN 列表注入每个设备
    nodeMap[id].allTopologyVlans = allTopologyVlans;
    devices.push(nodeMap[id]);
  });

  return { devices: devices, allTopologyVlans: allTopologyVlans, edges: g.getEdges().map(function(e) { return e.getModel(); }) };
}

/** 获取某个节点的完整 VLAN 列表 */
function _getNodeVlanList(nd) {
  var list = [];
  // 合并 customVlans + vlansOnDevice (不用 else if, 避免遗漏)
  if (nd.customVlans && nd.customVlans.length > 0) {
    nd.customVlans.forEach(function(v) { if (list.indexOf(v.id) < 0) list.push(v.id); });
  }
  if (nd.vlansOnDevice && nd.vlansOnDevice.length > 0) {
    nd.vlansOnDevice.forEach(function(v) { if (list.indexOf(v) < 0) list.push(v); });
  }
  if (nd.vlan && list.indexOf(nd.vlan) < 0) list.push(nd.vlan);
  return list;
}

/** 将一条 link 分类到 uplink / downlink / endpoint */
function _classifyLink(selfNode, peerNode, link) {
  if (_isEndpoint(peerNode.type)) {
    selfNode.endpoints.push(link);
  } else if (_isEndpoint(selfNode.type)) {
    // 终端连接网络设备 → 对端是 uplink
    selfNode.uplinks.push(link);
  } else if (_hierarchyLevel(selfNode.type) > _hierarchyLevel(peerNode.type)) {
    // self 层级更低 → peer 是上级
    selfNode.uplinks.push(link);
  } else if (_hierarchyLevel(selfNode.type) < _hierarchyLevel(peerNode.type)) {
    // self 层级更高 → peer 是下级
    selfNode.downlinks.push(link);
  } else {
    // 同层级设备互联
    selfNode.peerDevices.push(link);
  }
}

/**
 * 根据分析结果, 为单个设备构建传给模板的标准配置对象
 */
function buildEnhancedConfig(deviceAnalysis) {
  return {
    id:          deviceAnalysis.id,
    type:        deviceAnalysis.type,
    deviceClass: DeviceClassMap[deviceAnalysis.type] || 'endpoint',
    name:        deviceAnalysis.name,
    vendor:      deviceAnalysis.vendor,
    ip:          deviceAnalysis.ip,
    gateway:     deviceAnalysis.gateway,
    mask:        deviceAnalysis.mask,
    vlan:        deviceAnalysis.vlan,
    switchLayer: deviceAnalysis.switchLayer,
    customVlans: deviceAnalysis.customVlans,
    derivedVlans: deviceAnalysis.derivedVlans || [],
    allTopologyVlans: deviceAnalysis.allTopologyVlans || [],
    derivedGateway: deviceAnalysis.derivedGateway || '',
    ports:       deviceAnalysis.ports,
    features:    deviceAnalysis.features,
    uplinks:     deviceAnalysis.uplinks,
    downlinks:   deviceAnalysis.downlinks,
    endpoints:   deviceAnalysis.endpoints,
    peerDevices: deviceAnalysis.peerDevices,
    isCore:      deviceAnalysis.isCore,
    isRoot:      deviceAnalysis.isRoot,
    vlansOnDevice: deviceAnalysis.vlansOnDevice,
  };
}

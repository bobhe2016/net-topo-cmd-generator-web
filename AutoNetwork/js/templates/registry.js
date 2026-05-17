/* ============================================================
   registry.js — 命令模板注册中心 + 匹配引擎
   按 ${vendor}_${deviceClass} 存储模板函数，
   提供 generate / generateAll 两个对外入口
   ============================================================ */

const CmdTpl = (function() {
  'use strict';

  // 内部模板表: key = "vendor_deviceClass" (例: "huawei_router")
  const _templates = {};

  /** 注册模板
   *  @param {string}   vendor      — 厂商标识 (huawei / h3c / cisco / …)
   *  @param {string}   deviceClass — 设备类别 (router / switch / endpoint)
   *  @param {function} fn          — 模板函数, 接收标准配置对象, 返回命令字符串
   */
  function register(vendor, deviceClass, fn) {
    const key = vendor + '_' + deviceClass;
    _templates[key] = fn;
  }

  /** 查找模板 (先精确匹配, 再回退同类任意厂商, 最后回退通用模板)
   *  @returns {function|null}
   */
  function _lookup(vendor, deviceClass) {
    // 1. 精确匹配
    const exactKey = vendor + '_' + deviceClass;
    if (_templates[exactKey]) return _templates[exactKey];

    // 2. 同类任意厂商 (取第一个注册的)
    const fallbackKey = Object.keys(_templates).find(function(k) {
      return k.endsWith('_' + deviceClass);
    });
    if (fallbackKey) return _templates[fallbackKey];

    // 3. 通用回退
    if (_templates['_default']) return _templates['_default'];

    return null;
  }

  /** 生成单设备命令
   *  @param {string} vendor      — 厂商标识
   *  @param {string} deviceClass — 设备类别
   *  @param {object} config      — buildDeviceConfig() 返回的标准配置对象
   *  @returns {string} 命令文本
   */
  function generate(vendor, deviceClass, config) {
    if (!vendor) {
      return '# 错误: 未选择厂商，请在右侧面板中选择设备厂商后再生成命令。\n';
    }

    // 终端/监控设备无需 CLI 命令
    if (vendor === 'endpoint' || deviceClass === 'endpoint') {
      return '# [跳过] ' + (config.name || '终端设备') + ' — 终端/监控设备无需生成 CLI 命令。\n';
    }

    const fn = _lookup(vendor, deviceClass);
    if (!fn) {
      return '# 错误: 未找到匹配的命令模板\n' +
        '# 厂商: ' + vendor + ' | 设备类别: ' + deviceClass + '\n' +
        '# 已注册模板: ' + (Object.keys(_templates).join(', ') || '无') + '\n' +
        '# 请确认对应模板文件已加载。\n';
    }

    try {
      return fn(config);
    } catch (err) {
      return '# 错误: 模板执行异常\n# ' + err.message + '\n';
    }
  }

  /** 批量生成 — 遍历图中所有节点, 逐个调用模板
   *  @param {object} diagram — GoJS Diagram 实例
   *  @returns {string} 所有设备的命令拼接
   */
  function generateAll(g) {
    if (!g || g.getNodes().length === 0) {
      return '# 画布中没有设备，请先拖入设备并连线。\n';
    }

    // 使用拓扑分析引擎
    var analysis = analyzeTopology(g);
    var parts = [];
    var now = new Date().toLocaleString('zh-CN');
    var totalDevices = analysis.devices.length;
    var totalEdges = (g.getEdges && g.getEdges().length) || 0;

    parts.push('! ============================================================');
    parts.push('!  批量配置命令 — 生成时间: ' + now);
    parts.push('!  设备总数: ' + totalDevices + ' | 连线总数: ' + totalEdges);
    parts.push('!  分析引擎: 已分类 uplink / downlink / endpoint / peer');
    parts.push('! ============================================================');
    parts.push('');

    analysis.devices.forEach(function(dev) {
      var vendor = dev.vendor || '';
      var dClass = DeviceClassMap[dev.type] || 'endpoint';

      // 终端/监控设备跳过
      if (vendor === 'endpoint' || dClass === 'endpoint') return;

      var config = buildEnhancedConfig(dev);

      // 强制注入 customVlans: localStorage (用 dev.id) > 模型数据
      var savedVlans = null;
      try { if (dev.id) { var raw = localStorage.getItem('vlan_' + dev.id); if (raw) savedVlans = JSON.parse(raw); } } catch(e) {}
      if (!savedVlans || savedVlans.length === 0) savedVlans = config.customVlans;
      if (!savedVlans || savedVlans.length === 0) savedVlans = window.__savedCustomVlans;
      if (savedVlans && savedVlans.length > 0) config.customVlans = savedVlans;
      var nodeItem = g.findById(dev.id);
      if (nodeItem) {
        var nodeData = nodeItem.getModel().data || {};
        if (nodeData.switchLayer) config.switchLayer = nodeData.switchLayer;
      }

      // 设备分隔标题
      parts.push('');
      parts.push('! ══════════════════════════════════════');
      parts.push('!  ' + (config.name || dev.id));
      parts.push('!  类型: ' + (DeviceTypeDefs[config.type] ? DeviceTypeDefs[config.type].label : config.type) +
        ' | 厂商: ' + (vendor || '未选') +
        ' | IP: ' + (config.ip || '未填') +
        ' | VLAN: ' + (config.vlan || '未填'));
      if (config.isCore)  parts.push('!  角色: 核心交换机');
      if (config.isRoot)  parts.push('!  位置: 直连路由器');
      if (config.uplinks && config.uplinks.length > 0)
        parts.push('!  上行: ' + config.uplinks.length + ' 条 trunk (→' + config.uplinks.map(function(l){return l.peerName;}).join(', ') + ')');
      if (config.downlinks && config.downlinks.length > 0)
        parts.push('!  下行: ' + config.downlinks.length + ' 条 trunk (→' + config.downlinks.map(function(l){return l.peerName;}).join(', ') + ')');
      if (config.endpoints && config.endpoints.length > 0)
        parts.push('!  接入终端: ' + config.endpoints.length + ' 台 (' + config.endpoints.map(function(l){return l.peerName;}).join(', ') + ')');
      parts.push('! ══════════════════════════════════════');
      parts.push('');

      if (!vendor) {
        parts.push('# [跳过] 未选择厂商，无法生成命令。');
      } else {
        parts.push(generate(vendor, dClass, config));
      }
    });

    parts.push('');
    parts.push('! ============================================================');
    parts.push('!  批量配置命令结束');
    parts.push('! ============================================================');

    return parts.join('\n');
  }

  /** 获取已注册模板列表 (调试用) */
  function listTemplates() {
    return Object.keys(_templates).slice();
  }

  // 公开 API
  return {
    register:      register,
    generate:      generate,
    generateAll:   generateAll,
    listTemplates: listTemplates,
    _lookup:       _lookup,
  };
})();

/* ============================================================
   huawei_switch.js — 华为交换机 VRP 命令模板
   L3: VLANIF 网关 + 路由  |  L2: 仅 VLAN + 管理 IP
   ============================================================ */
CmdTpl.register('huawei', 'switch', function(cfg) {
  var out = [], prefix = 'GigabitEthernet0/0/';
  var vlans = _hvlans(cfg), mgmtVlan = '1';
  // Trunk: 汇聚层放行全拓扑 VLAN, 接入层仅放行本设备 VLAN (均不含 VLAN 1)
  var aggVlans = (cfg.allTopologyVlans && cfg.allTopologyVlans.length > 0) ? cfg.allTopologyVlans : vlans;
  var trunkVlans = aggVlans.filter(function(v) { return String(v) !== '1'; });
  var layer = cfg.switchLayer || 'l3';
  var isL3 = (layer === 'l3');
  // 1. localStorage  2. cfg.customVlans  3. 全局备份
  var saved = null;
  try { if (cfg.id) { var raw = localStorage.getItem('vlan_' + cfg.id); if (raw) saved = JSON.parse(raw); } } catch(e) {}
  var customVlans = (saved && saved.length > 0) ? saved
    : (cfg.customVlans && cfg.customVlans.length > 0) ? cfg.customVlans
    : (window.__savedCustomVlans && window.__savedCustomVlans.length > 0) ? window.__savedCustomVlans
    : [];
  var hasCustom = customVlans.length > 0;

  out.push('system-view');
  out.push('sysname ' + (cfg.name || 'Switch'));
  out.push('');

  // ── 全局 VLAN 创建 ──
  out.push('# VLAN 批量创建 (VLAN 1 默认存在, 不重复创建)');
  var batchVlans = vlans.filter(function(v) { return String(v) !== '1'; });
  if (batchVlans.length > 0) out.push('vlan batch ' + batchVlans.join(' '));
  if (hasCustom) {
    customVlans.forEach(function(v) {
      if (String(v.id) === '1') return;
      if (v.name) out.push('vlan ' + v.id + '\n name ' + v.name);
    });
  }
  out.push('');

  // ==============================
  // L3 三层交换机: VLANIF 网关 + IP
  // ==============================
  if (isL3) {
    // VLAN 1 管理接口
    out.push('# 管理 VLAN 1');
    out.push('interface Vlanif 1');
    out.push(' ip address ' + (cfg.ip || '192.168.1.1') + ' ' + (cfg.mask || '255.255.255.0'));
    out.push('');

    // 业务 VLANIF (优先使用用户自定义)
    if (hasCustom) {
      customVlans.forEach(function(v) {
        if (String(v.id) === '1') return;
        out.push('# ' + (v.desc || v.name || 'VLAN ' + v.id));
        out.push('interface Vlanif ' + v.id);
        out.push(' ip address ' + (v.ip || _gatewayForVlan(cfg.ip, v.id)) + ' ' + (v.mask || cfg.mask || '255.255.255.0'));
        out.push('');
      });
    } else {
      vlans.forEach(function(v) {
        if (String(v) === '1') return;
        var ip = _findCustomIp(cfg, v) || _gatewayForVlan(cfg.ip, String(v));
        out.push('# VLAN ' + v + ' 网关');
        out.push('interface Vlanif ' + v);
        out.push(' ip address ' + ip + ' ' + (cfg.mask || '255.255.255.0'));
        out.push('');
      });
    }

    // 默认路由 (仅 L2 接入交换机写管理网关, L3 核心/汇聚自身就是网关)
    if (!isL3 && cfg.gateway) {
      out.push('# 管理默认路由');
      out.push('ip route-static 0.0.0.0 0.0.0.0 ' + cfg.gateway);
      out.push('');
    }

    // DHCP 中继 (VLANIF 下启用)
    if (cfg.features && cfg.features.dhcp) {
      out.push('# DHCP 中继');
      out.push('dhcp enable');
      vlans.forEach(function(v) {
        out.push('interface Vlanif ' + v);
        out.push(' dhcp select relay');
        out.push(' dhcp relay server-ip ' + (cfg.gateway || cfg.ip || '192.168.1.1'));
      });
      out.push('');
    }

  // ==============================
  // L2 二层交换机: 仅管理 IP
  // ==============================
  } else {
    out.push('# L2 管理 VLAN 1');
    out.push('interface Vlanif 1');
    if (cfg.ip) {
      out.push(' ip address ' + cfg.ip + ' ' + cfg.mask);
    } else {
      out.push(' ip address 192.168.1.254 255.255.255.0');
    }
    out.push('');
    // L2 默认路由: 优先用户设置的网关, 其次分析器从 uplink L3 推导
    var l2gw = cfg.gateway || cfg.derivedGateway || '';
    if (l2gw) {
      out.push('# 管理默认路由 → ' + l2gw);
      out.push('ip route-static 0.0.0.0 0.0.0.0 ' + l2gw);
      out.push('');
    }
  }

  // ── 上行 Trunk (共用的二层端口配置) ──
  var allUp = (cfg.uplinks || []).concat(cfg.peerDevices || []);
  allUp.forEach(function(link) {
    out.push('# 上行 Trunk: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' description Uplink_to_' + link.peerName);
    out.push(' port link-type trunk');
    out.push(' port trunk allow-pass vlan ' + (trunkVlans.length > 0 ? trunkVlans.join(' ') : '1'));
    out.push(' undo shutdown');
    out.push('');
  });

  // ── 下行 Trunk ──
  (cfg.downlinks || []).forEach(function(link) {
    out.push('# 下行 Trunk: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' description Downlink_to_' + link.peerName);
    out.push(' port link-type trunk');
    out.push(' port trunk allow-pass vlan ' + (trunkVlans.length > 0 ? trunkVlans.join(' ') : '1'));
    out.push(' undo shutdown');
    out.push('');
  });

  // ── 接入端口 ──
  (cfg.endpoints || []).forEach(function(link) {
    var epVlan = _hepVlan(cfg, link);
    out.push('# 接入: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' description Access_to_' + link.peerName);
    out.push(' port link-type access');
    out.push(' port default vlan ' + epVlan);
    out.push(' stp edged-port enable');
    out.push(' undo shutdown');
    if (cfg.features && cfg.features.anti_private) { out.push(' port-security enable\n port-security max-mac-num 1'); }
    if (cfg.features && cfg.features.no_intercom)   { out.push(' port-isolate enable'); }
    out.push('');
  });

  // ── STP ──
  if (cfg.features && cfg.features.stp) {
    out.push('# STP 生成树');
    out.push('stp enable');
    if (cfg.isCore && isL3) {
      out.push('stp mode stp');
      out.push('stp root primary');
    } else {
      out.push('stp bpdu-protection');
    }
    out.push('');
  }

  // ── 端口聚合 (仅 L3 推荐) ──
  if (cfg.features && cfg.features.port_agg && isL3) {
    out.push('# 端口聚合');
    out.push('interface Eth-Trunk 1');
    out.push(' port link-type trunk');
    out.push(' port trunk allow-pass vlan ' + (trunkVlans.length > 0 ? trunkVlans.join(' ') : '1'));
    out.push(' mode lacp-static');
    out.push('');
  }

  // ── SNMP ──
  if (cfg.features && cfg.features.remote_mgmt) {
    out.push('# SNMP 远程管理');
    out.push('snmp-agent');
    out.push('snmp-agent community read public');
    out.push('snmp-agent sys-info version v2c');
    out.push('');
  }

  out.push('return');
  if (isL3) out.push('# 三层交换机部署完成 — VLANIF 已配置，VLAN 间三层互通');
  else      out.push('# 二层交换机部署完成 — VLAN 划分完成，管理 IP 仅用于远程访问');
  out.push('');
  return out.join('\n');
});

function _hvlans(cfg) {
  var ids;
  var cv = null;
  try { if (cfg.id) { var raw = localStorage.getItem('vlan_' + cfg.id); if (raw) cv = JSON.parse(raw); } } catch(e) {}
  if (!cv || cv.length === 0) cv = cfg.customVlans || window.__savedCustomVlans;

  // L2 交换机: 全拓扑 VLAN + 手动追加合并, 确保多台接入交换机统一
  if (cfg.switchLayer === 'l2') {
    ids = (cfg.allTopologyVlans && cfg.allTopologyVlans.length > 0) ? cfg.allTopologyVlans.slice() : (cfg.derivedVlans || []).slice();
    if (cv && cv.length > 0) { cv.forEach(function(v) { if (ids.indexOf(v.id) < 0) ids.push(v.id); }); }
  // L3 / 路由器: 用户配置优先
  } else if (cv && cv.length > 0) {
    ids = cv.map(function(v) { return v.id; });
  } else if (cfg.derivedVlans && cfg.derivedVlans.length > 0) {
    ids = cfg.derivedVlans.slice();
  } else if (cfg.vlansOnDevice && cfg.vlansOnDevice.length > 0) {
    ids = cfg.vlansOnDevice.slice();
  } else if (cfg.vlan) {
    ids = cfg.vlan.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  } else {
    ids = ['1'];
  }
  // 按数字排序 + VLAN 1 排最前
  ids = ids.map(function(v){return parseInt(v,10);}).filter(function(v){return v>=1&&v<=4094;});
  ids.sort(function(a,b){return a-b;});
  if (ids.indexOf(1) < 0) ids.unshift(1);
  return ids.map(function(v){return String(v);});
}
function _hepVlan(cfg, link) {
  // 优先使用对端设备自身设置的 VLAN
  if (link.peerVlan) return link.peerVlan;
  if (customVlans && customVlans.length > 0) return customVlans[0].id;
  return (link.peerType === 'camera' || link.peerType === 'nvr') && cfg.vlansOnDevice && cfg.vlansOnDevice.length > 1 ? cfg.vlansOnDevice[1] : (cfg.vlan || '1');
}
function _gatewayForVlan(ip, vlanId) {
  var vid = parseInt(vlanId, 10);
  if (isNaN(vid) || vid < 1 || vid > 4094) vid = 1;
  // 保持设备 IP 前缀, 第三段=vid/256, 第四段=vid%256
  var seg3 = Math.floor(vid / 256);
  var seg4 = vid % 256;
  if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    var p = ip.split('.');
    p[2] = String(parseInt(p[2],10) + seg3);
    p[3] = String(seg4);
    return p.join('.');
  }
  return '192.168.' + seg3 + '.' + seg4;
}
function _isValidUnicastIP(ip) { if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false; var p=ip.split("."), o1=parseInt(p[0],10); if (o1===0||o1===127||o1>=224) return false; return p.every(function(o){var n=parseInt(o,10);return n>=0&&n<=255;}); }
function _findCustomIp(cfg, vlanId) {
  var cv = null;
  try { if (cfg.id) { var raw = localStorage.getItem('vlan_' + cfg.id); if (raw) cv = JSON.parse(raw); } } catch(e) {}
  if (!cv || cv.length === 0) cv = cfg.customVlans || window.__savedCustomVlans || [];
  for (var i = 0; i < cv.length; i++) {
    if (String(cv[i].id) === String(vlanId) && cv[i].ip) {
      var ip = cv[i].ip.trim();
      // 校验 IP 格式: x.x.x.x, 每段 0-255
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        if (_isValidUnicastIP(ip)) return ip;
      }
    }
  }
  return null;
}

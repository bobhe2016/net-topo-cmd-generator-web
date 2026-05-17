/* ============================================================
   huawei_router.js — 华为路由器 VRP 命令模板
   根据拓扑分析结果生成接口/路由/NAT/DHCP/ACL 命令
   ============================================================ */
CmdTpl.register('huawei', 'router', function(cfg) {
  var out = [];
  var prefix = 'GigabitEthernet0/0/';
  var mgmtVlan = cfg.vlan || '1';

  out.push('system-view');
  out.push('sysname ' + (cfg.name || 'Router'));
  out.push('');

  // ── 管理 VLAN ──
  out.push('# 管理 VLAN');
  out.push('vlan ' + mgmtVlan);
  out.push('interface Vlanif ' + mgmtVlan);
  if (cfg.ip) {
    out.push(' ip address ' + cfg.ip + ' ' + cfg.mask);
  }
  out.push('');

  // ── 下行接口 (连接交换机) ──
  var allDownlinks = (cfg.downlinks || []).concat(cfg.peerDevices || []);
  allDownlinks.forEach(function(link) {
    out.push('# 下行接口: ' + link.peerName + ' (' + (link.peerType || '') + ')');
    out.push('interface ' + prefix + link.localPort);
    out.push(' description To_' + link.peerName);
    out.push(' ip address ' + _subnetFromIP(cfg.ip, link.localPort) + ' ' + (cfg.mask || '255.255.255.0'));
    out.push(' undo shutdown');
    out.push('');
  });

  // ── 默认路由 ──
  if (cfg.gateway) {
    out.push('# 默认路由');
    out.push('ip route-static 0.0.0.0 0.0.0.0 ' + cfg.gateway);
    out.push('');
  }

  // ── DHCP 服务 ──
  if (cfg.features && cfg.features.dhcp) {
    out.push('# DHCP 服务');
    out.push('dhcp enable');
    out.push('ip pool vlan' + mgmtVlan);
    out.push(' gateway-list ' + (cfg.ip || '192.168.1.1'));
    out.push(' network ' + _networkFromIP(cfg.ip) + ' mask ' + (cfg.mask || '255.255.255.0'));
    out.push(' dns-list 114.114.114.114 8.8.8.8');
    out.push('interface Vlanif ' + mgmtVlan);
    out.push(' dhcp select global');
    out.push('');
  }

  // ── NAT ──
  if (cfg.features && cfg.features.nat) {
    out.push('# NAT 转换');
    out.push('acl number 2000');
    out.push(' rule 5 permit source ' + _networkFromIP(cfg.ip) + ' 0.0.0.255');
    out.push('');
    allDownlinks.forEach(function(link) {
      out.push('interface ' + prefix + link.localPort);
      out.push(' nat outbound 2000');
    });
    out.push('');
  }

  // ── ACL ──
  if (cfg.features && cfg.features.acl) {
    out.push('# ACL 访问控制');
    out.push('acl number 3000');
    out.push(' rule 5 permit ip source ' + _networkFromIP(cfg.ip) + ' 0.0.0.255');
    out.push(' rule 100 deny ip');
    out.push('');
  }

  // ── SNMP ──
  if (cfg.features && cfg.features.snmp) {
    out.push('# SNMP 网管');
    out.push('snmp-agent');
    out.push('snmp-agent community read public');
    out.push('snmp-agent sys-info version v2c');
    out.push('');
  }

  out.push('return');
  out.push('');
  return out.join('\n');
});

/* 辅助: 根据 IP+offset 生成子接口 IP */
function _subnetFromIP(ip, offset) {
  if (!ip) return '172.16.' + offset + '.1';
  var parts = ip.split('.');
  parts[3] = String(parseInt(parts[3] || '1', 10) + offset);
  return parts.join('.');
}
function _networkFromIP(ip) {
  if (!ip) return '192.168.1.0';
  var parts = ip.split('.');
  parts[3] = '0';
  return parts.join('.');
}

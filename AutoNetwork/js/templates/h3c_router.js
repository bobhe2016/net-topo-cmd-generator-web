/* H3C 路由器 Comware 命令模板 */
CmdTpl.register('h3c', 'router', function(cfg) {
  var out = [], prefix = 'GigabitEthernet0/0/', vlan = cfg.vlan || '1';
  out.push('system-view');
  out.push('sysname ' + (cfg.name || 'Router'));
  out.push('');
  out.push('# 管理接口');
  out.push('vlan ' + vlan);
  out.push('interface Vlan-interface ' + vlan);
  if (cfg.ip) out.push(' ip address ' + cfg.ip + ' ' + cfg.mask);
  out.push('');
  (cfg.downlinks || []).concat(cfg.peerDevices || []).forEach(function(link) {
    out.push('# 下行: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' description To_' + link.peerName);
    out.push(' ip address 172.16.' + link.localPort + '.1 ' + (cfg.mask || '255.255.255.0'));
    out.push(' undo shutdown');
    out.push('');
  });
  if (cfg.gateway) { out.push('ip route-static 0.0.0.0 0.0.0.0 ' + cfg.gateway); out.push(''); }
  if (cfg.features && cfg.features.dhcp) {
    out.push('dhcp enable');
    out.push('dhcp server ip-pool vlan' + vlan);
    out.push(' gateway-list ' + (cfg.ip || '192.168.1.1'));
    out.push(' network ' + _net(cfg.ip) + ' mask ' + (cfg.mask || '255.255.255.0'));
    out.push('');
  }
  if (cfg.features && cfg.features.nat) {
    out.push('acl basic 2000');
    out.push(' rule 0 permit source ' + _net(cfg.ip) + ' 0.0.0.255');
    (cfg.downlinks || []).forEach(function(l) { out.push('interface ' + prefix + l.localPort + '\n nat outbound 2000'); });
    out.push('');
  }
  if (cfg.features && cfg.features.snmp) { out.push('snmp-agent\nsnmp-agent community read public\nsnmp-agent sys-info version v2c\n'); }
  out.push('return\n');
  return out.join('\n');
});
function _net(ip) { return ip ? ip.split('.').slice(0,3).join('.')+'.0' : '192.168.1.0'; }

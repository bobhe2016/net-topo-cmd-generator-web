/* TP-Link 路由器命令模板 */
CmdTpl.register('tplink', 'router', function(cfg) {
  var out = [], prefix = 'gigabitEthernet 1/0/', vlan = cfg.vlan || '1';
  out.push('enable');
  out.push('configure');
  out.push('hostname ' + (cfg.name || 'Router'));
  out.push('');
  out.push('# 管理接口');
  out.push('interface vlan ' + vlan);
  if (cfg.ip) out.push(' ip address ' + cfg.ip + ' ' + cfg.mask);
  out.push('');
  (cfg.downlinks || []).concat(cfg.peerDevices || []).forEach(function(link) {
    out.push('# 下行: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' description To_' + link.peerName);
    out.push(' ip address 172.16.' + link.localPort + '.1 ' + (cfg.mask || '255.255.255.0'));
    out.push(' no shutdown');
    out.push('');
  });
  if (cfg.gateway) { out.push('ip route 0.0.0.0 0.0.0.0 ' + cfg.gateway); out.push(''); }
  if (cfg.features && cfg.features.dhcp) {
    out.push('ip dhcp server pool vlan' + vlan);
    out.push(' network ' + _tnet(cfg.ip) + ' ' + (cfg.mask || '255.255.255.0'));
    out.push(' default-gateway ' + (cfg.ip || '192.168.1.1'));
    out.push('');
  }
  if (cfg.features && cfg.features.snmp) { out.push('snmp-server community public ro\n'); }
  out.push('end\n');
  return out.join('\n');
});
function _tnet(ip) { return ip ? ip.split('.').slice(0,3).join('.')+'.0' : '192.168.1.0'; }

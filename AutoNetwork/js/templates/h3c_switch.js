/* H3C 交换机 Comware — L2/L3 双模式 */
CmdTpl.register('h3c', 'switch', function(cfg) {
  var out = [], prefix = 'GigabitEthernet1/0/', vlans = _h3vlans(cfg), layer = cfg.switchLayer || 'l3', isL3 = (layer === 'l3');
  out.push('system-view');
  out.push('sysname ' + (cfg.name || 'Switch'));
  out.push('');
  out.push('# VLAN 批量创建');
  var bv = vlans.filter(function(v) { return String(v) !== '1'; });
  if (bv.length > 0) out.push('vlan ' + bv.join(' '));
  out.push('');
  if (isL3) {
    out.push('# 管理 VLAN 1');
    out.push('interface Vlan-interface 1');
    out.push(' ip address ' + (cfg.ip || '192.168.1.1') + ' ' + (cfg.mask || '255.255.255.0'));
    out.push('');
    vlans.forEach(function(v) {
      if (String(v) === '1') return;
      var ip = _findCustomIp(cfg, v) || _h3gw(cfg.ip, v);
      out.push('# VLAN ' + v + ' 网关');
      out.push('interface Vlan-interface ' + v);
      out.push(' ip address ' + ip + ' ' + (cfg.mask || '255.255.255.0'));
      out.push('');
    });
    // L3 核心/汇聚不写默认路由 (自身即网关)
    if (cfg.features && cfg.features.dhcp) {
      out.push('dhcp enable');
      vlans.forEach(function(v) { out.push('interface Vlan-interface ' + v + '\n dhcp select relay\n dhcp relay server-ip ' + (cfg.gateway || cfg.ip || '192.168.1.1')); });
      out.push('');
    }
  } else {
    out.push('# L2 管理地址');
    out.push('interface Vlan-interface 1');
    out.push(' ip address ' + (cfg.ip || '192.168.1.254') + ' ' + (cfg.mask || '255.255.255.0'));
    out.push('');
    var l2gw=cfg.gateway||cfg.derivedGateway||""; if(l2gw){out.push("# 管理默认路由 → "+l2gw);out.push("ip route-static 0.0.0.0 0.0.0.0 "+l2gw); out.push(''); }
  }
  _h3trunks(out, (cfg.uplinks || []).concat(cfg.peerDevices || []), prefix, vlans);
  _h3trunks(out, cfg.downlinks || [], prefix, vlans);
  (cfg.endpoints || []).forEach(function(link) {
    var v = _h3ep(cfg, link);
    out.push('# 接入: ' + link.peerName);
    out.push('interface ' + prefix + link.localPort);
    out.push(' port link-type access');
    out.push(' port access vlan ' + v);
    out.push(' stp edged-port enable');
    if (cfg.features && cfg.features.anti_private) { out.push(' port-security enable\n port-security max-mac-num 1'); }
    out.push('');
  });
  if (cfg.features && cfg.features.stp) { out.push('stp enable'); if (cfg.isCore && isL3) out.push('stp root primary'); out.push(''); }
  if (cfg.features && cfg.features.remote_mgmt) { out.push('snmp-agent\nsnmp-agent community read public\nsnmp-agent sys-info version v2c\n'); }
  out.push('return\n');
  return out.join('\n');
});
function _h3vlans(c) { var cv = (c.customVlans && c.customVlans.length > 0) ? c.customVlans : (window.__savedCustomVlans && window.__savedCustomVlans.length > 0) ? window.__savedCustomVlans : null; var ids; if (c.switchLayer === 'l2') { ids = (c.allTopologyVlans && c.allTopologyVlans.length > 0) ? c.allTopologyVlans.slice() : (c.derivedVlans || []).slice(); if (cv && cv.length > 0) { cv.forEach(function(v) { if (ids.indexOf(v.id) < 0) ids.push(v.id); }); } } else if (cv && cv.length > 0) { ids = cv.map(function(v){return v.id;}); } else if (c.derivedVlans && c.derivedVlans.length > 0) { ids = c.derivedVlans.slice(); } else if (c.vlansOnDevice && c.vlansOnDevice.length > 0) { ids = c.vlansOnDevice.slice(); } else if (c.vlan) { ids = c.vlan.split(',').map(function(v){return v.trim();}).filter(Boolean); } else { ids = ['1']; } ids = ids.map(function(v){return parseInt(v,10);}).filter(function(v){return v>=1&&v<=4094;}); ids.sort(function(a,b){return a-b;}); if (ids.indexOf(1) < 0) ids.unshift(1); return ids.map(function(v){return String(v);}); }
function _h3gw(ip, v) { var vid=parseInt(v,10); if(isNaN(vid)||vid<1||vid>4094) vid=1; var seg3=Math.floor(vid/256), seg4=vid%256; if(ip&&/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)){var p=ip.split(".");return p[0]+"."+p[1]+"."+(parseInt(p[2],10)+seg3)+"."+seg4;} return "192.168."+seg3+"."+seg4; }
function _h3ep(c, l) { if (l.peerVlan) return l.peerVlan; return (l.peerType === 'camera' || l.peerType === 'nvr') && c.vlansOnDevice && c.vlansOnDevice.length > 1 ? c.vlansOnDevice[1] : (c.vlan || '1'); }
/** 从 customVlans / localStorage 查找用户设置的 VLANIF IP */
function _h3trunks(o, links, p, vs) { var tv = vs.filter(function(v){return String(v)!=='1';}) || ['1']; (links || []).forEach(function(l) { o.push('# Trunk: ' + l.peerName); o.push('interface ' + p + l.localPort); o.push(' port link-type trunk'); o.push(' port trunk permit vlan ' + tv.join(' ')); o.push(''); }); }
function _isValidUnicastIP(ip) { if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false; var p=ip.split("."), o1=parseInt(p[0],10); if (o1===0||o1===127||o1>=224) return false; return p.every(function(o){var n=parseInt(o,10);return n>=0&&n<=255;}); }
function _findCustomIp(cfg, vlanId) {
  var cv = null;
  try { if (cfg.id) { var raw = localStorage.getItem('vlan_' + cfg.id); if (raw) cv = JSON.parse(raw); } } catch(e) {}
  if (!cv || cv.length === 0) cv = cfg.customVlans || window.__savedCustomVlans || [];
  for (var i = 0; i < cv.length; i++) {
    if (String(cv[i].id) === String(vlanId) && cv[i].ip) {
      var ip = cv[i].ip.trim();
      if (_isValidUnicastIP(ip)) return ip;
    }
  }
  return null;
}

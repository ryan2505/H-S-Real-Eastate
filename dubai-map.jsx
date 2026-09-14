/* Interactive Dubai community map — Leaflet + OpenStreetMap.
   Loads Leaflet itself (after mount) so there is no container race. */
const { useEffect, useRef, useState } = React;

const CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CSS_HASH = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
const JS_HASH = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      link.integrity = CSS_HASH;
      link.crossOrigin = 'anonymous';
      link.setAttribute('data-leaflet', '');
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = JS_URL;
    s.integrity = JS_HASH;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function DubaiMap({ areas, selectedId, onSelect }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const selRef = useRef(selectedId);
  const cbRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  selRef.current = selectedId;
  cbRef.current = onSelect;

  const list = areas || [];

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current, {
        center: [25.115, 55.22],
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      const pane = map.getPane('tilePane');
      if (pane) pane.style.filter = 'grayscale(1) contrast(0.86) brightness(1.06)';
      map.on('click', () => {});
      mapRef.current = map;

      list.forEach((a) => {
        const icon = L.divIcon({
          className: '',
          html: markerHtml(a, a.id === selRef.current),
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        const m = L.marker([a.lat, a.lng], { icon, riseOnHover: true }).addTo(map);
        m.on('click', () => cbRef.current && cbRef.current(a.id));
        markersRef.current[a.id] = m;
      });
      setTimeout(() => map.invalidateSize(), 120);
    }).catch(() => setFailed(true));
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    list.forEach((a) => {
      const m = markersRef.current[a.id];
      if (!m) return;
      m.setIcon(window.L.divIcon({
        className: '',
        html: markerHtml(a, a.id === selectedId),
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }));
      if (a.id === selectedId) m.setZIndexOffset(600); else m.setZIndexOffset(0);
    });
    const sel = list.find((a) => a.id === selectedId);
    if (sel) map.panTo([sel.lat, sel.lng], { animate: true, duration: 0.6 });
  }, [selectedId]);

  if (failed) {
    return React.createElement('div', {
      style: {
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#17171A', color: '#75726D',
        fontFamily: 'Archivo, sans-serif', fontSize: '13px', letterSpacing: '0.04em',
      },
    }, 'Map unavailable offline');
  }

  return React.createElement('div', {
    ref: hostRef,
    style: { width: '100%', height: '100%', background: '#EDEAE4' },
  });
}

function markerHtml(a, active) {
  const dot = active ? '#C4162B' : '#0D0D0F';
  const labelBg = active ? '#0D0D0F' : 'rgba(255,255,255,0.94)';
  const labelFg = active ? '#FFFFFF' : '#0D0D0F';
  return (
    '<div style="position:relative;transform:translate(-50%,-50%);left:5px;top:5px;">' +
      '<div style="width:10px;height:10px;border-radius:50%;background:' + dot +
        ';box-shadow:0 0 0 4px rgba(255,255,255,0.85), 0 1px 6px rgba(0,0,0,0.3);"></div>' +
      '<div style="position:absolute;left:16px;top:50%;transform:translateY(-50%);white-space:nowrap;' +
        'background:' + labelBg + ';color:' + labelFg + ';font-family:Archivo,sans-serif;font-size:10px;' +
        'letter-spacing:0.1em;text-transform:uppercase;padding:4px 9px;border-radius:2px;' +
        'box-shadow:0 2px 10px rgba(0,0,0,0.14);">' + a.name + '</div>' +
    '</div>'
  );
}

module.exports = { DubaiMap };

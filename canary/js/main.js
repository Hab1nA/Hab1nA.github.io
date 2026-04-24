/**
 * 天府七中G2020级蹭饭图 — 主逻辑
 *
 * 依赖：
 *   - 天地图 JavaScript API v4.0（index.html 中加载后调用 onTMapCallback）
 *   - data/class1..4.js（提供 class1Data..class4Data 全局变量）
 */

/* ─── 全局状态 ─────────────────────────────────────────── */
let map;
let geocoder;

/** 已解析过的大学坐标缓存 { "大学名": T.LngLat | null } */
const geoCache = {};

/** 各班当前在地图上的标记列表 */
const classMarkers = { 1: [], 2: [], 3: [], 4: [] };

/** 各班颜色 */
const CLASS_COLORS = {
  1: '#3b82f6', // 蓝
  2: '#10b981', // 绿
  3: '#f59e0b', // 琥珀
  4: '#ef4444'  // 红
};

/** 全班数据引用（在 onTMapCallback 中绑定） */
const ALL_CLASS_DATA = {};

/* ─── 地理编码队列 ──────────────────────────────────────── */
const geocodeQueue = [];
let geocodingActive = false;
let pendingGeocodesCount = 0;

/** Toast 计时器（模块级，避免存到 DOM 元素上） */
let toastTimer = null;

/** 院校名称在 Top 列表中的最大显示字符数 */
const UNI_LABEL_MAX_LEN = 9;
const TMAP_GEOCODE_SUCCESS = 0;
const TMAP_SEARCH_RESULT_POI = 1;

/** 将一个大学名称加入编码队列，结果通过 callback(T.LngLat|null) 返回 */
function enqueueGeocode(university, city, callback) {
  if (Object.prototype.hasOwnProperty.call(geoCache, university)) {
    callback(geoCache[university]);
    return;
  }

  pendingGeocodesCount++;
  updateLoadingOverlay();

  geocodeQueue.push({
    university,
    city,
    callback: function (point) {
      callback(point);
      pendingGeocodesCount--;
      updateLoadingOverlay();
    }
  });

  if (!geocodingActive) {
    processNextGeocode();
  }
}

/** 逐条执行队列中的地理编码请求（限速 250 ms/次，避免触发 API 限流） */
function processNextGeocode() {
  if (geocodeQueue.length === 0) {
    geocodingActive = false;
    return;
  }

  geocodingActive = true;
  const item = geocodeQueue.shift();

  // 再次检查缓存（避免重复请求同一大学）
  if (Object.prototype.hasOwnProperty.call(geoCache, item.university)) {
    item.callback(geoCache[item.university]);
    setTimeout(processNextGeocode, 10);
    return;
  }

  const keyword = (item.city || '') + item.university;
  geocoder.getPoint(keyword, function (result) {
    const point = parseGeocodeResult(result);
    geoCache[item.university] = point; // null 时表示未找到，也缓存，避免重复请求
    item.callback(point);
    setTimeout(processNextGeocode, 250);
  });
}

/* ─── DOM 就绪后立即初始化（无需等待地图 API） ───────────── */
document.addEventListener('DOMContentLoaded', function () {
  // 绑定数据（供人数显示与统计使用）
  ALL_CLASS_DATA[1] = typeof class1Data !== 'undefined' ? class1Data : [];
  ALL_CLASS_DATA[2] = typeof class2Data !== 'undefined' ? class2Data : [];
  ALL_CLASS_DATA[3] = typeof class3Data !== 'undefined' ? class3Data : [];
  ALL_CLASS_DATA[4] = typeof class4Data !== 'undefined' ? class4Data : [];

  // 人数徽标
  updateCountBadges();

  // 关于 / 数据统计按钮（不依赖地图）
  document.getElementById('aboutBtn').addEventListener('click', function () {
    openModal('aboutModal');
  });
  document.getElementById('statsBtn').addEventListener('click', function () {
    buildStatsContent();
    openModal('statsModal');
  });

  // 关闭按钮
  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(this.dataset.modal);
    });
  });

  // 点击遮罩关闭
  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) closeModal(this.id);
    });
  });

  // ESC 键关闭
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.show').forEach(function (m) {
        closeModal(m.id);
      });
    }
  });
});

/* ─── 地图初始化（天地图 API 回调） ──────────────────────── */
window.onTMapCallback = function () {
  map = new T.Map('map-container');

  // 以中国地理中心附近为初始视野
  map.centerAndZoom(new T.LngLat(105.4, 37.9), 5);
  map.enableScrollWheelZoom();
  map.setMinZoom(4);
  map.setMaxZoom(18);

  // 缩放控件（位于左下）
  const zoomControl = new T.Control.Zoom();
  zoomControl.setPosition(T_ANCHOR_BOTTOM_LEFT);
  map.addControl(zoomControl);

  // 比例尺（位于左下）
  const scaleControl = new T.Control.Scale();
  scaleControl.setPosition(T_ANCHOR_BOTTOM_LEFT);
  map.addControl(scaleControl);

  // 初始化地理编码器
  geocoder = new T.Geocoder();

  // 绑定地图相关的 UI 事件
  setupMapEventListeners();
};

/* ─── 地图相关 UI 初始化（地图 API 就绪后调用） ──────────── */
function setupMapEventListeners() {
  // 班级复选框 → 显示/隐藏标记
  for (let i = 1; i <= 4; i++) {
    (function (classNum) {
      document.getElementById('class' + classNum).addEventListener('change', function () {
        if (this.checked) {
          loadClassMarkers(classNum);
        } else {
          removeClassMarkers(classNum);
        }
        updateTotalCount();
      });
    })(i);
  }

  // 搜索框（需要 T.LocalSearch，依赖地图对象）
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') performSearch();
  });
}

/* ─── 标记加载 / 移除 ────────────────────────────────────── */

/** 按大学分组，返回 [{ university, city, students[] }] */
function groupByUniversity(classNum) {
  const groups = {};
  ALL_CLASS_DATA[classNum].forEach(function (student) {
    if (!groups[student.university]) {
      groups[student.university] = {
        university: student.university,
        city: student.city,
        students: []
      };
    }
    groups[student.university].students.push(student.name);
  });
  return Object.values(groups);
}

/** 加载某班级的地图标记 */
function loadClassMarkers(classNum) {
  const groups = groupByUniversity(classNum);
  groups.forEach(function (group) {
    enqueueGeocode(group.university, group.city, function (point) {
      if (point) {
        addMarkerToMap(classNum, point, group);
      }
    });
  });
}

/** 移除某班级的全部地图标记 */
function removeClassMarkers(classNum) {
  classMarkers[classNum].forEach(function (marker) {
    removeMapOverlay(marker);
  });
  classMarkers[classNum] = [];
}

/* ─── 标记创建 ──────────────────────────────────────────── */

/** 生成彩色 SVG Pin 图标的 data URL */
function createPinIcon(color) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">'
    + '<defs><filter id="s" x="-30%" y="-20%" width="160%" height="160%">'
    + '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>'
    + '</filter></defs>'
    + '<path d="M18 2C9.16 2 2 9.16 2 18C2 31 18 46 18 46C18 46 34 31 34 18C34 9.16 26.84 2 18 2Z"'
    + ' fill="' + color + '" filter="url(#s)"/>'
    + '<circle cx="18" cy="18" r="7" fill="white" opacity="0.92"/>'
    + '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/** 在地图上添加一个班级标记 */
function addMarkerToMap(classNum, point, group) {
  const color = CLASS_COLORS[classNum];
  const icon = new T.Icon({
    iconUrl: createPinIcon(color),
    iconSize: new T.Point(36, 48),
    iconAnchor: new T.Point(18, 46)
  });

  const marker = new T.Marker(point, { icon: icon });

  // 悬停提示（大学名 + 人数）
  const labelText = group.university + '（' + group.students.length + '人）';
  const hoverInfoWindow = new T.InfoWindow(
    '<div style="padding:4px 8px;background:rgba(15,23,42,0.88);color:#f1f5f9;border-radius:6px;font-size:12px;white-space:nowrap;">'
      + labelText +
    '</div>',
    { autoPan: false }
  );

  marker.addEventListener('mouseover', function () {
    marker.openInfoWindow(hoverInfoWindow);
  });
  marker.addEventListener('mouseout', function () {
    marker.closeInfoWindow();
  });

  // 点击弹出信息窗口
  const infoContent = buildInfoWindowHTML(classNum, group, color);
  const infoWindow = new T.InfoWindow(infoContent, { autoPan: true });
  marker.addEventListener('click', function () {
    marker.openInfoWindow(infoWindow);
  });

  addMapOverlay(marker);
  classMarkers[classNum].push(marker);
}

/** 构建信息窗口 HTML（使用内联样式，避免被地图默认样式覆盖） */
function buildInfoWindowHTML(classNum, group, color) {
  const studentItems = group.students.map(function (name) {
    return '<li style="padding:3px 0;font-size:13px;color:#1e293b;">&#8226; ' + name + '</li>';
  }).join('');

  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;min-width:220px;border-radius:8px;overflow:hidden;">'
    + '<div style="background:' + color + ';padding:10px 14px;display:flex;align-items:center;gap:8px;">'
    + '<span style="background:rgba(255,255,255,0.25);padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;color:white;">' + classNum + '班</span>'
    + '<span style="font-size:14px;font-weight:700;color:white;">' + group.university + '</span>'
    + '</div>'
    + '<div style="padding:12px 14px;background:white;">'
    + '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">&#x1F4CD; ' + group.city + '</div>'
    + '<div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:4px;">就读同学（' + group.students.length + '人）</div>'
    + '<ul style="list-style:none;padding:0;margin:0;">' + studentItems + '</ul>'
    + '</div>'
    + '</div>';
}

/* ─── 搜索 ───────────────────────────────────────────────── */
function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const localSearch = new T.LocalSearch(map, {
    pageCapacity: 10,
    onSearchComplete: function (result) {
      // getResultType 在不同示例中返回值类型不完全一致，这里统一转数字比较
      if (result && Number(result.getResultType()) === TMAP_SEARCH_RESULT_POI) {
        const pois = result.getPois();
        if (pois && pois.length > 0 && typeof pois[0].lonlat === 'string') {
          const lnglatArr = pois[0].lonlat.split(',');
          if (lnglatArr.length === 2) {
            const lng = parseFloat(lnglatArr[0]);
            const lat = parseFloat(lnglatArr[1]);
            if (Number.isFinite(lng) && Number.isFinite(lat)) {
              map.centerAndZoom(new T.LngLat(lng, lat), 14);
              return;
            }
          }
        }
      }
      showToast('未找到"' + query + '"，请尝试其他关键词');
    }
  });
  localSearch.search(query);
}

/* ─── 模态框 ─────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* ─── 数据统计 ───────────────────────────────────────────── */
function buildStatsContent() {
  const cityCounts = {};
  const uniCounts = {};
  let totalAll = 0;
  const classCounts = {};

  for (let i = 1; i <= 4; i++) {
    const data = ALL_CLASS_DATA[i] || [];
    classCounts[i] = data.length;
    totalAll += data.length;
    data.forEach(function (s) {
      cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
      uniCounts[s.university] = (uniCounts[s.university] || 0) + 1;
    });
  }

  const topCities = Object.entries(cityCounts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
  const topUnis   = Object.entries(uniCounts).sort(function (a, b)  { return b[1] - a[1]; }).slice(0, 8);
  const maxCity = topCities.length ? topCities[0][1] : 1;
  const maxUni  = topUnis.length ? topUnis[0][1] : 1;

  const badgesHTML = [1, 2, 3, 4].map(function (i) {
    const c = CLASS_COLORS[i];
    return '<div class="stats-badge" style="background:' + c + '1a;border:2px solid ' + c + ';">'
      + '<span class="badge-dot" style="background:' + c + ';"></span>'
      + '<span>' + i + '班</span>'
      + '<strong>' + classCounts[i] + '人</strong>'
      + '</div>';
  }).join('');

  const cityBarsHTML = topCities.map(function (entry) {
    const pct = (entry[1] / maxCity * 100).toFixed(1);
    return '<div class="bar-row">'
      + '<span class="bar-label">' + entry[0] + '</span>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:#3b82f6;"></div></div>'
      + '<span class="bar-count">' + entry[1] + '人</span>'
      + '</div>';
  }).join('');

  const uniBarsHTML = topUnis.map(function (entry) {
    const name = entry[0].length > UNI_LABEL_MAX_LEN ? entry[0].slice(0, UNI_LABEL_MAX_LEN) + '…' : entry[0];
    const pct  = (entry[1] / maxUni * 100).toFixed(1);
    return '<div class="bar-row">'
      + '<span class="bar-label" title="' + entry[0] + '">' + name + '</span>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:#10b981;"></div></div>'
      + '<span class="bar-count">' + entry[1] + '人</span>'
      + '</div>';
  }).join('');

  document.getElementById('statsContent').innerHTML =
    '<div class="stats-summary">'
    + '<p class="stats-total">全年级共 <strong class="stats-num">' + totalAll + '</strong> 人</p>'
    + '<div class="stats-badges">' + badgesHTML + '</div>'
    + '</div>'
    + '<div class="stats-section"><h3 class="stats-section-title">&#x1F4CD; 城市分布 Top ' + topCities.length + '</h3>'
    + '<div class="bar-list">' + cityBarsHTML + '</div></div>'
    + '<div class="stats-section"><h3 class="stats-section-title">&#x1F3DB; 热门院校 Top ' + topUnis.length + '</h3>'
    + '<div class="bar-list">' + uniBarsHTML + '</div></div>';
}

/* ─── 辅助函数 ───────────────────────────────────────────── */
function updateCountBadges() {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('count' + i);
    if (el) el.textContent = (ALL_CLASS_DATA[i] ? ALL_CLASS_DATA[i].length : 0) + '人';
  }
}

function updateTotalCount() {
  let total = 0;
  for (let i = 1; i <= 4; i++) {
    if (document.getElementById('class' + i).checked) {
      total += ALL_CLASS_DATA[i] ? ALL_CLASS_DATA[i].length : 0;
    }
  }
  document.getElementById('totalCount').textContent = '共加载 ' + total + ' 人';
}

function updateLoadingOverlay() {
  const el = document.getElementById('loadingOverlay');
  el.style.display = pendingGeocodesCount > 0 ? 'flex' : 'none';
}

function parseGeocodeResult(result) {
  if (!result) return null;
  const hasStatusMethod = typeof result.getStatus === 'function';
  const geocodeSuccess = hasStatusMethod && result.getStatus() === TMAP_GEOCODE_SUCCESS;
  const hasLocationPointMethod = typeof result.getLocationPoint === 'function';
  if (geocodeSuccess && hasLocationPointMethod) {
    return result.getLocationPoint();
  }
  if (typeof result.lng === 'number' && typeof result.lat === 'number') {
    return new T.LngLat(result.lng, result.lat);
  }
  return null;
}

function addMapOverlay(overlay) {
  if (typeof map.addOverLay === 'function') {
    map.addOverLay(overlay);
  } else if (typeof map.addOverlay === 'function') {
    map.addOverlay(overlay);
  }
}

function removeMapOverlay(overlay) {
  if (typeof map.removeOverLay === 'function') {
    map.removeOverLay(overlay);
  } else if (typeof map.removeOverlay === 'function') {
    map.removeOverlay(overlay);
  }
}

/** 底部短暂提示条 */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

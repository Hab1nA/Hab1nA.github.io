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

/** 当前显示在地图上的标记列表（按当前复选状态整体重算） */
let activeMarkers = [];

/** 当前显示标记索引（大学名 -> marker），供搜索定位后打开信息窗 */
let activeMarkerByUniversity = {};

/** 搜索定位时为班级未勾选的同学临时添加的标记（关闭搜索时移除） */
let searchPinnedMarker = null;

/** 搜索时被临时替换了信息窗的已有标记（关闭搜索时恢复其原始信息窗） */
let patchedExistingMarker = null;

/** 搜索定位时直接打开了信息窗的已有标记（关闭搜索时需关闭其信息窗） */
let searchOpenedExistingMarker = null;

/** 标记渲染版本号，用于忽略过期异步地理编码回调 */
let markerRenderVersion = 0;

/** 各班颜色 */
const CLASS_COLORS = {
  1: '#a74bb6', // 紫
  2: '#10b981', // 绿
  3: '#f59e0b', // 琥珀
  4: '#a3292b'  // 红
};
const MERGED_MARKER_COLOR = '#9ca3af'; // 多班同校合并标记（灰）

/** 全班数据引用（在 onTMapCallback 中绑定） */
const ALL_CLASS_DATA = {};

/** 各班缺失数据引用 */
const ALL_MISSING_DATA = {};

/* ─── 地理编码队列 ──────────────────────────────────────── */
const geocodeQueue = [];
let geocodingActive = false;
let pendingGeocodesCount = 0;

/** Toast 计时器（模块级，避免存到 DOM 元素上） */
let toastTimer = null;

/** 当前搜索结果列表（多结果导航用） */
let searchResults = [];
/** 当前正在查看的搜索结果索引 */
let searchResultIndex = 0;
/** 请求版本号：每次 goToSearchResult 调用时递增，用于丢弃过期异步回调 */
let searchNavRequestId = 0;

/** 院校名称在 Top 列表中的最大显示字符数 */
const UNI_LABEL_MAX_LEN = 9;
const TMAP_GEOCODE_SUCCESS = 0;

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

  const keyword = (item.city ? item.city + ' ' : '') + item.university;
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

  // 绑定缺失数据
  ALL_MISSING_DATA[1] = typeof class1MissingData !== 'undefined' ? class1MissingData : [];
  ALL_MISSING_DATA[2] = typeof class2MissingData !== 'undefined' ? class2MissingData : [];
  ALL_MISSING_DATA[3] = typeof class3MissingData !== 'undefined' ? class3MissingData : [];
  ALL_MISSING_DATA[4] = typeof class4MissingData !== 'undefined' ? class4MissingData : [];

  // 人数徽标
  updateCountBadges();

  // 初始化"数据缺失"面板相对"班级筛选"面板的位置
  positionMissingPanel();

  // 关于 / 数据统计按钮（不依赖地图）
  document.getElementById('aboutBtn').addEventListener('click', function () {
    openModal('aboutModal');
  });
  document.getElementById('statsBtn').addEventListener('click', function () {
    buildStatsContent();
    openModal('statsModal');
  });

  // 数据缺失栏目点击
  document.getElementById('missingDataToggle').addEventListener('click', function () {
    var selected = getSelectedClasses();
    if (selected.length === 0) return;
    buildMissingDataContent(selected);
    openModal('missingDataModal');
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

  // 窗口大小变化时重新计算"数据缺失"面板位置
  window.addEventListener('resize', function () {
    positionMissingPanel();
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
  // 班级复选框 → 显示/隐藏标记 + 更新数据缺失栏目
  for (let i = 1; i <= 4; i++) {
    document.getElementById('class' + i).addEventListener('change', function () {
      renderSelectedMarkers();
      updateTotalCount();
      updateMissingDataToggle();
    });
  }

  // 搜索框
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') performSearch();
  });

  // 搜索结果导航条
  document.getElementById('searchNavPrev').addEventListener('click', function () {
    if (searchResultIndex > 0) {
      searchResultIndex--;
      goToSearchResult();
    }
  });
  document.getElementById('searchNavNext').addEventListener('click', function () {
    if (searchResultIndex < searchResults.length - 1) {
      searchResultIndex++;
      goToSearchResult();
    }
  });
  document.getElementById('searchNavClose').addEventListener('click', hideSearchNav);
}

/* ─── 标记加载 / 移除 ────────────────────────────────────── */

/** 获取当前勾选的班级列表 */
function getSelectedClasses() {
  const selected = [];
  for (let i = 1; i <= 4; i++) {
    if (document.getElementById('class' + i).checked) selected.push(i);
  }
  return selected;
}

/**
 * 合并当前已勾选班级的大学去向
 * 返回 [{ university, city, coordinate, totalStudents, classNums[], studentsByClass }]
 */
function groupSelectedByUniversity(selectedClasses) {
  const groups = {};
  selectedClasses.forEach(function (classNum) {
    (ALL_CLASS_DATA[classNum] || []).forEach(function (student) {
      if (!groups[student.university]) {
        groups[student.university] = {
          university: student.university,
          city: student.city || '',
          coordinate: null,
          coordinateConflict: false,
          totalStudents: 0,
          classNums: [],
          studentsByClass: {}
        };
      }
      const group = groups[student.university];
      if (!group.city && student.city) group.city = student.city;
      const coordinate = parseStudentCoordinate(student);
      if (coordinate) {
        if (!group.coordinate) {
          group.coordinate = coordinate;
        } else if (!isSameCoordinate(group.coordinate, coordinate)) {
          group.coordinate = null;
          group.coordinateConflict = true;
        }
      }
      if (!group.studentsByClass[classNum]) {
        group.studentsByClass[classNum] = [];
        group.classNums.push(classNum);
      }
      group.studentsByClass[classNum].push(student.name);
      group.totalStudents++;
    });
  });
  return Object.values(groups).map(function (group) {
    group.classNums.sort(function (a, b) { return a - b; });
    return group;
  });
}

/** 清空当前地图标记 */
function clearActiveMarkers() {
  activeMarkers.forEach(function (marker) {
    removeMapOverlay(marker);
  });
  activeMarkers = [];
  activeMarkerByUniversity = {};
}

/** 按当前复选框状态重算并渲染标记 */
function renderSelectedMarkers() {
  const selectedClasses = getSelectedClasses();
  const renderVersion = ++markerRenderVersion;
  clearActiveMarkers();
  if (selectedClasses.length === 0) return;

  const groups = groupSelectedByUniversity(selectedClasses);
  groups.forEach(function (group) {
    if (!group.coordinateConflict && group.coordinate) {
      addMarkerToMap(toLngLat(group.coordinate), group);
      return;
    }
    enqueueGeocode(group.university, group.city, function (point) {
      if (renderVersion !== markerRenderVersion || !point) return;
      addMarkerToMap(point, group);
    });
  });
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

/** 在地图上添加一个标记（可能是多班合并） */
function addMarkerToMap(point, group) {
  const merged = group.classNums.length > 1;
  const color = merged ? MERGED_MARKER_COLOR : CLASS_COLORS[group.classNums[0]];
  const marker = createMarker(point, group, color, merged);

  addMapOverlay(marker);
  activeMarkers.push(marker);
  activeMarkerByUniversity[group.university] = marker;

  // 若搜索临时标记恰好属于同一大学，则移除它（正式标记已覆盖）
  if (searchPinnedMarker && searchPinnedMarker.__university === group.university) {
    clearSearchPinnedMarker();
  }
}

/**
 * 创建并配置一个地图标记（含悬停/点击信息窗）。
 * 不负责添加到地图或管理任何全局状态。
 */
function createMarker(point, group, color, merged) {
  const icon = new T.Icon({
    iconUrl: createPinIcon(color),
    iconSize: new T.Point(36, 48),
    iconAnchor: new T.Point(18, 46)
  });

  const marker = new T.Marker(point, { icon: icon });

  const infoContent = buildInfoWindowHTML(group, color, merged);
  const hoverInfoWindow = new T.InfoWindow(infoContent, { autoPan: false, closeButton: false });
  const infoWindow = new T.InfoWindow(infoContent, { autoPan: true, closeButton: false });

  marker.__university = group.university;
  marker.__infoWindow = infoWindow;
  marker.addEventListener('mouseover', function () { marker.openInfoWindow(hoverInfoWindow); });
  marker.addEventListener('mouseout',  function () { marker.closeInfoWindow(); });
  marker.addEventListener('click',     function () { marker.openInfoWindow(infoWindow); });

  return marker;
}

/** 构建信息窗口 HTML（使用内联样式，避免被地图默认样式覆盖） */
function buildInfoWindowHTML(group, color, merged) {
  const classSections = group.classNums.map(function (classNum) {
    const classColor = CLASS_COLORS[classNum];
    const students = group.studentsByClass[classNum] || [];
    const studentItems = students.map(function (name) {
      return '<li style="padding:3px 0;font-size:13px;color:#1e293b;">&#8226; ' + escapeHTML(name) + '</li>';
    }).join('');
    return '<div style="margin-top:10px;">'
      + '<div style="display:inline-flex;align-items:center;gap:6px;background:' + classColor + '1f;border:1px solid ' + classColor + '55;border-radius:999px;padding:2px 10px;">'
      + '<span style="width:7px;height:7px;border-radius:50%;background:' + classColor + ';"></span>'
      + '<span style="font-size:12px;font-weight:700;color:#334155;">' + classNum + '班</span>'
      + '<span style="font-size:11px;color:#64748b;">' + students.length + '人</span>'
      + '</div>'
      + '<ul style="list-style:none;padding:6px 0 0 0;margin:0;">' + studentItems + '</ul>'
      + '</div>';
  }).join('');
  const safeUniversity = escapeHTML(group.university);
  const safeCity = escapeHTML(group.city);
  const classBadgeText = merged ? '多班<br>合并' : (group.classNums[0] + '班');

  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;min-width:300px;border-radius:8px;overflow:hidden;">'
    + '<div style="background:' + color + ';padding:10px 14px;display:flex;align-items:center;gap:8px;min-width:0;">'
    + '<span style="background:rgba(255,255,255,0.25);padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;color:white;flex-shrink:0;white-space:nowrap;">' + classBadgeText + '</span>'
    + (group.university.length > 15
        ? '<marquee style="font-size:14px;font-weight:700;color:white;width:100%;" scrollamount="3">' + safeUniversity + '</marquee>'
        : '<span style="font-size:14px;font-weight:700;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">' + safeUniversity + '</span>')
    + '</div>'
    + '<div style="padding:12px 14px;background:white;">'
    + '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">&#x1F4CD; ' + safeCity + '</div>'
    + '<div style="font-size:12px;color:#475569;font-weight:600;margin-bottom:4px;">就读同学（' + group.totalStudents + '人）</div>'
    + classSections
    + '</div>'
    + '</div>';
}

/* ─── 搜索 ───────────────────────────────────────────────── */
function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  // 新搜索开始时清除旧导航条
  hideSearchNav();

  // 第一步：同学姓名检索
  const studentMatches = findStudentMatchesByName(query);
  if (studentMatches.length > 0) {
    focusOnStudentMatch(query, studentMatches);
    return;
  }

  // 第二步：大学名称检索
  const universityMatches = findUniversityMatches(query);
  if (universityMatches.length > 0) {
    focusOnUniversityMatch(query, universityMatches);
    return;
  }

  // 都未匹配
  showToast('未找到"' + query + '"，请尝试其他关键词');
}

function findStudentMatchesByName(query) {
  const q = query.toLowerCase();
  const matches = [];
  for (let i = 1; i <= 4; i++) {
    (ALL_CLASS_DATA[i] || []).forEach(function (student) {
      if ((student.name || '').toLowerCase().indexOf(q) !== -1) {
        matches.push({
          classNum: i,
          name: student.name,
          university: student.university,
          city: student.city,
          coordinate: parseStudentCoordinate(student)
        });
      }
    });
  }
  return matches;
}

function findUniversityMatches(query) {
  const q = query.toLowerCase();
  const groups = {};
  for (let i = 1; i <= 4; i++) {
    (ALL_CLASS_DATA[i] || []).forEach(function (student) {
      if ((student.university || '').toLowerCase().indexOf(q) !== -1) {
        if (!groups[student.university]) {
          groups[student.university] = {
            university: student.university,
            city: student.city || '',
            coordinate: null,
            coordinateConflict: false,
            totalStudents: 0,
            classNums: [],
            studentsByClass: {}
          };
        }
        const group = groups[student.university];
        if (!group.city && student.city) group.city = student.city;
        const coord = parseStudentCoordinate(student);
        if (coord) {
          if (!group.coordinate) {
            group.coordinate = coord;
          } else if (!isSameCoordinate(group.coordinate, coord)) {
            group.coordinate = null;
            group.coordinateConflict = true;
          }
        }
        if (!group.studentsByClass[i]) {
          group.studentsByClass[i] = [];
          group.classNums.push(i);
        }
        group.studentsByClass[i].push(student.name);
        group.totalStudents++;
      }
    });
  }
  return Object.values(groups).map(function (group) {
    group.classNums.sort(function (a, b) { return a - b; });
    return group;
  });
}

function focusOnStudentMatch(query, matches) {
  // 记录所有结果，每个结果加 type 标记为 'student'
  searchResults = matches.map(function (m) {
    m.type = 'student';
    return m;
  });
  const exactIdx = searchResults.findIndex(function (m) { return m.name === query; });
  searchResultIndex = exactIdx >= 0 ? exactIdx : 0;

  goToSearchResult();

  if (matches.length > 1) {
    showSearchNav();
  } else {
    showToast('已定位：' + matches[0].name + '（' + matches[0].classNum + '班 · ' + matches[0].university + '）');
  }
}

function focusOnUniversityMatch(query, matches) {
  // 记录所有大学匹配结果，每个结果加 type 标记为 'university'
  searchResults = matches.map(function (m) {
    m.type = 'university';
    return m;
  });
  // 优先精确匹配大学全名
  const exactIdx = searchResults.findIndex(function (m) { return m.university === query; });
  searchResultIndex = exactIdx >= 0 ? exactIdx : 0;

  goToSearchResult();

  if (matches.length > 1) {
    showSearchNav();
  } else {
    const m = searchResults[0];
    const classStr = m.classNums.map(function (c) { return c + '班'; }).join('·');
    showToast('已定位：' + m.university + '（' + classStr + '·共' + m.totalStudents + '人）');
  }
}

/** 定位到当前搜索结果（由 searchResultIndex 决定）并更新导航条 */
function goToSearchResult() {
  const target = getCurrentSearchResult();
  if (!target) return;
  updateSearchNavInfo();
  clearSearchPinnedMarker();
  const requestId = ++searchNavRequestId;
  if (target.coordinate) {
    map.centerAndZoom(toLngLat(target.coordinate), 13);
    openOrPinSearchResult(target, toLngLat(target.coordinate));
    return;
  }
  enqueueGeocode(target.university, target.city, function (point) {
    if (requestId !== searchNavRequestId) return; // 导航已切换，丢弃过期回调
    if (!point) {
      if (target.type === 'university') {
        showToast('找到大学"' + target.university + '"，但未能定位其位置');
      } else {
        showToast('找到同学"' + target.name + '"，但未能定位其大学');
      }
      return;
    }
    map.centerAndZoom(point, 13);
    openOrPinSearchResult(target, point);
  });
}

/**
 * 定位完成后，若该大学已有现有标记则打开其信息窗；
 * 否则临时创建一个标记并打开其信息窗。
 * 对于大学类型搜索结果，信息窗显示所有班级所有同学。
 */
function openOrPinSearchResult(target, point) {
  const existingMarker = activeMarkerByUniversity[target.university];
  if (existingMarker && existingMarker.__infoWindow && typeof existingMarker.openInfoWindow === 'function') {
    // 检查搜索结果中的班级是否已被已有标记完全覆盖
    var selectedClasses = getSelectedClasses();
    var allClassesCovered = true;
    var searchClassNums;
    if (target.type === 'university') {
      searchClassNums = target.classNums;
    } else {
      searchClassNums = [target.classNum];
    }
    for (var i = 0; i < searchClassNums.length; i++) {
      if (selectedClasses.indexOf(searchClassNums[i]) === -1) {
        allClassesCovered = false;
        break;
      }
    }

    if (allClassesCovered) {
      // 搜索结果班级全部被当前勾选覆盖，直接用已有信息窗
      existingMarker.openInfoWindow(existingMarker.__infoWindow);
      searchOpenedExistingMarker = existingMarker;
      return;
    }

    // 搜索结果包含未勾选班级 → 合并勾选班级数据与搜索结果数据，重建信息窗
    var selectedGroups = groupSelectedByUniversity(selectedClasses);
    var existingGroup = null;
    for (var j = 0; j < selectedGroups.length; j++) {
      if (selectedGroups[j].university === target.university) {
        existingGroup = selectedGroups[j];
        break;
      }
    }

    if (existingGroup) {
      // 保存原始信息窗与图标用于后续恢复
      patchedExistingMarker = {
        marker: existingMarker,
        origInfoWindow: existingMarker.__infoWindow,
        origIcon: existingMarker.getIcon()
      };

      // 合并搜索结果中的班级数据到 existingGroup
      var mergedGroup = {
        university: existingGroup.university,
        city: existingGroup.city,
        classNums: existingGroup.classNums.slice(),
        studentsByClass: {},
        totalStudents: existingGroup.totalStudents
      };

      // 复制已有班级数据
      for (var cNum in existingGroup.studentsByClass) {
        if (Object.prototype.hasOwnProperty.call(existingGroup.studentsByClass, cNum)) {
          mergedGroup.studentsByClass[cNum] = existingGroup.studentsByClass[cNum].slice();
        }
      }

      // 合并搜索结果的班级数据
      if (target.type === 'university') {
        for (var ci = 0; ci < target.classNums.length; ci++) {
          var cn = target.classNums[ci];
          if (!mergedGroup.studentsByClass[cn]) {
            mergedGroup.studentsByClass[cn] = [];
          }
          var targetStudents = target.studentsByClass[cn] || [];
          for (var si = 0; si < targetStudents.length; si++) {
            if (mergedGroup.studentsByClass[cn].indexOf(targetStudents[si]) === -1) {
              mergedGroup.studentsByClass[cn].push(targetStudents[si]);
              mergedGroup.totalStudents++;
            }
          }
        }
      } else {
        // 学生搜索结果
        var scn = target.classNum;
        if (!mergedGroup.studentsByClass[scn]) {
          mergedGroup.studentsByClass[scn] = [];
        }
        if (mergedGroup.studentsByClass[scn].indexOf(target.name) === -1) {
          mergedGroup.studentsByClass[scn].push(target.name);
          mergedGroup.totalStudents++;
        }
      }

      // 重新排序 classNums
      mergedGroup.classNums = Object.keys(mergedGroup.studentsByClass).map(Number).sort(function (a, b) { return a - b; });

      var mergedColor = mergedGroup.classNums.length > 1 ? MERGED_MARKER_COLOR : CLASS_COLORS[mergedGroup.classNums[0]];
      var mergedInfoContent = buildInfoWindowHTML(mergedGroup, mergedColor, mergedGroup.classNums.length > 1);
      var patchedInfoWindow = new T.InfoWindow(mergedInfoContent, { autoPan: true, closeButton: false });

      // 若合并后为多班，替换为灰色图标
      if (mergedGroup.classNums.length > 1) {
        var grayIcon = new T.Icon({
          iconUrl: createPinIcon(MERGED_MARKER_COLOR),
          iconSize: new T.Point(36, 48),
          iconAnchor: new T.Point(18, 46)
        });
        existingMarker.setIcon(grayIcon);
      }

      // 替换信息窗
      existingMarker.__infoWindow = patchedInfoWindow;
      existingMarker.openInfoWindow(patchedInfoWindow);
      return;
    }
  }

  var marker;
  if (target.type === 'university') {
    // 大学搜索结果：显示该大学所有班级所有同学
    var merged = target.classNums.length > 1;
    var color = merged ? MERGED_MARKER_COLOR : CLASS_COLORS[target.classNums[0]];
    marker = createMarker(point, target, color, merged);
  } else {
    // 学生搜索结果：仅显示该同学
    var sColor = CLASS_COLORS[target.classNum];
    var studentsByClass = {};
    studentsByClass[target.classNum] = [target.name];
    var group = {
      university: target.university,
      city: target.city || '',
      classNums: [target.classNum],
      studentsByClass: studentsByClass,
      totalStudents: 1
    };
    marker = createMarker(point, group, sColor, false);
  }

  addMapOverlay(marker);
  marker.openInfoWindow(marker.__infoWindow);
  searchPinnedMarker = marker;
}

/** 返回当前搜索结果条目，越界时返回 null */
function getCurrentSearchResult() {
  if (searchResultIndex < 0 || searchResultIndex >= searchResults.length) return null;
  return searchResults[searchResultIndex];
}

/** 显示搜索结果导航条 */
function showSearchNav() {
  updateSearchNavInfo();
  document.getElementById('searchNav').classList.add('show');
}

/**
 * 隐藏并清空搜索结果导航条。
 * 默认会同时移除搜索定位时的临时标记；传入 false 时仅隐藏/重置导航，不清除临时标记。
 */
function hideSearchNav(clearPinnedMarker) {
  if (clearPinnedMarker === undefined) clearPinnedMarker = true;
  searchResults = [];
  searchResultIndex = 0;
  searchNavRequestId++;  // 使任何仍在飞行中的地理编码回调失效
  if (clearPinnedMarker) {
    clearSearchPinnedMarker();
  }
  document.getElementById('searchNav').classList.remove('show');
}

/** 移除搜索定位时临时添加的标记，并恢复被临时替换信息窗的已有标记 */
function clearSearchPinnedMarker() {
     if (searchPinnedMarker) {
      searchPinnedMarker.closeInfoWindow();
      removeMapOverlay(searchPinnedMarker);
      searchPinnedMarker = null;
    }

  // 恢复被搜索临时替换了信息窗的已有标记，并关闭其当前信息窗
  if (patchedExistingMarker) {
    patchedExistingMarker.marker.closeInfoWindow();
    patchedExistingMarker.marker.__infoWindow = patchedExistingMarker.origInfoWindow;
    patchedExistingMarker.marker.setIcon(patchedExistingMarker.origIcon);
    patchedExistingMarker = null;
  }

  // 关闭搜索定位时直接打开信息窗的已有标记的信息窗
  if (searchOpenedExistingMarker) {
    searchOpenedExistingMarker.closeInfoWindow();
    searchOpenedExistingMarker = null;
  }
}

/** 刷新导航条的文字与按钮状态 */
function updateSearchNavInfo() {
  const target = getCurrentSearchResult();
  if (!target) return;
  const navInfo = document.getElementById('searchNavInfo');

  var labelHTML;
  if (target.type === 'university') {
    var classStr = target.classNums.map(function (c) { return c + '班'; }).join('·');
    labelHTML =
      escapeHTML(target.university)
      + '（' + classStr + '·共' + target.totalStudents + '人）';
  } else {
    labelHTML =
      escapeHTML(target.name)
      + '（' + target.classNum + '班&middot;' + escapeHTML(target.university) + '）';
  }

  navInfo.innerHTML =
    '<span class="nav-index">' + (searchResultIndex + 1) + '</span>'
    + '<span class="nav-sep"> / </span>'
    + '<span class="nav-total">' + searchResults.length + '</span>'
    + '<span class="nav-label">' + labelHTML + '</span>';
  document.getElementById('searchNavPrev').disabled = searchResultIndex === 0;
  document.getElementById('searchNavNext').disabled = searchResultIndex === searchResults.length - 1;
}

/* ─── 模态框 ─────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* ─── 数据缺失 ───────────────────────────────────────────── */

/**
 * 根据当前勾选的班级，更新"数据缺失"栏目的显示/隐藏和人数。
 * 若无任何班级被勾选，则隐藏；否则显示并统计缺失总人数。
 */
function updateMissingDataToggle() {
  var selected = getSelectedClasses();
  var toggle = document.getElementById('missingDataToggle');
  var countEl = document.getElementById('missingCount');

  if (selected.length === 0) {
    toggle.classList.add('hidden');
    return;
  }

  var totalMissing = 0;
  for (var i = 0; i < selected.length; i++) {
    var classNum = selected[i];
    var missingList = ALL_MISSING_DATA[classNum] || [];
    totalMissing += missingList.length;
  }

  if (totalMissing === 0) {
    toggle.classList.add('hidden');
    return;
  }

  countEl.textContent = totalMissing + '人';
  toggle.classList.remove('hidden');
}

/**
 * 构建"数据缺失"模态框内容。
 * @param {number[]} selectedClasses 当前勾选的班级编号数组
 */
function buildMissingDataContent(selectedClasses) {
  var contentEl = document.getElementById('missingDataContent');
  if (selectedClasses.length === 0) {
    contentEl.innerHTML = '<div class="missing-data-empty">请先在右下角勾选班级</div>';
    return;
  }

  var sectionsHTML = '';
  var totalMissing = 0;

  for (var i = 0; i < selectedClasses.length; i++) {
    var classNum = selectedClasses[i];
    var classColor = CLASS_COLORS[classNum];
    var missingList = ALL_MISSING_DATA[classNum] || [];

    totalMissing += missingList.length;

    if (missingList.length === 0) {
      sectionsHTML +=
        '<div class="missing-data-section">'
        + '<span class="missing-data-class-title">'
        + '<span class="missing-data-class-dot" style="background:' + classColor + ';"></span>'
        + classNum + '班 · 共0人'
        + '</span>'
        + '<p style="font-size:13px;color:#94a3b8;padding-left:8px;">该班暂无缺失数据 ✨</p>'
        + '</div>';
    } else {
      var nameItems = missingList.map(function (item) {
        return '<li>' + escapeHTML(item.name || '') + '</li>';
      }).join('');

      sectionsHTML +=
        '<div class="missing-data-section">'
        + '<span class="missing-data-class-title">'
        + '<span class="missing-data-class-dot" style="background:' + classColor + ';"></span>'
        + classNum + '班 · 共' + missingList.length + '人'
        + '</span>'
        + '<ul class="missing-data-list">' + nameItems + '</ul>'
        + '</div>';
    }
  }

  var summaryHTML = '<p style="text-align:center;font-size:13px;color:#64748b;margin-bottom:20px;">'
    + '当前已勾选 <strong>' + selectedClasses.length + '</strong> 个班级，'
    + '共 <strong style="color:#b8860b;">' + totalMissing + '</strong> 人缺少去向信息</p>';

  contentEl.innerHTML = summaryHTML + sectionsHTML;
}

/* ─── 数据统计 ───────────────────────────────────────────── */
function buildStatsContent() {
  const cityCounts = {};
  const uniCounts = {};
  let totalAll = 0;
  const classCounts = {};

  for (let i = 1; i <= 4; i++) {
    const data = ALL_CLASS_DATA[i] || [];
    const missingData = ALL_MISSING_DATA[i] || [];
    classCounts[i] = data.length + missingData.length;
    totalAll += data.length + missingData.length;
    data.forEach(function (s) {
      cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
      var baseName = getUniversityBaseName(s.university);
      uniCounts[baseName] = (uniCounts[baseName] || 0) + 1;
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
    const cityName = escapeHTML(entry[0]);
    const pct = (entry[1] / maxCity * 100).toFixed(1);
    return '<div class="bar-row">'
      + '<span class="bar-label">' + cityName + '</span>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:#3b82f6;"></div></div>'
      + '<span class="bar-count">' + entry[1] + '人</span>'
      + '</div>';
  }).join('');

  const uniBarsHTML = topUnis.map(function (entry) {
    const uniName = entry[0];
    const safeUniName = escapeHTML(uniName);
    var labelHTML;
    if (uniName.length > 6) {
      labelHTML = '<span class="bar-label" style="overflow:visible;"><marquee behavior="scroll" direction="left" scrollamount="2" loop="-1" style="width:88px;" title="' + safeUniName + '">' + safeUniName + '</marquee></span>';
    } else {
      labelHTML = '<span class="bar-label" title="' + safeUniName + '">' + safeUniName + '</span>';
    }
    const pct  = (entry[1] / maxUni * 100).toFixed(1);
    return '<div class="bar-row">'
      + labelHTML
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
    if (el) {
      const classCount = ALL_CLASS_DATA[i] ? ALL_CLASS_DATA[i].length : 0;
      const missingCount = ALL_MISSING_DATA[i] ? ALL_MISSING_DATA[i].length : 0;
      el.textContent = (classCount + missingCount) + '人';
    }
  }
}

function updateTotalCount() {
  let total = 0;
  for (let i = 1; i <= 4; i++) {
    if (document.getElementById('class' + i).checked) {
      const classCount = ALL_CLASS_DATA[i] ? ALL_CLASS_DATA[i].length : 0;
      const missingCount = ALL_MISSING_DATA[i] ? ALL_MISSING_DATA[i].length : 0;
      total += classCount + missingCount;
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

function parseStudentCoordinate(student) {
  if (!student) return null;
  const latitude = Number(student.latitude);
  const longitude = Number(student.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lng: longitude, lat: latitude };
}

function toLngLat(coordinate) {
  return new T.LngLat(coordinate.lng, coordinate.lat);
}

function isSameCoordinate(a, b) {
  if (!a || !b) return false;
  return a.lng === b.lng && a.lat === b.lat;
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

/**
 * 提取大学"本名"用于统计合并。
 * 一般情况：去除括号及其内容（中文全角括号和英文半角括号）。
 * 特例（不同校区实为不同大学）：中国地质大学（武汉/北京）、
 *   中国石油大学（北京/华东）、中国矿业大学（北京）
 *   这些保留完整原名，不做去除。
 */
function getUniversityBaseName(university) {
  if (!university) return '';
  // 特例白名单：这些括号内后缀标识了不同的独立大学
  var specials = [
    '中国地质大学（武汉）',
    '中国地质大学（北京）',
    '中国石油大学（北京）',
    '中国石油大学（华东）',
    '中国矿业大学（北京）',
    '中国矿业大学'
  ];
  for (var i = 0; i < specials.length; i++) {
    if (university === specials[i]) return university;
  }
  // 通用：去除中文全角括号（）及其内容，以及英文半角括号 () 及其内容
  return university.replace(/[（(][^）)]*[）)]/g, '').trim();
}

function escapeHTML(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

/**
 * 将"数据缺失"面板定位在"班级筛选"面板上方固定 16px 处。
 * 通过计算 classPanel 的 top 值（视口高度 - bottom - height）来获得班级筛选面板顶部位置，
 * 然后将 missingPanel 的底部放在 classPanel 顶部 + 16px 的位置。
 */
function positionMissingPanel() {
  var missingPanel = document.getElementById('missingDataToggle');
  var classPanel = document.getElementById('classPanel');
  if (!missingPanel || !classPanel) return;

  var classPanelStyle = window.getComputedStyle(classPanel);
  var classPanelHeight = classPanel.offsetHeight;
  var classPanelBottom = parseFloat(classPanelStyle.bottom) || 36;

  // 班级筛选面板顶部在视口中的 y 坐标 = 视口高度 - bottom - height
  var classPanelTop = window.innerHeight - classPanelBottom - classPanelHeight;

  // "数据缺失"面板底部 = 班级筛选面板顶部 + 16px（即在其上方 16px）
  var missingBottom = window.innerHeight - classPanelTop + 16;

  missingPanel.style.bottom = missingBottom + 'px';
}

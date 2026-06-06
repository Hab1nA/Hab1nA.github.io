/**
 * ─── 项目总配置 ────────────────────────────────────────────
 * 所有可调整配置集中于此文件，其余代码通过读取 CONFIG 来运行。
 *
 * 修改说明：
 *   - 修改 classCount 后，需在 data/ 下放置对应数量的 class{N}.js 文件
 *     （如 classCount=6 则需要 class1.js ~ class6.js）
 *   - classColors 中的 key 对应班级编号，value 为该班在地图上的标记颜色
 *   - validPasswordHashes 支持多个哈希值，任一个匹配即可通过验证
 */

const CONFIG = {
  /* ── 页面信息 ─────────────────────────────── */
  /** 页面顶部导航栏标题文字 */
  pageTitle: '天府第七中学 G2020 级蹭饭图',

  /** 口令验证界面的提示问题 */
  passwordPrompt: '这是哪所学校？',

  /* ── 口令验证 ─────────────────────────────── */
  /**
   * 合法口令的 SHA-256 哈希值数组。
   * 口令原文不会出现在代码中，仅在浏览器端做哈希比对。
   * 支持多种答案（如全称、简称等），任一个匹配即可通过验证。
   *
   * 生成新哈希的方式（浏览器控制台）：
   *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的口令'))
   *     .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join(''))
   */
  validPasswordHashes: [
    '61709488ccbe179a5e67f0e9743cfc3873738f77c44efb944cdd1664c99e17b3',
    '547971b416fcc76c0e08c153b12eff69ff5807c60271fe27187b95a359d6b396',
    '8fc5700a1439de46364bcb4ad2720479852cf8ed29769bcd588d20d52a34dc9a'
  ],

  /* ── 天地图 API ─────────────────────────────── */
  /** 天地图 API 密钥（TK），请在 https://lbs.tianditu.gov.cn/ 申请 */
  tiandituTK: '7403bbf65cbf354d6a9e3574134f9789',

  /* ── 班级配置 ─────────────────────────────── */
  /** 班级总数（核心配置，修改后需同步 data/ 下的数据文件） */
  classCount: 4,

  /**
   * 各班代表颜色（key 为班级编号 1~classCount，value 为 CSS 颜色值）
   * 用于地图标记、班级筛选面板的色点、统计图表等
   */
  classColors: {
    1: '#a74bb6', // 紫
    2: '#10b981', // 绿
    3: '#f59e0b', // 琥珀
    4: '#a3292b'  // 红
  },

  /**
   * 各班在 UI 中的显示名称（key 为班级编号）
   */
  classNames: {
    1: '1 班',
    2: '2 班',
    3: '3 班',
    4: '4 班'
  },

  /* ── 班级颜色名称映射（可选，用于关于弹窗描述） ─────── */
  /**
   * 十六进制颜色值 → 中文颜色名，供关于弹窗等 UI 文案使用。
   * 若某个颜色值未在此映射中找到，UI 中将直接显示其原色值。
   */
  colorNameMap: {
    '#a74bb6': '紫色',
    '#10b981': '绿色',
    '#f59e0b': '琥珀色',
    '#a3292b': '红色',
    '#3b82f6': '蓝色',
    '#ef4444': '红色',
    '#8b5cf6': '紫色',
    '#ec4899': '粉色',
    '#14b8a6': '青色',
    '#f97316': '橙色',
    '#6366f1': '靛蓝',
    '#22c55e': '绿色',
    '#9ca3af': '灰色'
  },

  /* ── 地图标记颜色 ─────────────────────────────── */
  /** 多班同校合并标记的颜色 */
  mergedMarkerColor: '#9ca3af',

  /* ── 地理编码配置 ─────────────────────────────── */
  /** 地理编码请求间隔（毫秒），避免触发 API 限流 */
  geocodeInterval: 250,

  /** 地理编码请求超时时间（毫秒） */
  geocodeTimeout: 8000,

  /** 连续失败阈值，超过此值判定为配额不足 */
  maxConsecutiveFailures: 5,

  /** 瓦片加载失败阈值（10秒窗口内） */
  tileErrorThreshold: 8,

  /* ── 性能配置 ─────────────────────────────────── */
  /** 地理编码缓存最大条目数 */
  maxGeoCacheSize: 500,

  /** 搜索防抖延迟（毫秒） */
  searchDebounceDelay: 300
};

/* ── 配置验证 ──────────────────────────────────────────── */
(function validateConfig() {
  const required = ['classCount', 'classColors', 'classNames', 'tiandituTK', 'validPasswordHashes'];
  const errors = [];

  for (let i = 0; i < required.length; i++) {
    if (!(required[i] in CONFIG)) {
      errors.push('缺少必需配置项: ' + required[i]);
    }
  }

  if (CONFIG.classCount && typeof CONFIG.classCount !== 'number') {
    errors.push('classCount 必须是数字');
  }

  if (CONFIG.classCount && CONFIG.classCount <= 0) {
    errors.push('classCount 必须大于 0');
  }

  if (CONFIG.classColors && typeof CONFIG.classColors !== 'object') {
    errors.push('classColors 必须是对象');
  }

  if (errors.length > 0) {
    console.error('配置验证失败:', errors.join('\n'));
    throw new Error('配置验证失败: ' + errors.join(', '));
  }
})();
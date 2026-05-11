// @name 两个BT
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.0.7
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/两个BT.js
/**
 * ============================================================================
 * 两个BT资源 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = "https://www.bttwoo.com";
const def_headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  Referer: "https://www.bttwoo.com/",
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

const PAGE_LIMIT = 20;

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[两个BT-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[两个BT-DEBUG] ${message}: ${error.message || error}`);
};

const encodeMeta = (obj) => {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
};

const decodeMeta = (str) => {
  try {
    const raw = Buffer.from(str || "", "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }
  if (mapping.episodeName) {
    const epName = mapping.episodeNumber + "." + mapping.episodeName;
    return epName;
  }
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
    );
    if (hit?.name) {
      return `${hit.episodeNumber}.${hit.name}`;
    }
  }
  return originalName;
};

/**
 * 图像地址修复
 */
const fixPicUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url.startsWith("/") ? `${host}${url}` : `${host}/${url}`;
};

const cleanText = (text) => (text || "").replace(/\s+/g, " ").trim();

const isBadPic = (url) => {
  if (!url) return true;
  return (
    url.includes("placeholder") ||
    url.includes("blank.gif") ||
    url.includes("base64") ||
    url.includes("/static/icons/") ||
    url.includes("favicon") ||
    url.includes("logo.png")
  );
};

const getPlaySlug = (url) => {
  if (!url) return "";
  const match = String(url).match(/\/play\/([^/?#"' ]+)/);
  return match ? match[1] : "";
};

const getPlayPath = (url) => {
  const slug = getPlaySlug(url);
  return slug ? `/play/${slug}` : "";
};

const buildAbsoluteUrl = (url) => {
  if (!url) return host;
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? host + url : `${host}/${url}`;
};

const getDetailField = ($, label) => {
  let value = "";
  $("div").each((_, elem) => {
    const $elem = $(elem);
    if (cleanText($elem.text()) !== label) return;
    const text = cleanText($elem.next().text());
    if (text) {
      value = text;
      return false;
    }
  });
  return value;
};

const CATEGORY_ROUTES = {
  movie: "/filter?classify=1",
  tv: "/filter?classify=2",
  anime: "/filter?classify=3",
  zgjun: "/filter?classify=2&areas=7,52",
  meiju: "/filter?classify=2&areas=5",
  jpsrtv: "/filter?classify=2&areas=11,12",
  gf: "/filter?sort_by=score&order=desc",
  "movie_bt_tags/xiju": "/filter?types=5",
  "movie_bt_tags/aiqing": "/filter?types=6",
  "movie_bt_tags/adt": "/filter?types=18",
  "movie_bt_tags/at": "/filter?types=10",
  "movie_bt_tags/donghua": "/filter?types=11",
  "movie_bt_tags/qihuan": "/filter?types=12",
  "movie_bt_tags/xuanni": "/filter?types=2",
  "movie_bt_tags/kehuan": "/filter?types=14",
  "movie_bt_tags/juqing": "/filter?types=1",
  "movie_bt_tags/kongbu": "/filter?types=3",
};

const appendQuery = (url, params = {}) => {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  if (parts.length === 0) return url;
  return url + (url.includes("?") ? "&" : "?") + parts.join("&");
};

/**
 * 检查搜索结果相关性
 */
const isRelevantSearchResult = (title, searchKey) => {
  if (!title || !searchKey) return false;

  const titleLower = title.toLowerCase();
  const searchKeyLower = searchKey.toLowerCase();

  if (titleLower.includes(searchKeyLower)) {
    return true;
  }

  const searchChars = new Set(searchKeyLower.replace(/\s+/g, ""));
  const titleChars = new Set(titleLower.replace(/\s+/g, ""));

  if (searchChars.size > 0) {
    const intersection = new Set([...searchChars].filter((x) => titleChars.has(x)));
    const matchRatio = intersection.size / searchChars.size;
    if (matchRatio >= 0.6) {
      return true;
    }
  }

  if (searchKeyLower.length <= 2) {
    return titleLower.includes(searchKeyLower);
  }

  return false;
};

/**
 * 从HTML提取视频列表
 */
const extractVideoList = ($, keyword = null) => {
  const list = [];
  const seenIds = new Set();

  $('a[href*="/play/"], li:has(a[href*="/movie/"]), .item li:has(a[href*="/movie/"])').each((i, elem) => {
    const $elem = $(elem);

    const link = $elem.is("a") ? $elem.attr("href") : $elem.find('a[href*="/play/"], a[href*="/movie/"]').attr("href");
    if (!link) return;

    const playSlug = getPlaySlug(link);
    const oldVodIdMatch = link.match(/\/movie\/(\d+)\.html/);
    if (!playSlug && !oldVodIdMatch) return;

    const vodId = playSlug || oldVodIdMatch[1];
    if (seenIds.has(vodId)) return;

    let title = "";
    const titleSelectors = ["[data-title]", "h3 a", "h3", "h2", "a[title]", ".title", ".name", "img[alt]"];

    for (const selector of titleSelectors) {
      const titleElem = $elem.find(selector);
      if (titleElem.length > 0) {
        title =
          cleanText(titleElem.first().attr("data-title")) ||
          cleanText(titleElem.first().attr("title")) ||
          cleanText(titleElem.first().attr("alt")) ||
          cleanText(titleElem.first().text());
        if (title && title.length > 1) break;
      }
    }

    if (!title) return;

    // 搜索时检查相关性
    if (keyword && !isRelevantSearchResult(title, keyword)) {
      return;
    }

    seenIds.add(vodId);

    let pic = "";
    const picSelectors = ["img[data-original]", "img[data-src]", "img[src]"];

    for (const selector of picSelectors) {
      const img = $elem.find(selector);
      if (img.length > 0) {
        for (let j = 0; j < img.length; j++) {
          const item = img.eq(j);
          const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
          if (!isBadPic(imgUrl)) {
            pic = imgUrl;
            break;
          }
        }
        if (pic) break;
      }
    }

    const rating = cleanText($elem.find("[data-rating]").first().attr("data-rating"));
    const text = cleanText($elem.text());
    const remarkMatch = text.match(/(4k|4K|1080p|1080P|HD|更新至\s*\d+|第\s*\d+\s*集|\d+(?:\.\d)?分)/);
    const remarks = rating ? `${rating}分` : remarkMatch ? remarkMatch[1] : "";

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: fixPicUrl(pic),
      vod_remarks: remarks || "",
    });
  });

  return list;
};

/**
 * 解析播放源为 OmniBox 格式
 */
const parsePlaySources = ($, vodId) => {
  try {
    logInfo("开始解析播放源");
    const sourceMap = new Map();
    const lineNames = {};
    const episodeManager = ($.html().match(/episodeManager\([^[]*\[([\s\S]*?)\]\)/) || [])[1] || "";

    episodeManager.replace(/lineName:\s*['"]([^'"]+)['"]/g, (_, name) => {
      const idx = Object.keys(lineNames).length + 1;
      lineNames[String(idx)] = name;
      return "";
    });

    const addEpisode = (line, ep) => {
      const lineId = String(line || "1");
      if (!sourceMap.has(lineId)) {
        sourceMap.set(lineId, {
          name: lineNames[lineId] || (lineId === "1" ? "默认播放" : `线路${lineId}`),
          episodes: [],
          seen: new Set(),
        });
      }

      const source = sourceMap.get(lineId);
      if (source.seen.has(ep.playId)) return;
      source.seen.add(ep.playId);
      source.episodes.push(ep);
    };

    $('a[href*="/play/"]').each((i, elem) => {
      const $elem = $(elem);
      if (!$elem.attr("dataid") && !$elem.attr("data-episode")) return;

      const epUrl = $elem.attr("href");
      const playPath = getPlayPath(epUrl);
      if (!playPath) return;

      const dataEpisode = $elem.attr("data-episode") || "";
      const dataLine = $elem.attr("data-line") || "1";
      const dataId = $elem.attr("dataid") || "";
      const rawTitle = cleanText($elem.text());
      const epTitle = rawTitle || (dataEpisode ? `第${dataEpisode}集` : "正片");
      const normalizedTitle = /^\d+$/.test(epTitle) ? `第${epTitle}集` : epTitle;
      const fid = dataId || `${vodId}#${dataLine}#${dataEpisode || i}`;

      addEpisode(dataLine, {
        name: normalizedTitle,
        playId: `${playPath}|||${encodeMeta({ sid: String(vodId || ""), fid, e: normalizedTitle, dataid: dataId })}`,
        _fid: fid,
        _rawName: normalizedTitle,
        _episodeIndex: Number(dataEpisode) || i,
      });
    });

    $('a[href*="/v_play/"]').each((i, elem) => {
      const $elem = $(elem);
      const epTitle = cleanText($elem.text());
      const epUrl = $elem.attr("href");

      if (epTitle && epUrl) {
        const playIdMatch = epUrl.match(/\/v_play\/([^.]+)\.html/);
        if (playIdMatch) {
          const fid = `${vodId}#0#${i}`;
          addEpisode("1", {
            name: epTitle,
            playId: `${playIdMatch[1]}|||${encodeMeta({ sid: String(vodId || ""), fid, e: epTitle })}`,
            _fid: fid,
            _rawName: epTitle,
            _episodeIndex: i,
          });
        }
      }
    });

    const playSources = [...sourceMap.values()].map((source) => ({
      name: source.name,
      episodes: source.episodes.sort((a, b) => {
        const episodeA = a._episodeIndex || Number((a._fid || "").match(/#(\d+)$/)?.[1] || 0);
        const episodeB = b._episodeIndex || Number((b._fid || "").match(/#(\d+)$/)?.[1] || 0);
        return episodeA - episodeB;
      }),
    }));

    if (playSources.length === 0) {
      const currentPath = getPlayPath($('link[rel="canonical"]').attr("href")) || "";
      const fallbackPath = currentPath || `/play/${vodId}`;
      playSources.push({
        name: "默认播放",
        episodes: [
          {
            name: "正片",
            playId: `${fallbackPath}|||${encodeMeta({ sid: String(vodId || ""), fid: `${vodId}#1#1`, e: "正片" })}`,
            _fid: `${vodId}#1#1`,
            _rawName: "正片",
            _episodeIndex: 1,
          },
        ],
      });
    }

    if (playSources.length > 0) {
      playSources.forEach((source) => {
        delete source.seen;
      });
    } else {
      playSources.push({
        name: "默认播放",
        episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }],
      });
    }

    logInfo("播放源解析结果", playSources);
    return playSources;
  } catch (e) {
    logError("解析播放源失败", e);
    return [{ name: "默认播放", episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }] }];
  }
};

/**
 * 构建URL
 */
const buildUrl = (tid, pg, extend = {}) => {
  try {
    const tidStr = String(tid || "filter");
    const route = CATEGORY_ROUTES[tidStr] || (tidStr.startsWith("/") ? tidStr : `/${tidStr}`);
    let url = buildAbsoluteUrl(route);

    if (pg && Number(pg) > 1) {
      url = appendQuery(url, { page: pg });
    }

    if (extend.area) {
      url = appendQuery(url, { areas: extend.area });
    }

    if (extend.year) {
      url = appendQuery(url, { years: extend.year });
    }

    return url;
  } catch (error) {
    logError("构建URL错误", error);
    return host + "/filter";
  }
};

// ========== 接口实现 ==========

async function home(params) {
  logInfo("进入首页");
  const result = {
    class: [{ type_id: "movie", type_name: "电影" },
    { type_id: "tv", type_name: "电视剧" },
    { type_id: "anime", type_name: "动漫" },
    { type_id: "zgjun", type_name: "国产剧" },
    { type_id: "meiju", type_name: "美剧" },
    { type_id: "jpsrtv", type_name: "日韩剧" },
    { type_id: "movie_bt_tags/xiju", type_name: "喜剧" },
    { type_id: "movie_bt_tags/aiqing", type_name: "爱情" },
    { type_id: "movie_bt_tags/adt", type_name: "冒险" },
    { type_id: "movie_bt_tags/at", type_name: "动作" },
    { type_id: "movie_bt_tags/donghua", type_name: "动画" },
    { type_id: "movie_bt_tags/qihuan", type_name: "奇幻" },
    { type_id: "movie_bt_tags/xuanni", type_name: "悬疑" },
    { type_id: "movie_bt_tags/kehuan", type_name: "科幻" },
    { type_id: "movie_bt_tags/juqing", type_name: "剧情" },
    { type_id: "movie_bt_tags/kongbu", type_name: "恐怖" },
    { type_id: "gf", type_name: "高分电影" },
    ],
    list: [],
  };

  try {
    const url = host;
    logInfo(`首页URL: ${url}`);
    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const list = extractVideoList($);
    logInfo(`首页获取到 ${list.length} 个项目`);
    result.list = list;
  } catch (e) {
    logError("首页请求失败", e);
  }

  return result;
}

async function category(params) {
  const { categoryId, page } = params;
  const pg = parseInt(page) || 1;
  logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);

  try {
    const url = buildUrl(categoryId, pg);
    logInfo(`分类URL: ${url}`);

    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($);

    logInfo(`分类 ${categoryId} 第 ${pg} 页获取到 ${list.length} 个项目`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
    };
  } catch (e) {
    logError("分类请求失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function search(params) {
  const wd = params.keyword || params.wd || "";
  const pg = parseInt(params.page) || 1;
  logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

  try {
    let searchUrl = `${host}/search?q=${encodeURIComponent(wd)}`;
    if (pg && pg !== 1) {
      searchUrl += `&page=${pg}`;
    }

    logInfo(`搜索URL: ${searchUrl}`);

    const res = await axiosInstance.get(searchUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($, wd);

    logInfo(`搜索 "${wd}" 找到 ${list.length} 个结果`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
    };
  } catch (e) {
    logError("搜索失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId;
  logInfo(`请求详情 ID: ${videoId}`);

  try {
    let detailUrl = String(videoId || "");
    if (detailUrl.includes("://")) {
      detailUrl = detailUrl;
    } else if (detailUrl.startsWith("/play/") || detailUrl.startsWith("/movie/")) {
      detailUrl = host + detailUrl;
    } else if (detailUrl.startsWith("play/") || detailUrl.startsWith("movie/")) {
      detailUrl = host + "/" + detailUrl;
    } else if (/^\d+$/.test(detailUrl)) {
      detailUrl = `${host}/movie/${detailUrl}.html`;
    } else {
      detailUrl = `${host}/play/${detailUrl}`;
    }

    logInfo(`详情URL: ${detailUrl}`);

    const res = await axiosInstance.get(detailUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const detailVodId = getPlaySlug(detailUrl) || String(videoId || "");

    let title = "";
    const titleSelectors = ["h1", "h2", "title"];
    for (const selector of titleSelectors) {
      const titleElem = $(selector);
      if (titleElem.length > 0) {
        title = cleanText(titleElem.text());
        if (title) break;
      }
    }

    let pic = "";
    pic = $(".video-player[data-poster]").first().attr("data-poster") || "";
    const picSelectors = [".movie-poster img", ".video-player img", "main img[data-src]", "main img[src]", "img[src]"];
    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            const alt = cleanText(item.attr("alt"));
            if (!isBadPic(imgUrl) && (!title || !alt || title.includes(alt) || alt.includes(title))) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            if (!isBadPic(imgUrl)) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    let desc = "";
    const descSelectors = ['h3:contains("剧情简介")', 'h3:contains("简介")', ".intro", ".description", ".desc"];
    for (const selector of descSelectors) {
      const descElem = $(selector);
      if (descElem.length > 0) {
        desc = selector.startsWith("h3")
          ? cleanText(descElem.first().parent().find("p").first().text())
          : cleanText(descElem.first().text());
        if (desc) break;
      }
    }

    let actor = getDetailField($, "主演");
    const actorSelectors = ['li:contains("主演")', 'span:contains("主演") + span'];
    for (const selector of actorSelectors) {
      if (actor) break;
      const actorElem = $(selector);
      if (actorElem.length > 0) {
        actor = actorElem
          .text()
          .trim()
          .replace(/主演[:：]?/g, "")
          .trim();
        if (actor) break;
      }
    }

    let director = getDetailField($, "导演");
    const directorSelectors = ['li:contains("导演")', 'span:contains("导演") + span'];
    for (const selector of directorSelectors) {
      if (director) break;
      const directorElem = $(selector);
      if (directorElem.length > 0) {
        director = directorElem
          .text()
          .trim()
          .replace(/导演[:：]?/g, "")
          .trim();
        if (director) break;
      }
    }

    const playSources = parsePlaySources($, detailVodId);

    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
    const scrapeCandidates = [];

    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        if (!ep._fid) continue;
        scrapeCandidates.push({
          fid: ep._fid,
          file_id: ep._fid,
          file_name: ep._rawName || ep.name || "正片",
          name: ep._rawName || ep.name || "正片",
          format_type: "video",
        });
      }
    }

    if (scrapeCandidates.length > 0) {
      try {
        const videoIdForScrape = String(detailVodId || videoId || "");
        const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || "", title || "", scrapeCandidates);
        OmniBox.log("info", `[两个BT-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
        scrapeType = metadata?.scrapeType || "";
        logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
      } catch (e) {
        logError("刮削处理失败", e);
      }
    }

    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
        if (!mapping) continue;
        const oldName = ep.name;
        const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
        if (newName && newName !== oldName) {
          ep.name = newName;
          OmniBox.log("info", `[两个BT-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
        }
        ep._seasonNumber = mapping.seasonNumber;
        ep._episodeNumber = mapping.episodeNumber;
      }

      const hasEpisodeNumber = (source.episodes || []).some(
        (ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null
      );
      if (hasEpisodeNumber) {
        source.episodes.sort((a, b) => {
          const seasonA = a._seasonNumber || 0;
          const seasonB = b._seasonNumber || 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          const episodeA = a._episodeNumber || 0;
          const episodeB = b._episodeNumber || 0;
          return episodeA - episodeB;
        });
      }
    }

    const normalizedPlaySources = playSources.map((source) => ({
      name: source.name,
      episodes: (source.episodes || []).map((ep) => ({
        name: ep.name,
        playId: ep.playId,
      })),
    }));

    logInfo("详情接口返回数据");

    return {
      list: [
        {
          vod_id: String(detailVodId || videoId),
          vod_name: scrapeData?.title || title || "未知标题",
          vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fixPicUrl(pic),
          vod_content: scrapeData?.overview || desc || "",
          vod_play_sources: normalizedPlaySources,
          vod_year: "",
          vod_area: "",
          vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || actor || "",
          vod_director:
            (scrapeData?.credits?.crew || [])
              .filter((c) => c?.job === "Director" || c?.department === "Directing")
              .slice(0, 3)
              .map((c) => c?.name)
              .filter(Boolean)
              .join(",") ||
            director ||
            "",
          type_name: "",
        },
      ],
    };
  } catch (e) {
    logError("详情获取失败", e);
    return { list: [] };
  }
}

async function play(params) {
  const rawPlayId = params.playId;
  logInfo(`准备播放 ID: ${rawPlayId}`);

  try {
    let playUrl = rawPlayId;
    let playMeta = {};
    if (rawPlayId && rawPlayId.includes("|||")) {
      const [mainPlayId, metaB64] = rawPlayId.split("|||");
      playUrl = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
    }

    const legacyCandidate =
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      /^[A-Za-z0-9+/=]{10,}$/.test(playUrl);
    let legacyDecoded = "";
    if (legacyCandidate) {
      try {
        legacyDecoded = Buffer.from(playUrl, "base64").toString("utf-8");
      } catch {
        legacyDecoded = "";
      }
    }
    const isLegacyPlayId = legacyCandidate && /(mv_|nm_|v_play)/.test(legacyDecoded);

    // 旧版是 Base64 播放 ID，新版是 /play/slug 页面。
    if (isLegacyPlayId) {
      logInfo(`解码播放ID: ${legacyDecoded}`);
      playUrl = `${host}/v_play/${playUrl}.html`;
    } else if (
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      !playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|$)/i)
    ) {
      playUrl = `/play/${playUrl}`;
    }

    try {
      const videoIdFromParam = params.vodId ? String(params.vodId) : "";
      const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
      const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
      if (videoIdForScrape) {
        await OmniBox.getScrapeMetadata(videoIdForScrape);
      }
    } catch (e) {
      logInfo(`读取刮削元数据失败: ${e.message}`);
    }

    // 确保URL格式正确
    if (playUrl && !playUrl.startsWith("http")) {
      playUrl = playUrl.startsWith("/") ? host + playUrl : host + "/" + playUrl;
    }

    logInfo(`处理后的播放URL: ${playUrl}`);

    // 检查是否是直接播放链接
    const isDirectPlayable = playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);

    if (isDirectPlayable) {
      logInfo(`直接播放地址`);
      return {
        urls: [{ name: "默认线路", url: playUrl }],
        parse: 0,
        header: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: host + "/",
          Origin: host,
        },
      };
    } else {
      logInfo(`需要解析的播放页`);
      const { url, header } = await OmniBox.sniffVideo(playUrl);
      // 返回播放页URL，让播放器解析
      return {
        urls: [{ name: "默认线路", url: url }],
        parse: 0,
        header: header,
      };
    }
  } catch (e) {
    logError("解析播放地址失败", e);
    // 错误时也构建完整URL
    const fallbackMain = String(rawPlayId || "").split("|||")[0];
    const fallbackUrl = fallbackMain.startsWith("/play/")
      ? host + fallbackMain
      : fallbackMain.startsWith("play/")
        ? host + "/" + fallbackMain
        : `${host}/v_play/${fallbackMain}.html`;
    return {
      urls: [{ name: "默认线路", url: fallbackUrl }],
      parse: 1,
      header: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: host + "/",
        Origin: host,
      },
    };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

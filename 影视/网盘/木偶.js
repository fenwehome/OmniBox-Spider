// @name 玩偶系模板
// 引入 OmniBox SDK
const OmniBox = require("omnibox_sdk");  
// 引入 cheerio(用于 HTML 解析)
let cheerio;
try {
  cheerio = require("cheerio");
} catch (error) {
  throw new Error("cheerio 模块未找到,请先安装:npm install cheerio");
}  

// ==================== 配置区域 ====================
// 网站地址(可以通过环境变量配置，支持多个域名用;分割)
const WEB_SITE_CONFIG = process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;";
const WEB_SITES = WEB_SITE_CONFIG.split(';').map(url => url.trim()).filter(url => url);

if (WEB_SITES.length === 0) {
  throw new Error("WEB_SITE 配置不能为空");
}

OmniBox.log("info", `配置了 ${WEB_SITES.length} 个域名: ${WEB_SITES.join(', ')}`);

/**
 * 带容灾的请求函数
 * @param {string} path - 请求路径（相对路径）
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 返回响应对象，包含 response 和 baseUrl
 */
async function requestWithFailover(path, options = {}) {
  let lastError = null;
  
  for (let i = 0; i < WEB_SITES.length; i++) {
    const baseUrl = removeTrailingSlash(WEB_SITES[i]);
    const fullUrl = path.startsWith('http') ? path : baseUrl + path;
    
    try {
      OmniBox.log("info", `尝试请求域名 ${i + 1}/${WEB_SITES.length}: ${fullUrl}`);
      
      const response = await OmniBox.request(fullUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        ...options,
      });
      
      if (response.statusCode === 200 && response.body) {
        OmniBox.log("info", `域名 ${baseUrl} 请求成功`);
        return { response, baseUrl };
      } else {
        OmniBox.log("warn", `域名 ${baseUrl} 返回非200状态码: ${response.statusCode}`);
        lastError = new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      OmniBox.log("warn", `域名 ${baseUrl} 请求失败: ${error.message}`);
      lastError = error;
      
      // 如果不是最后一个域名，继续尝试下一个
      if (i < WEB_SITES.length - 1) {
        continue;
      }
    }
  }
  
  // 所有域名都失败
  throw lastError || new Error("所有域名请求均失败");
}

/**
 * 获取可用的基础 URL（用于构建完整图片链接等）
 * @returns {string} 第一个配置的域名
 */
function getBaseUrl() {
  return removeTrailingSlash(WEB_SITES[0]);
}

/**
 * 筛选配置
 */
const FILTERS = {
  "25": [
    {
      "key": "area",
      "name": "地区",
      "init": "",
      "value": [
        { "name": "全部地区", "value": "" },
        { "name": "中国大陆", "value": "中国大陆" },
        { "name": "大陆", "value": "大陆" },
        { "name": "美国", "value": "美国" },
        { "name": "香港", "value": "香港" },
        { "name": "韩国", "value": "韩国" },
        { "name": "英国", "value": "英国" },
        { "name": "台湾", "value": "台湾" },
        { "name": "日本", "value": "日本" },
        { "name": "法国", "value": "法国" },
        { "name": "意大利", "value": "意大利" },
        { "name": "德国", "value": "德国" },
        { "name": "西班牙", "value": "西班牙" },
        { "name": "泰国", "value": "泰国" },
        { "name": "其它", "value": "其它" }
      ]
    },
    {
      "key": "lang",
      "name": "语言",
      "init": "",
      "value": [
        { "name": "全部语言", "value": "" },
        { "name": "国语", "value": "国语" },
        { "name": "英语", "value": "英语" },
        { "name": "粤语", "value": "粤语" },
        { "name": "闽南语", "value": "闽南语" },
        { "name": "韩语", "value": "韩语" },
        { "name": "日语", "value": "日语" },
        { "name": "法语", "value": "法语" },
        { "name": "德语", "value": "德语" },
        { "name": "其它", "value": "其它" }
      ]
    },
    {
      "key": "year",
      "name": "时间",
      "init": "",
      "value": [
        { "name": "全部时间", "value": "" },
        { "name": "2026", "value": "2026" },
        { "name": "2025", "value": "2025" },
        { "name": "2024", "value": "2024" },
        { "name": "2023", "value": "2023" },
        { "name": "2022", "value": "2022" },
        { "name": "2021", "value": "2021" },
        { "name": "2020", "value": "2020" },
        { "name": "2019", "value": "2019" },
        { "name": "2018", "value": "2018" },
        { "name": "2017", "value": "2017" },
        { "name": "2016", "value": "2016" },
        { "name": "2015", "value": "2015" },
        { "name": "2014", "value": "2014" },
        { "name": "2013", "value": "2013" },
        { "name": "2012", "value": "2012" },
        { "name": "2011", "value": "2011" },
        { "name": "2010", "value": "2010" }
      ]
    },
    {
      "key": "letter",
      "name": "字母",
      "init": "",
      "value": [
        { "name": "全部字母", "value": "" },
        { "name": "A", "value": "A" },
        { "name": "B", "value": "B" },
        { "name": "C", "value": "C" },
        { "name": "D", "value": "D" },
        { "name": "E", "value": "E" },
        { "name": "F", "value": "F" },
        { "name": "G", "value": "G" },
        { "name": "H", "value": "H" },
        { "name": "I", "value": "I" },
        { "name": "J", "value": "J" },
        { "name": "K", "value": "K" },
        { "name": "L", "value": "L" },
        { "name": "M", "value": "M" },
        { "name": "N", "value": "N" },
        { "name": "O", "value": "O" },
        { "name": "P", "value": "P" },
        { "name": "Q", "value": "Q" },
        { "name": "R", "value": "R" },
        { "name": "S", "value": "S" },
        { "name": "T", "value": "T" },
        { "name": "U", "value": "U" },
        { "name": "V", "value": "V" },
        { "name": "W", "value": "W" },
        { "name": "X", "value": "X" },
        { "name": "Y", "value": "Y" },
        { "name": "Z", "value": "Z" },
        { "name": "0-9", "value": "0-9" }
      ]
    },
    {
      "key": "sort",
      "name": "排序",
      "init": "",
      "value": [
        { "name": "默认排序", "value": "" },
        { "name": "人气", "value": "hits" },
        { "name": "评分", "value": "score" }
      ]
    }
  ],
  // ... 其他FILTERS配置保持不变
};

// ==================== 配置区域结束 ====================  

/**
 * 移除 URL 末尾的斜杠
 * @param {string} url - URL 字符串
 * @returns {string} 处理后的 URL
 */
function removeTrailingSlash(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}  

/**
 * 判断是否为视频文件
 * @param {Object} file - 文件对象
 * @returns {boolean} 是否为视频文件
 */
function isVideoFile(file) {
  if (!file || !file.file_name) {
    return false;
  }  
  
  const fileName = file.file_name.toLowerCase();
  const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];  
  
  for (const ext of videoExtensions) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }  
  
  if (file.format_type) {
    const formatType = String(file.format_type).toLowerCase();
    if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) {
      return true;
    }
  }  
  
  return false;
}  

/**
 * 递归获取所有视频文件
 */
async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!files || !Array.isArray(files)) {
    return [];
  }  
  
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) {
      return [file];
    } else if (file.dir) {
      const startTime = performance.now();  
      
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);  
        
        OmniBox.log("info", `获取目录 [${file.name || file.fid}] 耗时: ${duration}ms`);  
        
        if (subFileList?.files && Array.isArray(subFileList.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
        return [];
      } catch (error) {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);  
        
        const errorInfo = {
          path: file.name || file.fid,
          fid: file.fid,
          message: error.message,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
        errors.push(errorInfo);
        OmniBox.log("warn", `获取子目录失败 [${file.name || file.fid}] 耗时: ${duration}ms, 错误: ${error.message}`);
        return [];
      }
    }
    return [];
  });  
  
  const results = await Promise.all(tasks);
  return results.flat();
}  

/**
 * 格式化文件大小
 */
function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }  
  
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];  
  
  if (size < unit) {
    return `${size}B`;
  }  
  
  let exp = 0;
  let sizeFloat = size;
  while (sizeFloat >= unit && exp < units.length - 1) {
    sizeFloat /= unit;
    exp++;
  }  
  
  if (sizeFloat === Math.floor(sizeFloat)) {
    return `${Math.floor(sizeFloat)}${units[exp]}`;
  }
  return `${sizeFloat.toFixed(2)}${units[exp]}`;
}  

/**
 * 获取首页数据
 */
async function home(params) {
  try {
    OmniBox.log("info", "获取首页数据");  
    
    let classes = [];
    let list = [];  
    
    try {
      // 使用容灾请求
      const { response, baseUrl } = await requestWithFailover('/');
      
      if (response.statusCode === 200 && response.body) {
        const $ = cheerio.load(response.body);
        
        // 从导航菜单中提取分类
        const tabItems = $(".module-tab-items .module-tab-item");
        tabItems.each((_, element) => {
          const $item = $(element);
          const typeId = $item.attr("data-id");
          const typeName = $item.attr("data-name");
          
          if (typeId && typeId !== "0" && typeName) {
            classes.push({
              type_id: typeId,
              type_name: typeName.trim(),
            });
          }
        });
        
        OmniBox.log("info", `从首页导航提取到 ${classes.length} 个分类`);
        
        // 提取首页影片列表
        const firstModule = $(".module").first();
        
        if (firstModule.length > 0) {
          const moduleItems = firstModule.find(".module-item");
          
          moduleItems.each((_, element) => {
            const $item = $(element);
            const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
            const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();
            
            let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
            if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
              vodPic = baseUrl + vodPic;
            }
            
            const vodRemarks = $item.find(".module-item-text").text().trim();
            const vodYear = $item.find(".module-item-caption span").first().text().trim();
            
            if (href && vodName) {
              list.push({
                vod_id: href,
                vod_name: vodName,
                vod_pic: vodPic || "",
                type_id: "",
                type_name: "",
                vod_remarks: vodRemarks || "",
                vod_year: vodYear || "",
              });
            }
          });
          
          OmniBox.log("info", `从首页提取到 ${list.length} 个影片`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `从首页提取数据失败: ${error.message}`);
    }
    
    return {
      class: classes,
      list: list,
      filters: FILTERS,
    };
  } catch (error) {
    OmniBox.log("error", `获取首页数据失败: ${error.message}`);
  }
}  

/**
 * 获取分类数据
 */
async function category(params) {
  try {
    const categoryId = params.categoryId || params.type_id || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};  
    
    OmniBox.log("info", `获取分类数据: categoryId=${categoryId}, page=${page}`);  
    
    if (!categoryId) {
      OmniBox.log("warn", "分类ID为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }  
    
    // 构建请求 URL
    let url = '/index.php/vod/show';
    if (filters.area) {
      url += `/area/${filters.area}`;
    }
    if (filters.sort) {
      url += `/by/${filters.sort}`;
    }
    if (filters.class) {
      url += `/class/${filters.class}`;
    }
    if (filters.lang) {
      url += `/lang/${filters.lang}`;
    }
    if (filters.letter) {
      url += `/letter/${filters.letter}`;
    }
    if (filters.year) {
      url += `/year/${filters.year}`;
    }
    if (filters.tid) {
      url += `/id/${filters.tid}.html`;
    } else {
      url += `/id/${categoryId}/page/${page}.html`;
    }
    
    // 使用容灾请求
    const { response, baseUrl } = await requestWithFailover(url);
    
    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }  
    
    // 解析 HTML
    const $ = cheerio.load(response.body);
    const videos = [];  
    
    const vodItems = $("#main .module-item");
    vodItems.each((_, e) => {
      const $item = $(e);
      const href = $item.find(".module-item-pic a").attr("href");
      const vodName = $item.find(".module-item-pic img").attr("alt");
      let vodPic = $item.find(".module-item-pic img").attr("data-src");
      if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
        vodPic = baseUrl + vodPic;
      }
      const vodRemarks = $item.find(".module-item-text").text();
      const vodYear = $item.find(".module-item-caption span").first().text();  
      
      if (href && vodName) {
        videos.push({
          vod_id: href,
          vod_name: vodName,
          vod_pic: vodPic || "",
          type_id: categoryId,
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
        });
      }
    });  
    
    OmniBox.log("info", `解析完成,找到 ${videos.length} 个视频`);  
    
    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `获取分类数据失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}  

/**
 * 获取视频详情
 */
async function detail(params) {
  try {
    const videoId = params.videoId || "";  
    
    if (!videoId) {
      throw new Error("视频ID不能为空");
    }  
    
    const source = params.source || "";  
    OmniBox.log("info", `获取视频详情: videoId=${videoId}, source=${source}`);  
    
    // 使用容灾请求
    const { response, baseUrl } = await requestWithFailover(videoId);
    
    if (response.statusCode !== 200 || !response.body) {
      throw new Error(`请求失败: HTTP ${response.statusCode}`);
    }  
    
    // 解析 HTML
    const $ = cheerio.load(response.body);  
    
    // 获取基本信息
    const vodName = $(".page-title")[0]?.children?.[0]?.data || "";
    let vodPic = $($(".mobile-play")).find(".lazyload")[0]?.attribs?.["data-src"] || "";
    if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
      vodPic = baseUrl + vodPic;
    }  
    
    // 获取详细信息
    let vodYear = "";
    let vodDirector = "";
    let vodActor = "";
    let vodContent = "";  
    
    const videoItems = $(".video-info-itemtitle");
    for (const item of videoItems) {
      const key = $(item).text();
      const vItems = $(item).next().find("a");
      const value = vItems
        .map((i, el) => {
          const text = $(el).text().trim();
          return text ? text : null;
        })
        .get()
        .filter(Boolean)
        .join(", ");  
      
      if (key.includes("剧情")) {
        vodContent = $(item).next().find("p").text().trim();
      } else if (key.includes("导演")) {
        vodDirector = value.trim();
      } else if (key.includes("主演")) {
        vodActor = value.trim();
      }
    }  
    
    // 获取网盘链接列表
    const panUrls = [];
    const items = $(".module-row-info");
    for (const item of items) {
      const shareUrl = $(item).find("p")[0]?.children?.[0]?.data;
      if (shareUrl) {
        panUrls.push(shareUrl.trim());
      }
    }  
    
    OmniBox.log("info", `解析完成,找到 ${panUrls.length} 个网盘链接`);  
    
    // 构建播放源
    const playSources = [];  
    
    const driveTypeCountMap = {};
    for (const shareURL of panUrls) {
      const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
      const displayName = driveInfo.displayName || "未知网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
    }  
    
    const driveTypeCurrentIndexMap = {};  
    
    for (const shareURL of panUrls) {
      try {
        OmniBox.log("info", `处理网盘链接: ${shareURL}`);  
        
        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        let displayName = driveInfo.displayName || "未知网盘";  
        
        const totalCount = driveTypeCountMap[displayName] || 0;
        if (totalCount > 1) {
          driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
          displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
        }  
        
        OmniBox.log("info", `网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);  
        
        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        if (!fileList || !fileList.files || !Array.isArray(fileList.files)) {
          OmniBox.log("warn", `获取文件列表失败: ${shareURL}`);
          continue;
        }  
        
        OmniBox.log("info", `获取文件列表成功,文件数量: ${fileList.files.length}`);  
        
        const allVideoFiles = await getAllVideoFiles(shareURL, fileList.files, "0");  
        
        if (allVideoFiles.length === 0) {
          OmniBox.log("warn", `未找到视频文件: ${shareURL}`);
          continue;
        }  
        
        OmniBox.log("info", `递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);  
        
        let sourceNames = [displayName];
        if (driveInfo.driveType === "quark") {
          sourceNames = ["本地代理", "服务端代理", "直连"];
          OmniBox.log("info", `${displayName}支持多线路: ${sourceNames.join(", ")}`);  
          
          if (source === "web") {
            sourceNames = sourceNames.filter((name) => name !== "本地代理");
            OmniBox.log("info", `来源为网页端,已过滤掉"本地代理"线路`);
          }
        }  
        
        for (const sourceName of sourceNames) {
          const episodes = [];
          for (const file of allVideoFiles) {
            const fileName = file.file_name || "";
            const fileId = file.fid || "";
            const fileSize = file.size || file.file_size || 0;  
            
            if (!fileName || !fileId) {
              continue;
            }  
            
            let displayFileName = fileName;
            if (fileSize > 0) {
              const fileSizeStr = formatFileSize(fileSize);
              if (fileSizeStr) {
                displayFileName = `[${fileSizeStr}] ${fileName}`;
              }
            }  
            
            const episode = {
              name: displayFileName,
              playId: `${shareURL}|${fileId}`,
              size: fileSize > 0 ? fileSize : undefined,
            };  
            
            episodes.push(episode);
          }  
          
          if (episodes.length > 0) {
            let finalSourceName = sourceName;
            if (driveInfo.driveType === "quark") {
              finalSourceName = `${displayName}-${sourceName}`;
            }  
            
            playSources.push({
              name: finalSourceName,
              episodes: episodes,
            });
          }
        }
      } catch (error) {
        OmniBox.log("error", `处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
      }
    }  
    
    OmniBox.log("info", `构建播放源完成,网盘数量: ${playSources.length}`);  
    
    const vodDetail = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
      vod_play_sources: playSources.length > 0 ? playSources : undefined,
      vod_remarks: "",
    };  
    
    return {
      list: [vodDetail],
    };
  } catch (error) {
    OmniBox.log("error", `获取视频详情失败: ${error.message}`);
    return {
      list: [],
    };
  }
}  

/**
 * 搜索视频
 */
async function search(params) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);  
    
    OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);  
    
    if (!keyword) {
      OmniBox.log("warn", "搜索关键词为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }  
    
    // 使用容灾请求
    const searchPath = `/index.php/vod/search/page/${page}/wd/${keyword}.html`;
    const { response, baseUrl } = await requestWithFailover(searchPath);
    
    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }  
    
    // 解析 HTML
    const $ = cheerio.load(response.body);
    const videos = [];  
    
    const items = $(".module-search-item");
    for (const item of items) {
      const $item = $(item);
      const videoSerial = $item.find(".video-serial")[0];
      const vodPicImg = $item.find(".module-item-pic > img")[0];  
      
      if (videoSerial && videoSerial.attribs) {
        const vodId = videoSerial.attribs.href || "";
        const vodName = videoSerial.attribs.title || "";
        let vodPic = vodPicImg?.attribs?.["data-src"] || "";
        if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
          vodPic = baseUrl + vodPic;
        }
        const vodRemarks = $($item.find(".video-serial")[0]).text() || "";  
        
        if (vodId && vodName) {
          videos.push({
            vod_id: vodId,
            vod_name: vodName,
            vod_pic: vodPic,
            type_id: "",
            type_name: "",
            vod_remarks: vodRemarks,
          });
        }
      }
    }  
    
    OmniBox.log("info", `搜索完成,找到 ${videos.length} 个结果`);  
    
    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `搜索视频失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}  

/**
 * 获取播放地址
 */
async function play(params) {
  try {
    const flag = params.flag || "";
    const playId = params.playId || "";  
    
    OmniBox.log("info", `获取播放地址: flag=${flag}, playId=${playId}`);  
    
    if (!playId) {
      throw new Error("播放参数不能为空");
    }  
    
    const parts = playId.split("|");
    if (parts.length < 2) {
      throw new Error("播放参数格式错误,应为:分享链接|文件ID");
    }
    const shareURL = parts[0] || "";
    const fileId = parts[1] || "";  
    
    if (!shareURL || !fileId) {
      throw new Error("分享链接或文件ID不能为空");
    }  
    
    OmniBox.log("info", `解析参数: shareURL=${shareURL}, fileId=${fileId}`);  
    
    // 获取刮削元数据用于弹幕匹配
    let danmakuList = [];
    try {
      const metadata = await OmniBox.getScrapeMetadata(shareURL);
      if (metadata && metadata.scrapeData && metadata.videoMappings) {
        const formattedFileId = fileId ? `${shareURL}|${fileId}` : "";  
        
        let matchedMapping = null;
        for (const mapping of metadata.videoMappings) {
          if (mapping.fileId === formattedFileId) {
            matchedMapping = mapping;
            break;
          }
        }  
        
        if (matchedMapping && metadata.scrapeData) {
          const scrapeData = metadata.scrapeData;
          OmniBox.log("info", `找到文件映射,fileId: ${formattedFileId}`);  
          
          let fileName = "";
          const scrapeType = metadata.scrapeType || "";
          if (scrapeType === "movie") {
            fileName = scrapeData.title || "";
          } else {
            const title = scrapeData.title || "";
            const seasonAirYear = scrapeData.seasonAirYear || "";
            const seasonNumber = matchedMapping.seasonNumber || 1;
            const episodeNumber = matchedMapping.episodeNumber || 1;
            fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
          }  
          
          if (fileName) {
            OmniBox.log("info", `生成fileName用于弹幕匹配: ${fileName}`);
            danmakuList = await OmniBox.getDanmakuByFileName(fileName);
            if (danmakuList && danmakuList.length > 0) {
              OmniBox.log("info", `弹幕匹配成功,找到 ${danmakuList.length} 条弹幕`);
            }
          }
        }
      }
    } catch (error) {
      OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
    }  
    
    // 从flag中提取线路类型
    let routeType = "服务端代理";
    if (flag && flag.includes("-")) {
      const parts = flag.split("-");
      routeType = parts[parts.length - 1];
    }  
    
    OmniBox.log("info", `使用线路: ${routeType}`);  
    
    const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);  
    
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }  
    
    const urlList = playInfo.url || [];  
    
    let urlsResult = [];
    for (const item of urlList) {
      urlsResult.push({
        name: item.name || "播放",
        url: item.url,
      });
    }  
    
    let header = playInfo.header || {};  
    
    let finalDanmakuList = danmakuList && danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];  
    
    return {
      urls: urlsResult,
      flag: shareURL,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList,
    };
  } catch (error) {
    OmniBox.log("error", `播放接口失败: ${error.message}`);
    return {
      urls: [],
      flag: params.flag || "",
      header: {},
      danmaku: [],
    };
  }
}  

// 导出接口
module.exports = {
  home,
  category,
  search,
  detail,
  play,
};  

// 使用公共 runner 处理标准输入/输出
const runner = require("spider_runner");
runner.run(module.exports);

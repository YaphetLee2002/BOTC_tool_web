# 血染钟楼 Wiki 角色服务

基于 Gin + GORM + SQLite 的血染钟楼角色数据服务，启动时自动从
[钟楼百科](https://clocktower-wiki.gstonegames.com/) 抓取并持久化全部角色，
随后提供 HTTP 查询接口。完全使用 Docker 构建与运行。

## 数据模型

### 固定枚举

| CharacterSet（角色集） | ID |
| --- | --- |
| 暗流涌动 | 1 |
| 黯月初升 | 2 |
| 梦殒春宵 | 3 |
| 实验性角色 | 4 |
| 华灯初上 | 5 |
| 山雨欲来 | 6 |

| CharacterType（角色类别） | ID |
| --- | --- |
| 镇民 | 1 |
| 外来者 | 2 |
| 爪牙 | 3 |
| 恶魔 | 4 |
| 旅行者 | 5 |
| 传奇角色 | 6 |
| 奇遇角色 | 7 |

### 表

- `characters`：`id / name(unique) / image_url / wiki_url / wiki_content(JSON文本) / created_at / updated_at`。
  `wiki_content` 形如：
  ```json
  {"sections":[{"title":"背景故事","content":"..."},{"title":"角色能力","content":"..."}]}
  ```
- `character_categories`：一个角色在哪些 `(set_id, type_id)` 组合里出现过的多对多记录。
  旅行者 / 传奇角色 / 奇遇角色这种不属于任何角色集的角色，`set_id=0`。

## 爬虫策略

1. 请求 6 个角色集页面（`暗流涌动`、`黯月初升`、`梦殒春宵`、`实验性角色`、`华灯初上`、`山雨欲来`），按页面内 `h2` 分节（`镇民/外来者/爪牙/恶魔/旅行者/...`）把该节 `ul.gallery` 中的角色归类。
2. 请求 `旅行者` / `传奇角色` / `奇遇角色` 三个独立类别列表页，抓取对应类别下的全部角色（`set_id=0`）。
3. 对收集到的每个角色名字（去重后）访问其 wiki 详情页，提取顶部首图与所有 `h2` 小节作为 `wiki_content`。
4. 通过 `ON CONFLICT(name) DO UPDATE` upsert 写入 SQLite。

抓取触发策略由 `SCRAPE_ON_START` 环境变量控制：

- `always`：每次启动都抓
- `never`：启动时从不抓
- 其他（默认）：仅在数据库为空时抓

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/sets` | 所有角色集枚举 |
| GET | `/api/types` | 所有角色类别枚举 |
| GET | `/api/characters` | 角色列表，支持过滤与分页 |
| GET | `/api/characters/:id` | 按 ID 或角色名称获取角色详情（含 `wiki_content`） |

### `/api/characters` 查询参数

| 参数 | 说明 |
| --- | --- |
| `set_id` | 角色集 ID |
| `type_id` | 角色类别 ID |
| `name` | 角色名称模糊匹配 |
| `page` | 页码，默认 1 |
| `page_size` | 每页数量，默认 50，最大 500 |

### 示例

```bash
# 暗流涌动 / 镇民
curl 'http://localhost:8090/api/characters?set_id=1&type_id=1&page_size=100'

# 按名称模糊搜索
curl 'http://localhost:8090/api/characters?name=占卜'

# 获取「洗衣妇」详情
curl 'http://localhost:8090/api/characters/洗衣妇'
```

响应示例（详情）：

```json
{
  "id": 1,
  "name": "洗衣妇",
  "image_url": "https://clocktower-wiki.gstonegames.com/images/.../200px-Washerwoman.png",
  "wiki_url": "https://clocktower-wiki.gstonegames.com/index.php?title=...",
  "categories": [{"set_id": 1, "type_id": 1, "set_name": "暗流涌动", "type_name": "镇民"}],
  "wiki_content": {
    "sections": [
      {"title": "背景故事", "content": "..."},
      {"title": "角色能力", "content": "..."},
      {"title": "角色简介", "content": "..."},
      {"title": "范例", "content": "..."},
      {"title": "运作方式", "content": "..."}
    ]
  }
}
```

## 运行

### docker-compose（推荐）

```bash
docker compose up -d --build
docker compose logs -f botc-wiki   # 观察爬虫日志
```

默认将数据库持久化到宿主机的 `./data/botc.db`，服务监听 `8090`。

### 纯 docker

```bash
docker build -t botc-wiki-service:latest .
docker run -d --name botc-wiki -p 8090:8090 \
  -v "$(pwd)/data:/app/data" \
  -e SCRAPE_ON_START=auto \
  botc-wiki-service:latest
```

### 可配置环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LISTEN_ADDR` | `:8090` | Gin 监听地址 |
| `DB_PATH` | `/app/data/botc.db` | SQLite 文件路径 |
| `SCRAPE_ON_START` | `auto` | `always` / `never` / `auto` |
| `GIN_MODE` | `release` | Gin 运行模式 |

## 项目结构

```
.
├── Dockerfile
├── docker-compose.yml
├── go.mod / go.sum
├── main.go                      启动入口
└── internal/
    ├── model/
    │   ├── enum.go              CharacterSet / CharacterType 枚举
    │   └── character.go         GORM 模型
    ├── db/db.go                 SQLite 初始化与 AutoMigrate
    ├── scraper/scraper.go       wiki 抓取与入库
    └── handler/handler.go       Gin 路由
```

## 开发注意

- 目标 wiki 会校验 UA，HTTP 客户端已使用 Chrome UA 与 Referer。
- 构建镜像使用 `CGO_ENABLED=0`，SQLite 驱动采用 `github.com/glebarez/sqlite`（纯 Go）。
- 抓取过程并发度为 8，全部角色约需 30~60 秒。

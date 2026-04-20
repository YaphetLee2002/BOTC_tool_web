package scraper

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/botc/wiki-service/internal/db"
	"github.com/botc/wiki-service/internal/model"
	"gorm.io/gorm/clause"
)

const (
	baseURL   = "https://clocktower-wiki.gstonegames.com"
	userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

// fetchDoc 拉取指定 wiki 页面 title 对应的文档
func fetchDoc(title string) (*goquery.Document, string, error) {
	pageURL := fmt.Sprintf("%s/index.php?title=%s", baseURL, url.QueryEscape(title))
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return nil, pageURL, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Referer", baseURL+"/")
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, pageURL, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		io.Copy(io.Discard, resp.Body)
		return nil, pageURL, fmt.Errorf("status %d for %s", resp.StatusCode, pageURL)
	}
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	return doc, pageURL, err
}

// absURL 将 wiki 中相对链接转为绝对链接
func absURL(u string) string {
	if u == "" {
		return ""
	}
	if strings.HasPrefix(u, "http") {
		return u
	}
	if strings.HasPrefix(u, "//") {
		return "https:" + u
	}
	if !strings.HasPrefix(u, "/") {
		u = "/" + u
	}
	return baseURL + u
}

// titleFromHref 从类似 /index.php?title=XXX 的链接中提取 title（已解码）
func titleFromHref(href string) string {
	if href == "" {
		return ""
	}
	u, err := url.Parse(href)
	if err != nil {
		return ""
	}
	return u.Query().Get("title")
}

// listEntry 代表角色集/类别列表页中一个角色条目
type listEntry struct {
	Name     string
	ImageURL string
	SetID    model.CharacterSet
	TypeID   model.CharacterType
}

// parseSetPage 解析某个角色集页面，按 h2 分节提取角色条目
// 只接受 7 个类别名作为类型分节
func parseSetPage(doc *goquery.Document, setID model.CharacterSet) []listEntry {
	var entries []listEntry
	// 在 mw-parser-output 下，遍历顶层节点：遇到 h2 记录当前类型，遇到 ul.gallery 提取该节内角色
	current := model.TypeUnknown
	doc.Find(".mw-parser-output").Children().Each(func(_ int, s *goquery.Selection) {
		if goquery.NodeName(s) == "h2" {
			headline := strings.TrimSpace(s.Find(".mw-headline").Text())
			// 处理形如「包含于卡牌版中的实验性角色」这类标题
			t := model.CharacterTypeFromName(headline)
			if t == model.TypeUnknown {
				// 只要包含 7 类别之一即可归类（兜底）
				for _, item := range model.AllCharacterTypes {
					if strings.Contains(headline, item.Name) {
						t = item.ID
						break
					}
				}
			}
			current = t
			return
		}
		if s.HasClass("gallery") && current != model.TypeUnknown {
			s.Find("li.gallerybox").Each(func(_ int, li *goquery.Selection) {
				a := li.Find(".thumb a").First()
				img := a.Find("img")
				name := strings.TrimSpace(li.Find(".gallerytext a").First().Text())
				if name == "" {
					name = titleFromHref(a.AttrOr("href", ""))
				}
				imgSrc, _ := img.Attr("src")
				if name == "" || imgSrc == "" {
					return
				}
				entries = append(entries, listEntry{
					Name:     name,
					ImageURL: absURL(imgSrc),
					SetID:    setID,
					TypeID:   current,
				})
			})
		}
	})
	return entries
}

// parseCharacterPage 解析角色详情页，提取顶部大图和所有 h2 章节
func parseCharacterPage(doc *goquery.Document) (imageURL string, content model.WikiContentData) {
	root := doc.Find(".mw-parser-output").First()

	// 顶部大图：通常是 mw-parser-output 的第一张图
	root.Find("img").EachWithBreak(func(_ int, img *goquery.Selection) bool {
		src, _ := img.Attr("src")
		if src != "" {
			imageURL = absURL(src)
			return false
		}
		return true
	})

	// 按 h2 章节切分
	var curTitle string
	var curBuf strings.Builder
	flush := func() {
		if curTitle == "" {
			return
		}
		text := strings.TrimSpace(curBuf.String())
		if text != "" {
			content.Sections = append(content.Sections, model.Section{
				Title:   curTitle,
				Content: text,
			})
		}
		curBuf.Reset()
	}

	root.Children().Each(func(_ int, s *goquery.Selection) {
		name := goquery.NodeName(s)
		if name == "h2" {
			flush()
			curTitle = strings.TrimSpace(s.Find(".mw-headline").Text())
			return
		}
		// 跳过目录
		if s.HasClass("toc") {
			return
		}
		if curTitle == "" {
			return
		}
		txt := strings.TrimSpace(s.Text())
		if txt != "" {
			if curBuf.Len() > 0 {
				curBuf.WriteString("\n")
			}
			curBuf.WriteString(txt)
		}
	})
	flush()
	return
}

// ScrapeAll 抓取所有角色集 + 旅行者/传奇/奇遇列表，再抓取每个角色详情页并写入 DB
func ScrapeAll() error {
	log.Println("[scraper] start scraping...")

	// 1. 收集所有列表页的角色条目
	allEntries := map[string]listEntry{} // name -> entry（首次出现为准）
	appearances := map[string][]listEntry{} // name -> 所有出现 (set,type)

	record := func(e listEntry) {
		if _, ok := allEntries[e.Name]; !ok {
			allEntries[e.Name] = e
		}
		appearances[e.Name] = append(appearances[e.Name], e)
	}

	// 1.1 6 个角色集页面
	for _, set := range model.AllCharacterSets {
		log.Printf("[scraper] fetching set page: %s", set.Name)
		doc, _, err := fetchDoc(set.WikiSlug)
		if err != nil {
			log.Printf("[scraper] WARN fetch set %s failed: %v", set.Name, err)
			continue
		}
		entries := parseSetPage(doc, set.ID)
		log.Printf("[scraper] set %s parsed %d characters", set.Name, len(entries))
		for _, e := range entries {
			record(e)
		}
	}

	// 1.2 旅行者 / 传奇角色 / 奇遇角色 三个独立列表页（不属于任何角色集）
	for _, t := range model.AllCharacterTypes {
		if t.WikiSlug == "" {
			continue
		}
		log.Printf("[scraper] fetching type page: %s", t.Name)
		doc, _, err := fetchDoc(t.WikiSlug)
		if err != nil {
			log.Printf("[scraper] WARN fetch type %s failed: %v", t.Name, err)
			continue
		}
		// 这些页面一般整页就是一个 gallery；不需要按 h2 区分类型
		doc.Find(".mw-parser-output ul.gallery li.gallerybox").Each(func(_ int, li *goquery.Selection) {
			a := li.Find(".thumb a").First()
			img := a.Find("img")
			name := strings.TrimSpace(li.Find(".gallerytext a").First().Text())
			if name == "" {
				name = titleFromHref(a.AttrOr("href", ""))
			}
			imgSrc, _ := img.Attr("src")
			if name == "" || imgSrc == "" {
				return
			}
			record(listEntry{
				Name:     name,
				ImageURL: absURL(imgSrc),
				SetID:    model.SetUnknown,
				TypeID:   t.ID,
			})
		})
	}

	log.Printf("[scraper] total unique characters to fetch: %d", len(allEntries))

	// 2. 并发抓取每个角色详情页
	type detail struct {
		name     string
		imageURL string
		content  model.WikiContentData
	}
	sem := make(chan struct{}, 8)
	var mu sync.Mutex
	var wg sync.WaitGroup
	details := map[string]detail{}

	for name, e := range allEntries {
		wg.Add(1)
		sem <- struct{}{}
		go func(name string, e listEntry) {
			defer wg.Done()
			defer func() { <-sem }()
			doc, _, err := fetchDoc(name)
			if err != nil {
				log.Printf("[scraper] WARN fetch character %s failed: %v", name, err)
				return
			}
			img, content := parseCharacterPage(doc)
			if img == "" {
				img = e.ImageURL
			}
			mu.Lock()
			details[name] = detail{name: name, imageURL: img, content: content}
			mu.Unlock()
		}(name, e)
	}
	wg.Wait()

	log.Printf("[scraper] fetched %d character detail pages", len(details))

	// 3. 写入数据库
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	for name, e := range allEntries {
		d, ok := details[name]
		imageURL := e.ImageURL
		if ok && d.imageURL != "" {
			imageURL = d.imageURL
		}
		// 用 URL 指向详情页
		wikiURL := fmt.Sprintf("%s/index.php?title=%s", baseURL, url.QueryEscape(name))

		ch := model.Character{
			Name:     name,
			ImageURL: imageURL,
			WikiURL:  wikiURL,
		}
		if ok {
			_ = ch.SetWikiContent(d.content)
		}

		// Upsert by name
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"image_url", "wiki_url", "wiki_content", "updated_at"}),
		}).Create(&ch).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("upsert character %s: %w", name, err)
		}

		// 清除并重建 categories
		if err := tx.Where("character_id = ?", ch.ID).Delete(&model.CharacterCategory{}).Error; err != nil {
			tx.Rollback()
			return err
		}
		// 旅行者/传奇角色/奇遇角色 既会出现在某个剧本集页（带具体 SetID），
		// 又会出现在独立列表页（SetID=SetUnknown）。若某个 TypeID 已有具体剧本集归属，
		// 则丢弃该 TypeID 下的 SetUnknown 记录，避免冗余 tag。
		hasConcreteSet := map[model.CharacterType]bool{}
		for _, ap := range appearances[name] {
			if ap.SetID != model.SetUnknown {
				hasConcreteSet[ap.TypeID] = true
			}
		}
		seen := map[[2]int]bool{}
		for _, ap := range appearances[name] {
			if ap.SetID == model.SetUnknown && hasConcreteSet[ap.TypeID] {
				continue
			}
			k := [2]int{int(ap.SetID), int(ap.TypeID)}
			if seen[k] {
				continue
			}
			seen[k] = true
			cat := model.CharacterCategory{
				CharacterID: ch.ID,
				SetID:       ap.SetID,
				TypeID:      ap.TypeID,
			}
			if err := tx.Create(&cat).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}
	log.Printf("[scraper] done. persisted %d characters", len(allEntries))
	return nil
}

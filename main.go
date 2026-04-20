package main

import (
	"log"
	"os"

	"github.com/botc/wiki-service/internal/db"
	"github.com/botc/wiki-service/internal/handler"
	"github.com/botc/wiki-service/internal/model"
	"github.com/botc/wiki-service/internal/scraper"
	"github.com/gin-gonic/gin"
)

func main() {
	if err := db.Init(); err != nil {
		log.Fatalf("init db failed: %v", err)
	}

	// 启动时抓取：
	//   - SCRAPE_ON_START=always  每次都抓
	//   - SCRAPE_ON_START=never   从不抓
	//   - 否则（默认）：若数据库为空则抓
	mode := os.Getenv("SCRAPE_ON_START")
	shouldScrape := false
	switch mode {
	case "always":
		shouldScrape = true
	case "never":
		shouldScrape = false
	default:
		var count int64
		db.DB.Model(&model.Character{}).Count(&count)
		shouldScrape = count == 0
	}
	if shouldScrape {
		go func() {
			if err := scraper.ScrapeAll(); err != nil {
				log.Printf("[main] scrape failed: %v", err)
			}
		}()
	} else {
		log.Printf("[main] skip scraping on startup")
	}

	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	handler.Register(r)

	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		addr = ":8090"
	}
	log.Printf("[main] listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("gin run failed: %v", err)
	}
}

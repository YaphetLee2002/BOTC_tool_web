package handler

import (
	"net/http"
	"strconv"

	"github.com/botc/wiki-service/internal/db"
	"github.com/botc/wiki-service/internal/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Register 注册所有路由
func Register(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"ok": true})
		})
		api.GET("/sets", listSets)
		api.GET("/types", listTypes)
		api.GET("/characters", listCharacters)
		api.GET("/characters/:id", getCharacter)
	}
}

func listSets(c *gin.Context) {
	type item struct {
		ID   model.CharacterSet `json:"id"`
		Name string             `json:"name"`
	}
	out := make([]item, 0, len(model.AllCharacterSets))
	for _, s := range model.AllCharacterSets {
		out = append(out, item{s.ID, s.Name})
	}
	c.JSON(http.StatusOK, out)
}

func listTypes(c *gin.Context) {
	type item struct {
		ID   model.CharacterType `json:"id"`
		Name string              `json:"name"`
	}
	out := make([]item, 0, len(model.AllCharacterTypes))
	for _, t := range model.AllCharacterTypes {
		out = append(out, item{t.ID, t.Name})
	}
	c.JSON(http.StatusOK, out)
}

// listCharacters 查询角色列表
// 支持 query: set_id, type_id, name(模糊), page, page_size
func listCharacters(c *gin.Context) {
	setIDStr := c.Query("set_id")
	typeIDStr := c.Query("type_id")
	name := c.Query("name")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	if pageSize < 1 || pageSize > 500 {
		pageSize = 50
	}

	applyFilters := func(q *gorm.DB) *gorm.DB {
		if setIDStr != "" || typeIDStr != "" {
			q = q.Joins("JOIN character_categories cc ON cc.character_id = characters.id")
			if v, err := strconv.Atoi(setIDStr); err == nil && setIDStr != "" {
				q = q.Where("cc.set_id = ?", v)
			}
			if v, err := strconv.Atoi(typeIDStr); err == nil && typeIDStr != "" {
				q = q.Where("cc.type_id = ?", v)
			}
		}
		if name != "" {
			q = q.Where("characters.name LIKE ?", "%"+name+"%")
		}
		return q
	}

	var total int64
	if err := applyFilters(db.DB.Model(&model.Character{})).
		Distinct("characters.id").Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var list []model.Character
	q := applyFilters(db.DB.Model(&model.Character{})).
		Select("DISTINCT characters.*")
	if err := q.Order("characters.id asc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Preload("Categories").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type resp struct {
		ID         uint                        `json:"id"`
		Name       string                      `json:"name"`
		ImageURL   string                      `json:"image_url"`
		WikiURL    string                      `json:"wiki_url"`
		Categories []model.CharacterCategory   `json:"categories"`
	}
	items := make([]resp, 0, len(list))
	for _, ch := range list {
		items = append(items, resp{
			ID:         ch.ID,
			Name:       ch.Name,
			ImageURL:   ch.ImageURL,
			WikiURL:    ch.WikiURL,
			Categories: ch.Categories,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"items":     items,
	})
}

func getCharacter(c *gin.Context) {
	idStr := c.Param("id")
	var ch model.Character

	// 支持按 id 或 name 查询
	q := db.DB.Preload("Categories")
	if id, err := strconv.Atoi(idStr); err == nil {
		q = q.Where("id = ?", id)
	} else {
		q = q.Where("name = ?", idStr)
	}
	if err := q.First(&ch).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}
	content, _ := ch.GetWikiContent()
	c.JSON(http.StatusOK, gin.H{
		"id":           ch.ID,
		"name":         ch.Name,
		"image_url":    ch.ImageURL,
		"wiki_url":     ch.WikiURL,
		"categories":   ch.Categories,
		"wiki_content": content,
	})
}

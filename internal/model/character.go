package model

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Character 角色数据
// WikiContent 用 JSON 存储章节标题 -> 正文 的映射（顺序保留为 Sections 切片）
type Character struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"uniqueIndex;size:64;not null" json:"name"`
	ImageURL  string    `gorm:"size:512" json:"image_url"`
	WikiURL   string    `gorm:"size:512" json:"wiki_url"`
	WikiContent string  `gorm:"type:text" json:"-"` // 内部存 JSON 字符串
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Categories []CharacterCategory `gorm:"foreignKey:CharacterID" json:"categories,omitempty"`
}

// CharacterCategory 角色在某个（角色集，类别）中的归属
// 一个角色可能属于多个组合（如在角色集中同时列为「镇民」节；但通常一个角色只有一个主归属）
type CharacterCategory struct {
	ID          uint          `gorm:"primaryKey" json:"-"`
	CharacterID uint          `gorm:"index:idx_char_cat,priority:1;not null" json:"-"`
	SetID       CharacterSet  `gorm:"index:idx_char_cat,priority:2;not null" json:"set_id"`
	TypeID      CharacterType `gorm:"index:idx_char_cat,priority:3;not null" json:"type_id"`
	SetName     string        `gorm:"-" json:"set_name"`
	TypeName    string        `gorm:"-" json:"type_name"`
}

// AfterFind 填充展示字段
func (c *CharacterCategory) AfterFind(tx *gorm.DB) error {
	c.SetName = c.SetID.Name()
	c.TypeName = c.TypeID.Name()
	return nil
}

// Section 角色 wiki 正文的一个章节
type Section struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// WikiContentData 反序列化后的 wiki 正文结构
type WikiContentData struct {
	Sections []Section `json:"sections"`
}

func (c *Character) SetWikiContent(data WikiContentData) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	c.WikiContent = string(b)
	return nil
}

func (c *Character) GetWikiContent() (WikiContentData, error) {
	var d WikiContentData
	if c.WikiContent == "" {
		return d, nil
	}
	err := json.Unmarshal([]byte(c.WikiContent), &d)
	return d, err
}

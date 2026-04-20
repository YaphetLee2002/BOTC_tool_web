package db

import (
	"log"
	"os"
	"path/filepath"

	"github.com/botc/wiki-service/internal/model"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Init 初始化 SQLite 数据库（路径可由环境变量 DB_PATH 覆盖，默认 ./data/botc.db）
func Init() error {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/botc.db"
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return err
	}

	gdb, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return err
	}
	DB = gdb
	if err := DB.AutoMigrate(&model.Character{}, &model.CharacterCategory{}); err != nil {
		return err
	}
	log.Printf("[db] sqlite ready at %s", dbPath)
	return nil
}

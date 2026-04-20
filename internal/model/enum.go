package model

// CharacterSet 角色集（剧本集）枚举
type CharacterSet int

const (
	SetUnknown      CharacterSet = 0
	SetAnLiuYongDong CharacterSet = 1 // 暗流涌动
	SetAnYueChuSheng CharacterSet = 2 // 黯月初升
	SetMengYunChunXiao CharacterSet = 3 // 梦殒春宵
	SetShiYanXing   CharacterSet = 4 // 实验性角色
	SetHuaDengChuShang CharacterSet = 5 // 华灯初上
	SetShanYuYuLai  CharacterSet = 6 // 山雨欲来
)

// AllCharacterSets 所有角色集 —— 固定 6 个
var AllCharacterSets = []struct {
	ID       CharacterSet
	Name     string
	WikiSlug string // wiki 页面 title 参数
}{
	{SetAnLiuYongDong, "暗流涌动", "暗流涌动"},
	{SetAnYueChuSheng, "黯月初升", "黯月初升"},
	{SetMengYunChunXiao, "梦殒春宵", "梦殒春宵"},
	{SetShiYanXing, "实验性角色", "实验性角色"},
	{SetHuaDengChuShang, "华灯初上", "华灯初上"},
	{SetShanYuYuLai, "山雨欲来", "山雨欲来"},
}

// NameByID 通过 ID 获取角色集名称
func (s CharacterSet) Name() string {
	for _, item := range AllCharacterSets {
		if item.ID == s {
			return item.Name
		}
	}
	return ""
}

// CharacterSetFromName 通过名称获取角色集 ID
func CharacterSetFromName(name string) CharacterSet {
	for _, item := range AllCharacterSets {
		if item.Name == name {
			return item.ID
		}
	}
	return SetUnknown
}

// CharacterType 角色类别枚举
type CharacterType int

const (
	TypeUnknown   CharacterType = 0
	TypeTownsfolk CharacterType = 1 // 镇民
	TypeOutsider  CharacterType = 2 // 外来者
	TypeMinion    CharacterType = 3 // 爪牙
	TypeDemon     CharacterType = 4 // 恶魔
	TypeTraveller CharacterType = 5 // 旅行者
	TypeFabled    CharacterType = 6 // 传奇角色
	TypeFabledEncounter CharacterType = 7 // 奇遇角色
)

// AllCharacterTypes 所有角色类别 —— 固定 7 种
var AllCharacterTypes = []struct {
	ID       CharacterType
	Name     string
	WikiSlug string // 仅 旅行者/传奇/奇遇 有独立列表页
}{
	{TypeTownsfolk, "镇民", ""},
	{TypeOutsider, "外来者", ""},
	{TypeMinion, "爪牙", ""},
	{TypeDemon, "恶魔", ""},
	{TypeTraveller, "旅行者", "旅行者"},
	{TypeFabled, "传奇角色", "传奇角色"},
	{TypeFabledEncounter, "奇遇角色", "奇遇角色"},
}

func (t CharacterType) Name() string {
	for _, item := range AllCharacterTypes {
		if item.ID == t {
			return item.Name
		}
	}
	return ""
}

func CharacterTypeFromName(name string) CharacterType {
	// wiki 里分节名有不同写法兜底
	switch name {
	case "镇民":
		return TypeTownsfolk
	case "外来者":
		return TypeOutsider
	case "爪牙":
		return TypeMinion
	case "恶魔":
		return TypeDemon
	case "旅行者":
		return TypeTraveller
	case "传奇角色":
		return TypeFabled
	case "奇遇角色":
		return TypeFabledEncounter
	}
	return TypeUnknown
}

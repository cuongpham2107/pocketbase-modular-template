package rbac

import "cuongpham2107/pocketbase-custom/internal/platform/module"

// Item is a permission as exposed by GET /permissions/catalog.
type Item struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Module      string `json:"module"`
	Basic       bool   `json:"-"`
}

// Group is a module's permissions, used for UI grouping.
type Group struct {
	Module      string `json:"module"`
	Label       string `json:"label"`
	Permissions []Item `json:"permissions"`
}

// BuildCatalog collects the permissions declared by every module.
func BuildCatalog(mods []module.Module) []Group {
	var groups []Group
	for _, m := range mods {
		if len(m.Permissions) == 0 {
			continue
		}
		g := Group{Module: m.Name, Label: m.Label}
		for _, p := range m.Permissions {
			g.Permissions = append(g.Permissions, Item{
				Code: p.Code, Label: p.Label, Description: p.Description, Module: m.Name, Basic: p.Basic,
			})
		}
		groups = append(groups, g)
	}
	return groups
}

func flatten(groups []Group) []Item {
	var items []Item
	for _, g := range groups {
		items = append(items, g.Permissions...)
	}
	return items
}

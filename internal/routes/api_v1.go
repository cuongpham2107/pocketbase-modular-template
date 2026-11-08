package routes

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
	"github.com/gorilla/websocket"

	"cuongpham2107/pocketbase-custom/internal/rbac"
)

func RegisterV1(se *core.ServeEvent) {
	app := se.App

	// Health endpoint
	se.Router.GET("/health", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{"status": "ok"})
	})

	api := se.Router.Group("/api/v1")

	// GET /api/v1/modules (Public)
	api.GET("/modules", func(e *core.RequestEvent) error {
		mods := []string{"rbac", "users", "theme", "audit", "notifications", "media"}
		return e.JSON(200, map[string]any{
			"success": true,
			"data": map[string]any{
				"modules": mods,
			},
			"modules": mods,
		})
	})

	// --- NOTIFICATIONS REALTIME STREAM (WebSocket) ---
	wsUpgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	api.GET("/notifications/stream", func(e *core.RequestEvent) error {
		ws, err := wsUpgrader.Upgrade(e.Response, e.Request, nil)
		if err != nil {
			return err
		}
		defer ws.Close()

		_ = ws.WriteJSON(map[string]any{
			"type": "ready",
		})

		for {
			_, _, err := ws.ReadMessage()
			if err != nil {
				break
			}
		}
		return nil
	})

	// --- AUTH ROUTES ---
	authGroup := api.Group("/auth")

	// POST /api/v1/auth/login
	authGroup.POST("/login", func(e *core.RequestEvent) error {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		user, err := app.FindAuthRecordByEmail("users", strings.TrimSpace(req.Email))
		if err != nil || !user.ValidatePassword(req.Password) {
			return errorEnvelope(e, 401, "UNAUTHORIZED", "Email hoặc mật khẩu không chính xác")
		}

		token, err := user.NewAuthToken()
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể tạo phiên đăng nhập")
		}

		dto, err := rbac.FormatUser(app, user)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		e.SetCookie(&http.Cookie{
			Name:     "has_session",
			Value:    "1",
			Path:     "/",
			MaxAge:   86400 * 30,
			SameSite: http.SameSiteLaxMode,
		})

		authData := map[string]any{
			"token":        token,
			"access_token": token,
			"token_type":   "Bearer",
			"user":         dto,
		}

		return e.JSON(200, map[string]any{
			"success":      true,
			"message":      "Đăng nhập thành công",
			"data":         authData,
			"token":        token,
			"access_token": token,
			"token_type":   "Bearer",
			"user":         dto,
		})
	})

	// POST /api/v1/auth/register
	authGroup.POST("/register", func(e *core.RequestEvent) error {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			FullName string `json:"full_name"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		usersColl, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Collection users không tồn tại")
		}

		newUser := core.NewRecord(usersColl)
		newUser.Set("email", strings.TrimSpace(req.Email))
		newUser.Set("name", strings.TrimSpace(req.FullName))
		newUser.SetPassword(req.Password)

		// Assign default role "user"
		rolesColl, _ := app.FindCollectionByNameOrId("roles")
		if rolesColl != nil {
			defaultRoles, _ := app.FindRecordsByFilter(rolesColl, "name = 'user'", "", 1, 0)
			if len(defaultRoles) > 0 {
				newUser.Set("roles", []string{defaultRoles[0].Id})
			}
		}

		if err := app.Save(newUser); err != nil {
			return errorEnvelope(e, 400, "VALIDATION_FAILED", "Không thể tạo tài khoản: "+err.Error())
		}

		token, err := newUser.NewAuthToken()
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể tạo token")
		}

		dto, _ := rbac.FormatUser(app, newUser)

		e.SetCookie(&http.Cookie{
			Name:     "has_session",
			Value:    "1",
			Path:     "/",
			MaxAge:   86400 * 30,
			SameSite: http.SameSiteLaxMode,
		})

		authData := map[string]any{
			"token":        token,
			"access_token": token,
			"token_type":   "Bearer",
			"user":         dto,
		}

		return e.JSON(200, map[string]any{
			"success":      true,
			"message":      "Đăng ký thành công",
			"data":         authData,
			"token":        token,
			"access_token": token,
			"token_type":   "Bearer",
			"user":         dto,
		})
	})

	// POST /api/v1/auth/refresh
	authGroup.POST("/refresh", func(e *core.RequestEvent) error {
		var user *core.Record
		authHeader := e.Request.Header.Get("Authorization")
		if authHeader != "" {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			token = strings.TrimSpace(token)
			u, err := app.FindAuthRecordByToken(token, core.TokenTypeAuth)
			if err == nil {
				user = u
			}
		}

		if user == nil {
			return errorEnvelope(e, 401, "UNAUTHORIZED", "Chưa đăng nhập hoặc phiên đã hết hạn")
		}

		newToken, err := user.NewAuthToken()
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể làm mới token")
		}

		dto, _ := rbac.FormatUser(app, user)
		authData := map[string]any{
			"token":        newToken,
			"access_token": newToken,
			"token_type":   "Bearer",
			"user":         dto,
		}

		return e.JSON(200, map[string]any{
			"success":      true,
			"data":         authData,
			"token":        newToken,
			"access_token": newToken,
			"token_type":   "Bearer",
			"user":         dto,
		})
	})

	// POST /api/v1/auth/logout
	authGroup.POST("/logout", func(e *core.RequestEvent) error {
		e.SetCookie(&http.Cookie{
			Name:     "has_session",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			SameSite: http.SameSiteLaxMode,
		})
		return e.JSON(200, map[string]any{"success": true, "message": "Đã đăng xuất"})
	})

	// POST /api/v1/auth/logout-all
	authGroup.POST("/logout-all", func(e *core.RequestEvent) error {
		e.SetCookie(&http.Cookie{
			Name:     "has_session",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			SameSite: http.SameSiteLaxMode,
		})
		return e.JSON(200, map[string]any{"success": true, "message": "Đã đăng xuất tất cả thiết bị"})
	})

	// Authenticated routes
	protected := api.Group("")
	protected.Bind(apis.RequireAuth())

	// GET /api/v1/auth/me
	protected.GET("/auth/me", func(e *core.RequestEvent) error {
		dto, err := rbac.FormatUser(app, e.Auth)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dto,
		})
	})

	// PUT /api/v1/auth/settings/theme
	protected.PUT("/auth/settings/theme", func(e *core.RequestEvent) error {
		var req struct {
			ThemeSettings string `json:"theme_settings"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		e.Auth.Set("theme_settings", req.ThemeSettings)
		if err := app.Save(e.Auth); err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể lưu cài đặt giao diện")
		}

		dto, _ := rbac.FormatUser(app, e.Auth)
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dto,
		})
	})

	// PUT /api/v1/auth/password
	protected.PUT("/auth/password", func(e *core.RequestEvent) error {
		var req struct {
			CurrentPassword string `json:"current_password"`
			NewPassword     string `json:"new_password"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		if !e.Auth.ValidatePassword(req.CurrentPassword) {
			return errorEnvelope(e, 400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng")
		}

		e.Auth.SetPassword(req.NewPassword)
		if err := app.Save(e.Auth); err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể đổi mật khẩu")
		}

		return e.JSON(200, map[string]any{"success": true, "message": "Đổi mật khẩu thành công"})
	})

	// --- ROLES & RBAC ROUTES ---

	// GET /api/v1/roles
	protected.GET("/roles", func(e *core.RequestEvent) error {
		rolesColl, err := app.FindCollectionByNameOrId("roles")
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		records, err := app.FindRecordsByFilter(rolesColl, "", "name", 0, 0)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		var dtos []*rbac.RoleDTO
		for _, r := range records {
			dto, _ := rbac.FormatRole(app, r)
			if dto != nil {
				dtos = append(dtos, dto)
			}
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dtos,
		})
	})

	// POST /api/v1/roles
	protected.POST("/roles", func(e *core.RequestEvent) error {
		var req struct {
			Name        string   `json:"name"`
			Description string   `json:"description"`
			Permissions []string `json:"permissions"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		rolesColl, err := app.FindCollectionByNameOrId("roles")
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		role := core.NewRecord(rolesColl)
		role.Set("name", strings.TrimSpace(req.Name))
		role.Set("description", strings.TrimSpace(req.Description))
		if err := app.Save(role); err != nil {
			return errorEnvelope(e, 400, "VALIDATION_FAILED", "Không thể tạo vai trò: "+err.Error())
		}

		if len(req.Permissions) > 0 {
			_ = rbac.AssignPermissionsToRole(app, role.Id, req.Permissions)
		}

		// Reload
		role, _ = app.FindRecordById(rolesColl, role.Id)
		dto, _ := rbac.FormatRole(app, role)

		return e.JSON(201, map[string]any{
			"success": true,
			"data":    dto,
		})
	})

	// POST /api/v1/roles/{id}/permissions
	protected.POST("/roles/{id}/permissions", func(e *core.RequestEvent) error {
		roleID := e.Request.PathValue("id")
		var req struct {
			PermissionCodes []string `json:"permission_codes"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		if err := rbac.AssignPermissionsToRole(app, roleID, req.PermissionCodes); err != nil {
			return errorEnvelope(e, 400, "FAILED", err.Error())
		}

		return e.JSON(200, map[string]any{"success": true, "message": "Gán quyền thành công"})
	})

	// GET /api/v1/roles/{id}/users
	protected.GET("/roles/{id}/users", func(e *core.RequestEvent) error {
		roleID := e.Request.PathValue("id")
		users, err := app.FindRecordsByFilter("users", "roles ~ {:id}", "", 0, 0, map[string]any{"id": roleID})
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		var ids []string
		for _, u := range users {
			ids = append(ids, u.Id)
		}

		return e.JSON(200, map[string]any{"success": true, "data": ids})
	})

	// POST /api/v1/roles/{id}/users
	protected.POST("/roles/{id}/users", func(e *core.RequestEvent) error {
		roleID := e.Request.PathValue("id")
		var req struct {
			UserIDs []string `json:"user_ids"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		// Add role to each user
		for _, uid := range req.UserIDs {
			u, err := app.FindRecordById("users", uid)
			if err == nil {
				existing := u.GetStringSlice("roles")
				has := false
				for _, r := range existing {
					if r == roleID {
						has = true
						break
					}
				}
				if !has {
					u.Set("roles", append(existing, roleID))
					_ = app.Save(u)
				}
			}
		}

		return e.JSON(200, map[string]any{"success": true, "message": "Gán người dùng vào vai trò thành công"})
	})

	// --- PERMISSIONS ROUTES ---

	// GET /api/v1/permissions
	protected.GET("/permissions", func(e *core.RequestEvent) error {
		records, err := app.FindRecordsByFilter("permissions", "", "module,code", 0, 0)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		var dtos []*rbac.PermissionDTO
		for _, p := range records {
			dtos = append(dtos, rbac.FormatPermission(p))
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dtos,
		})
	})

	// GET /api/v1/permissions/catalog
	protected.GET("/permissions/catalog", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    rbac.DefaultCatalog(),
		})
	})

	// GET /api/v1/permissions/coverage
	protected.GET("/permissions/coverage", func(e *core.RequestEvent) error {
		report, err := rbac.GetCoverageReport(app)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    report,
		})
	})

	// --- USERS ROUTES ---

	// GET /api/v1/users (with pagination, search, role)
	protected.GET("/users", func(e *core.RequestEvent) error {
		page, _ := strconv.Atoi(e.Request.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(e.Request.URL.Query().Get("limit"))
		if limit < 1 {
			limit = 10
		}
		offset := (page - 1) * limit

		search := strings.TrimSpace(e.Request.URL.Query().Get("search"))
		roleFilter := strings.TrimSpace(e.Request.URL.Query().Get("role"))

		var filterParts []string
		params := map[string]any{}

		if search != "" {
			filterParts = append(filterParts, "(name ~ {:search} || email ~ {:search})")
			params["search"] = search
		}

		if roleFilter != "" && roleFilter != "all" {
			// Find role id
			r, err := app.FindRecordsByFilter("roles", "name = {:role}", "", 1, 0, map[string]any{"role": roleFilter})
			if err == nil && len(r) > 0 {
				filterParts = append(filterParts, "roles ~ {:roleId}")
				params["roleId"] = r[0].Id
			}
		}

		filterExpr := strings.Join(filterParts, " && ")

		// Total count
		allRecords, err := app.FindRecordsByFilter("users", filterExpr, "", 0, 0, params)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}
		total := len(allRecords)

		// Page records
		records, err := app.FindRecordsByFilter("users", filterExpr, "-created", limit, offset, params)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		var dtos []*rbac.UserDTO
		for _, u := range records {
			dto, _ := rbac.FormatUser(app, u)
			if dto != nil {
				dtos = append(dtos, dto)
			}
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))
		if totalPages < 1 {
			totalPages = 1
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dtos,
			"pagination": map[string]any{
				"page":        page,
				"limit":       limit,
				"total_items": total,
				"total_pages": totalPages,
			},
		})
	})

	// POST /api/v1/users
	protected.POST("/users", func(e *core.RequestEvent) error {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			FullName string `json:"full_name"`
			Role     string `json:"role"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		usersColl, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}

		newUser := core.NewRecord(usersColl)
		newUser.Set("email", strings.TrimSpace(req.Email))
		newUser.Set("name", strings.TrimSpace(req.FullName))
		if req.Password != "" {
			newUser.SetPassword(req.Password)
		} else {
			newUser.SetPassword("12345678")
		}

		if req.Role != "" {
			roles, _ := app.FindRecordsByFilter("roles", "name = {:name}", "", 1, 0, map[string]any{"name": req.Role})
			if len(roles) > 0 {
				newUser.Set("roles", []string{roles[0].Id})
			}
		}

		if err := app.Save(newUser); err != nil {
			return errorEnvelope(e, 400, "VALIDATION_FAILED", "Không thể tạo người dùng: "+err.Error())
		}

		dto, _ := rbac.FormatUser(app, newUser)
		return e.JSON(201, map[string]any{
			"success": true,
			"data":    dto,
		})
	})

	// PUT /api/v1/users/{id}
	protected.PUT("/users/{id}", func(e *core.RequestEvent) error {
		userID := e.Request.PathValue("id")
		user, err := app.FindRecordById("users", userID)
		if err != nil {
			return errorEnvelope(e, 404, "NOT_FOUND", "Người dùng không tồn tại")
		}

		var req struct {
			Email    string `json:"email"`
			FullName string `json:"full_name"`
			Role     string `json:"role"`
			Password string `json:"password"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		if req.Email != "" {
			user.Set("email", strings.TrimSpace(req.Email))
		}
		if req.FullName != "" {
			user.Set("name", strings.TrimSpace(req.FullName))
		}
		if req.Password != "" {
			user.SetPassword(req.Password)
		}
		if req.Role != "" {
			roles, _ := app.FindRecordsByFilter("roles", "name = {:name}", "", 1, 0, map[string]any{"name": req.Role})
			if len(roles) > 0 {
				user.Set("roles", []string{roles[0].Id})
			}
		}

		if err := app.Save(user); err != nil {
			return errorEnvelope(e, 400, "VALIDATION_FAILED", err.Error())
		}

		dto, _ := rbac.FormatUser(app, user)
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    dto,
		})
	})

	// DELETE /api/v1/users/{id}
	protected.DELETE("/users/{id}", func(e *core.RequestEvent) error {
		userID := e.Request.PathValue("id")
		user, err := app.FindRecordById("users", userID)
		if err != nil {
			return errorEnvelope(e, 404, "NOT_FOUND", "Người dùng không tồn tại")
		}

		if err := app.Delete(user); err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể xoá người dùng")
		}

		return e.JSON(200, map[string]any{"success": true, "message": "Xoá người dùng thành công"})
	})

	// POST /api/v1/users/{id}/roles
	protected.POST("/users/{id}/roles", func(e *core.RequestEvent) error {
		userID := e.Request.PathValue("id")
		var req struct {
			RoleNames []string `json:"role_names"`
		}
		if err := e.BindBody(&req); err != nil {
			return errorEnvelope(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
		}

		if err := rbac.AssignRolesToUser(app, userID, req.RoleNames); err != nil {
			return errorEnvelope(e, 400, "FAILED", err.Error())
		}

		return e.JSON(200, map[string]any{"success": true, "message": "Gán vai trò thành công"})
	})

	// GET /api/v1/users/me/permissions
	protected.GET("/users/me/permissions", func(e *core.RequestEvent) error {
		dto, err := rbac.FormatUser(app, e.Auth)
		if err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", err.Error())
		}
		return e.JSON(200, map[string]any{
			"success": true,
			"data": map[string]any{
				"permissions": dto.Permissions,
			},
			"permissions": dto.Permissions,
		})
	})

	// --- NOTIFICATIONS ROUTES ---

	// GET /api/v1/notifications
	protected.GET("/notifications", func(e *core.RequestEvent) error {
		page, _ := strconv.Atoi(e.Request.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(e.Request.URL.Query().Get("per_page"))
		if limit < 1 {
			limit, _ = strconv.Atoi(e.Request.URL.Query().Get("limit"))
		}
		if limit < 1 {
			limit = 20
		}
		offset := (page - 1) * limit

		unreadOnly := e.Request.URL.Query().Get("unread") == "true" || e.Request.URL.Query().Get("unread") == "1"

		filter := ""
		if unreadOnly {
			filter = "read_at = '' || read_at = null"
		}

		records, err := app.FindRecordsByFilter("notifications", filter, "-id", limit, offset)
		if err != nil {
			records = []*core.Record{}
		}

		var totalRecords int64
		if filter != "" {
			totalRecords, _ = app.CountRecords("notifications", dbx.NewExp(filter))
		} else {
			totalRecords, _ = app.CountRecords("notifications")
		}

		type notifItem struct {
			ID        string  `json:"id"`
			UserID    string  `json:"user_id"`
			Type      string  `json:"type"`
			Title     string  `json:"title"`
			Body      string  `json:"body"`
			Data      string  `json:"data"`
			ReadAt    *string `json:"read_at"`
			CreatedAt string  `json:"created_at"`
		}

		items := make([]notifItem, 0, len(records))
		for _, r := range records {
			var readAtPtr *string
			if rAt := r.GetString("read_at"); rAt != "" {
				readAtPtr = &rAt
			}
			createdAt := r.GetString("created")
			if createdAt == "" {
				createdAt = types.NowDateTime().String()
			}
			items = append(items, notifItem{
				ID:        r.Id,
				UserID:    r.GetString("user_id"),
				Type:      r.GetString("type"),
				Title:     r.GetString("title"),
				Body:      r.GetString("body"),
				Data:      r.GetString("data"),
				ReadAt:    readAtPtr,
				CreatedAt: createdAt,
			})
		}

		totalPages := int(math.Ceil(float64(totalRecords) / float64(limit)))
		if totalPages < 1 {
			totalPages = 1
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"data":    items,
			"pagination": map[string]any{
				"page":        page,
				"limit":       limit,
				"total_items": totalRecords,
				"total_pages": totalPages,
			},
		})
	})

	// GET /api/v1/notifications/unread-count
	protected.GET("/notifications/unread-count", func(e *core.RequestEvent) error {
		unreadCount, _ := app.CountRecords("notifications", dbx.NewExp("read_at = '' OR read_at IS NULL"))
		return e.JSON(200, map[string]any{
			"success": true,
			"data": map[string]any{
				"unread": unreadCount,
			},
			"unread": unreadCount,
		})
	})

	// POST /api/v1/notifications/read-all
	protected.POST("/notifications/read-all", func(e *core.RequestEvent) error {
		unreads, _ := app.FindRecordsByFilter("notifications", "read_at = '' || read_at = null", "", 0, 0)
		now := types.NowDateTime().String()
		for _, r := range unreads {
			r.Set("read_at", now)
			_ = app.Save(r)
		}
		return e.JSON(200, map[string]any{
			"success": true,
			"data": map[string]any{
				"updated": len(unreads),
			},
			"updated": len(unreads),
		})
	})

	// POST /api/v1/notifications/{id}/read
	protected.POST("/notifications/{id}/read", func(e *core.RequestEvent) error {
		id := e.Request.PathValue("id")
		rec, err := app.FindRecordById("notifications", id)
		if err != nil {
			return errorEnvelope(e, 404, "NOT_FOUND", "Không tìm thấy thông báo")
		}
		rec.Set("read_at", types.NowDateTime().String())
		if err := app.Save(rec); err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể cập nhật thông báo")
		}
		return e.JSON(200, map[string]any{"success": true, "message": "Đã đánh dấu đã đọc"})
	})

	// DELETE /api/v1/notifications/{id}
	protected.DELETE("/notifications/{id}", func(e *core.RequestEvent) error {
		id := e.Request.PathValue("id")
		rec, err := app.FindRecordById("notifications", id)
		if err != nil {
			return errorEnvelope(e, 404, "NOT_FOUND", "Không tìm thấy thông báo")
		}
		if err := app.Delete(rec); err != nil {
			return errorEnvelope(e, 500, "INTERNAL_ERROR", "Không thể xoá thông báo")
		}
		return e.JSON(200, map[string]any{"success": true, "message": "Xoá thông báo thành công"})
	})

	// --- AUDIT LOGS ROUTES (Powered by PocketBase Go Logs) ---

	// GET /api/v1/audit-logs/filters
	protected.GET("/audit-logs/filters", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"success": true,
			"data": map[string]any{
				"actions":   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "sync_catalog", "login"},
				"resources": []string{"auth", "users", "roles", "permissions", "notifications", "audit", "orders", "media", "system"},
			},
		})
	})

	// GET /api/v1/audit-logs
	protected.GET("/audit-logs", func(e *core.RequestEvent) error {
		page, _ := strconv.Atoi(e.Request.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(e.Request.URL.Query().Get("per_page"))
		if limit < 1 {
			limit, _ = strconv.Atoi(e.Request.URL.Query().Get("limit"))
		}
		if limit < 1 {
			limit = 20
		}
		offset := (page - 1) * limit

		q := strings.TrimSpace(e.Request.URL.Query().Get("q"))
		status := strings.TrimSpace(e.Request.URL.Query().Get("status"))
		action := strings.TrimSpace(e.Request.URL.Query().Get("action"))
		resource := strings.TrimSpace(e.Request.URL.Query().Get("resource"))

		countQuery := app.LogQuery().Select("count(*)")
		dataQuery := app.LogQuery().OrderBy("created DESC").Limit(int64(limit)).Offset(int64(offset))

		var exprs []dbx.Expression
		// Ẩn request lặp lại như stream & health khỏi audit log
		exprs = append(exprs, dbx.Not(dbx.Like("message", "/notifications/stream")))
		exprs = append(exprs, dbx.Not(dbx.Like("message", "/health")))

		if q != "" {
			exprs = append(exprs, dbx.Or(
				dbx.Like("message", q),
				dbx.Like("data", q),
			))
		}

		if action != "" && action != "all" {
			exprs = append(exprs, dbx.NewExp("json_extract(data, '$.method') = {:action}", dbx.Params{"action": strings.ToUpper(action)}))
		}

		if status == "success" {
			exprs = append(exprs, dbx.NewExp("CAST(json_extract(data, '$.status') AS INTEGER) < 400"))
		} else if status == "failure" {
			exprs = append(exprs, dbx.NewExp("CAST(json_extract(data, '$.status') AS INTEGER) >= 400"))
		}

		if resource != "" && resource != "all" {
			exprs = append(exprs, dbx.Like("message", resource))
		}

		if len(exprs) > 0 {
			countQuery.Where(dbx.And(exprs...))
			dataQuery.Where(dbx.And(exprs...))
		}

		var totalItems int64
		_ = countQuery.Row(&totalItems)

		var rawLogs []*core.Log
		_ = dataQuery.All(&rawLogs)

		type auditItem struct {
			ID         string `json:"id"`
			ActorID    any    `json:"actor_id,omitempty"`
			ActorEmail string `json:"actor_email"`
			Action     string `json:"action"`
			Resource   string `json:"resource"`
			ResourceID string `json:"resource_id,omitempty"`
			Status     string `json:"status"`
			IP         string `json:"ip"`
			UserAgent  string `json:"user_agent"`
			RequestID  string `json:"request_id"`
			TraceID    string `json:"trace_id"`
			Detail     string `json:"detail"`
			CreatedAt  string `json:"created_at"`
		}

		items := make([]auditItem, 0, len(rawLogs))
		for _, l := range rawLogs {
			method := ""
			if m, ok := l.Data["method"].(string); ok {
				method = m
			}
			urlStr := ""
			if u, ok := l.Data["url"].(string); ok {
				urlStr = u
			}
			statusCode := 200
			if st, ok := l.Data["status"].(float64); ok {
				statusCode = int(st)
			}
			execTime := 0.0
			if et, ok := l.Data["execTime"].(float64); ok {
				execTime = et
			}
			ip := ""
			if userIP, ok := l.Data["userIP"].(string); ok && userIP != "" {
				ip = userIP
			} else if rip, ok := l.Data["remoteIP"].(string); ok {
				ip = rip
			}
			ua := ""
			if userAgent, ok := l.Data["userAgent"].(string); ok {
				ua = userAgent
			}
			authStr := ""
			if a, ok := l.Data["auth"].(string); ok {
				authStr = a
			}

			// Clean resource & resource_id from URL
			cleanPath := strings.Split(urlStr, "?")[0]
			cleanPath = strings.TrimPrefix(cleanPath, "/api/v1/")
			cleanPath = strings.TrimPrefix(cleanPath, "/api/collections/")
			cleanPath = strings.TrimPrefix(cleanPath, "/api/")
			parts := strings.Split(strings.Trim(cleanPath, "/"), "/")

			resName := "system"
			resID := ""
			if len(parts) > 0 && parts[0] != "" {
				resName = parts[0]
				if len(parts) > 1 {
					if parts[1] == "records" && len(parts) > 2 {
						resID = parts[2]
					} else if parts[1] != "records" {
						resID = parts[1]
					}
				}
			}

			actorEmail := "Khách (Anonymous)"
			if authStr == "superusers" {
				actorEmail = "admin@example.com (Superuser)"
			} else if authStr == "users" {
				actorEmail = "admin@example.com"
			}

			itemStatus := "success"
			if statusCode >= 400 || statusCode == 0 {
				itemStatus = "failure"
			}

			detail := fmt.Sprintf("%s %s · HTTP %d (%.2fms)", method, urlStr, statusCode, execTime)

			items = append(items, auditItem{
				ID:         l.Id,
				ActorEmail: actorEmail,
				Action:     method,
				Resource:   resName,
				ResourceID: resID,
				Status:     itemStatus,
				IP:         ip,
				UserAgent:  ua,
				RequestID:  l.Id,
				TraceID:    l.Id,
				Detail:     detail,
				CreatedAt:  l.Created.String(),
			})
		}

		totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
		if totalPages < 1 {
			totalPages = 1
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"data":    items,
			"pagination": map[string]any{
				"page":        page,
				"limit":       limit,
				"total_items": totalItems,
				"total_pages": totalPages,
			},
		})
	})

	// --- MEDIA & FILES STUBS ---

	// GET /api/v1/files
	protected.GET("/files", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    []any{},
		})
	})

	// GET /api/v1/files/folders/tree
	protected.GET("/files/folders/tree", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    []any{},
		})
	})
}

func errorEnvelope(e *core.RequestEvent, status int, code, msg string) error {
	return e.JSON(status, map[string]any{
		"success": false,
		"error": map[string]any{
			"code":    code,
			"message": msg,
		},
	})
}


package app

import (
	"fmt"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/spf13/cobra"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
)

func registerCommands(pb *pocketbase.PocketBase, catalog []rbac.Group) {
	if pb.RootCmd == nil {
		return
	}

	pb.RootCmd.AddCommand(&cobra.Command{
		Use:   "rbac:sync",
		Short: "Synchronize declared module permissions and default roles into the database",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := rbac.Sync(pb.App, catalog); err != nil {
				return err
			}
			cmd.Println("RBAC catalog synchronized successfully.")
			return nil
		},
	})

	pb.RootCmd.AddCommand(&cobra.Command{
		Use:   "user:grant-admin <email> [password]",
		Short: "Assign the admin role to a user (creating the user if password is provided)",
		Args:  cobra.RangeArgs(1, 2),
		RunE: func(cmd *cobra.Command, args []string) error {
			email := strings.TrimSpace(args[0])
			if err := grantAdmin(pb.App, catalog, email, func() string {
				if len(args) > 1 {
					return args[1]
				}
				return ""
			}()); err != nil {
				return err
			}
			cmd.Printf("Granted admin role to %s\n", email)
			return nil
		},
	})
}

func grantAdmin(app core.App, catalog []rbac.Group, email, password string) error {
	if err := rbac.Sync(app, catalog); err != nil {
		return fmt.Errorf("rbac sync: %w", err)
	}
	user, err := app.FindAuthRecordByEmail("users", email)
	if err != nil {
		if password == "" {
			return fmt.Errorf("user %q not found (pass a password as 2nd argument to create it)", email)
		}
		col, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		user = core.NewRecord(col)
		user.Set("email", email)
		user.Set("name", email)
		user.SetPassword(password)
		if err := app.Save(user); err != nil {
			return err
		}
	}
	return rbac.AssignRolesToUser(app, user.Id, []string{rbac.RoleAdmin})
}


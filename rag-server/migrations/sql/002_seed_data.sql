-- Starter RBAC seed data. Adjust demo users before production use.

BEGIN;

INSERT INTO public.rbac_permissions (code, description)
VALUES
    ('documents:read', 'Read permitted documents'),
    ('documents:write', 'Create and update permitted documents'),
    ('documents:delete', 'Delete permitted documents'),
    ('documents:admin', 'Manage document access control')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.rbac_roles (name, description)
VALUES
    ('admin', 'Full administrative document access'),
    ('manager', 'Can read and manage assigned documents'),
    ('analyst', 'Can read assigned documents')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON p.code IN (
    'documents:read',
    'documents:write',
    'documents:delete',
    'documents:admin'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON p.code IN ('documents:read', 'documents:write')
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON p.code = 'documents:read'
WHERE r.name = 'analyst'
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_users (email, full_name)
VALUES
    ('admin@example.com', 'Admin User'),
    ('manager@example.com', 'Manager User'),
    ('analyst@example.com', 'Analyst User')
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    updated_at = now();

INSERT INTO public.rbac_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.rbac_users u
JOIN public.rbac_roles r ON r.name = 'admin'
WHERE u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.rbac_users u
JOIN public.rbac_roles r ON r.name = 'manager'
WHERE u.email = 'manager@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.rbac_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.rbac_users u
JOIN public.rbac_roles r ON r.name = 'analyst'
WHERE u.email = 'analyst@example.com'
ON CONFLICT DO NOTHING;

COMMIT;

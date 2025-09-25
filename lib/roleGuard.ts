// utils/roleGuard.ts
export function checkRoleGuard(pathname: string, payload: any): {
  allowed: boolean;
  redirect?: string;
} {
  const isAdmin = !!payload.isAdmin;
  const isStaff = !!payload.isStaff;

  // staff → ห้าม 3 หน้า
  if (isStaff && !isAdmin) {
    if (
      pathname.startsWith("/backoffice/users") ||
      pathname.startsWith("/backoffice/slides") ||
      pathname.startsWith("/backoffice/contacts")
    ) {
      return { allowed: false, redirect: "/backoffice/dashboard" };
    }
  }

  // admin → เข้าได้ทุกหน้า
  if (isAdmin) return { allowed: true };

  // staff (หน้าอื่น ๆ) → เข้าได้
  if (isStaff) return { allowed: true };

  // user ธรรมดา → ห้าม
  return { allowed: false, redirect: "/" };
}

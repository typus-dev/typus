/**
 * Is this request's user an administrator?
 *
 * WHY THIS FILE EXISTS. AuthMiddleware builds the request user with a roles ARRAY:
 *
 *     roles: [userWithRole?.role].filter(Boolean)
 *
 * and it never sets a singular `role`. Three services nevertheless checked `user.role === 'admin'`,
 * so those branches were dead: DSL ownership.adminBypass never fired, an administrator saw only
 * their own rows on every model with autoFilter, and a debugging page that exists to show
 * everything quietly showed one person's data. The same singular/plural confusion cost a day on a
 * downstream product, where an admin got 403 on somebody else's file and a rendered scene came back
 * as an error.
 *
 * A single helper is the actual fix. Three hand-written copies of one predicate is how two of them
 * stayed wrong without anyone noticing; there is now one place to be right, and one place to change
 * if the shape of the request user ever changes again.
 *
 * The roles array is the contract. A row read straight from the database is a different thing and
 * has a real `role` column -- code holding a prisma row should read that column, not call this.
 */
export function isAdmin(user: any): boolean {
    const roles = user?.roles;
    if (!Array.isArray(roles)) return false;
    return roles.some((r: unknown) => typeof r === 'string' && r.toLowerCase() === 'admin');
}

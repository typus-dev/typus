import { BaseError } from '@/core/base/BaseError.js';

/**
 * Read a role's ability rules, or refuse.
 *
 * WHY THIS FILE EXISTS. Three services each carried their own copy of this normalisation, and every
 * copy ended the same way: on anything it did not recognise -- a string that is not JSON, a boolean,
 * an object -- it substituted an EMPTY ARRAY and carried on. An empty array is not "no opinion", it
 * is "this person may do nothing": the route guard asks can('manage', subject) and refuses every
 * private page. So a single malformed row in auth.roles turned into an administrator who gets 404
 * on the whole back office, with nothing anywhere saying why. That is the most expensive kind of
 * silence in this codebase, because the symptom points at routing and the cause is one column.
 *
 * A role with NO rules is a different thing and stays legal: null and an empty value mean the role
 * simply grants nothing extra, which is exactly what an ordinary user's role does.
 */
/** A broken role is the operator's problem, not the caller's: 500, and it says which role. */
export class AbilityRulesError extends BaseError {
    constructor(message: string) {
        super(message, 'ABILITY_RULES_INVALID', 500);
    }
}

export function parseAbilityRules(raw: unknown, roleName: string): any[] {
    if (raw === null || raw === undefined || raw === '') return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === 'string') {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch (e: any) {
            throw new AbilityRulesError(
                `Role '${roleName}' has ability_rules that are not valid JSON (${e?.message}). ` +
                `Fix the row in auth.roles: it must hold a JSON array of rules, or be empty. ` +
                `Refusing rather than granting nothing, because granting nothing looks like a broken ` +
                `application rather than a broken row.`
            );
        }
        if (!Array.isArray(parsed)) {
            throw new AbilityRulesError(
                `Role '${roleName}' has ability_rules holding ${typeof parsed}, not an array. ` +
                `auth.roles.ability_rules must be a JSON array of rules, or empty.`
            );
        }
        return parsed;
    }

    throw new AbilityRulesError(
        `Role '${roleName}' has ability_rules of type ${typeof raw}, which cannot be a rule list. ` +
        `auth.roles.ability_rules must be a JSON array of rules, or empty.`
    );
}

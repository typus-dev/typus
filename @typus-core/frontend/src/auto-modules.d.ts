interface ModuleConfig {
    path: string;
    published: boolean;
}
interface ModulesConfig {
    [key: string]: ModuleConfig;
}
export declare const modulesConfig: ModulesConfig;
/**
 * Get published modules
 * Returns array of module entries
 */
export declare function getPublishedModules(): [string, ModuleConfig][];
export {};

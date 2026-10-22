// Node resolve hook for the tests: the game's sources import each other without the ".ts"
// extension (Vite resolves them); here an extensionless relative import is retried as ".ts".
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
}

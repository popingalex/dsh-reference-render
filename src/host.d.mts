/** host.mjs（JS 宿主半）的声明面：教学段常量、词表与 apply。 */
export const inject: readonly string[]
export const AUTHORING_GUIDANCE_SECTION_NAME: string
export const DEFAULT_AUTHORING_VOCABULARY: readonly string[]
export function buildAuthoringGuidanceText(vocabulary?: readonly string[]): string
export const AUTHORING_GUIDANCE_TEXT: string
export function apply(ctx: unknown, config?: { vocabulary?: readonly string[] }): void

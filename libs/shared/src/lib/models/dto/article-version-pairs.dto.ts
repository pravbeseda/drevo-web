/**
 * Single version data for diff comparison from API
 */
export interface VersionForDiffDto {
    readonly versionId: number;
    readonly content: string;
    readonly author: string;
    readonly date: string;
    readonly title: string;
    readonly info: string;
}

/**
 * API response for version-pairs endpoint
 */
export interface VersionPairsResponseDto {
    readonly current: VersionForDiffDto;
    readonly previous: VersionForDiffDto;
}

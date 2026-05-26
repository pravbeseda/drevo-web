import { ApprovalStatusDto } from './article.dto';

export interface CancelVersionRequestDto {
    readonly versionId: number;
}

export interface CancelVersionResponseDto {
    readonly versionId: number;
    readonly articleId: number;
    readonly approved: ApprovalStatusDto;
}

import { ApprovalStatusDto } from './article.dto';

export interface ModerationRequestDto {
    readonly versionId: number;
    readonly approved: ApprovalStatusDto;
    readonly comment?: string;
}

export interface ModerationResponseDto {
    readonly versionId: number;
    readonly articleId: number;
    readonly approved: ApprovalStatusDto;
    readonly comment: string;
}

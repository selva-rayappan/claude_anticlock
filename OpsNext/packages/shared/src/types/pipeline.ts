export interface Pipeline {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  displayOrder: number;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  requiredFields: string[];
  rotColor?: string | null;
  createdAt: Date;
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  stages: CreateStageInput[];
}

export interface CreateStageInput {
  name: string;
  displayOrder: number;
  probability: number;
  isClosed?: boolean;
  isWon?: boolean;
  requiredFields?: string[];
  rotColor?: string;
}

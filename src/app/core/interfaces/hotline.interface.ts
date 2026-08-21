export interface RequesterType {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface RequestType {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface CreateAppealDto {
  channel_id: string;
  requester_type_id: string;
  request_type_id: string;
  message_content: string;
  acceptance_info?: string;
  administrator?: string;
  attachments?: string[]; 
}

export interface AppealResponse {
  message: string;
  status: number;
  data?: {
    id: string;
    created_at: string;
    status: string;
  };
}
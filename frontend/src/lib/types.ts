export interface User {
  id: string;
  username: string;
}

export interface HostedZoneConfig {
  comment: string;
  private_zone: boolean;
}

export interface DelegationSet {
  name_servers: string[];
}

export interface HostedZone {
  id: string;
  name: string;
  caller_reference: string;
  config: HostedZoneConfig;
  resource_record_set_count: number;
  delegation_set: DelegationSet | null;
  created_at: string;
  updated_at: string;
}

export interface HostedZoneListResponse {
  hosted_zones: HostedZone[];
  total: number;
  page: number;
  size: number;
  is_truncated: boolean;
  next_marker: string | null;
}

export interface RecordResponse {
  id: string;
  zone_id: string;
  name: string;
  type: string;
  ttl: number;
  value: string;
  alias_target: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordListResponse {
  records: RecordResponse[];
  total: number;
  page: number;
  size: number;
  is_truncated: boolean;
}

export interface TagItem {
  key: string;
  value: string;
}

export interface TagResponse {
  tags: TagItem[];
}

export interface ChangeInfo {
  id: string;
  status: string;
  submitted_at: string;
  comment: string | null;
}

export interface ChangeInfoResponse {
  change_info: ChangeInfo;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
}

export const RECORD_TYPES = [
  "A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];
